import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  refunds,
  refundItems,
  orders,
  orderItems,
  transactions,
  orderTimeline,
  storeSettings,
  products,
  productVariants,
  channelOrders,
  salesChannels,
} from "@/lib/schema";
import { createTapRefund } from "@/lib/tap";
import { refundOrder as metaRefundOrder } from "@/lib/meta";
import type { MetaCredentials } from "@/lib/meta";
import { serializeDecimal } from "@/lib/decimal";
import { refundLimiter, dailyRefundLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { reportCreditNoteToZatca } from "@/lib/zatca/service";
import { trackInvoiceEvent } from "@/lib/invoice-monitor";

const createRefundSchema = z.object({
  orderId: z.string().min(1),
  type: z.enum(["FULL", "PARTIAL"]),
  reason: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
  restockItems: z.boolean().default(false),
  items: z
    .array(
      z.object({
        orderItemId: z.string().min(1),
        quantity: z.number().int().min(1),
        amount: z.number().min(0),
      })
    )
    .min(1)
    .optional(),
  // For full refunds, items can be omitted — we'll refund the full totalAmount
});

/**
 * GET /api/refunds — List refunds for an order (admin) or all refunds
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");

    const where = orderId ? eq(refunds.orderId, orderId) : undefined;

    const result = await db.query.refunds.findMany({
      where,
      with: {
        items: {
          with: {
            orderItem: { columns: { id: true, name: true, sku: true, quantity: true, price: true } },
          },
        },
        order: { columns: { id: true, orderNumber: true, totalAmount: true, currency: true } },
      },
      orderBy: [desc(refunds.createdAt)],
    });

    return NextResponse.json(serializeDecimal(result));
  } catch (error) {
    console.error("Refunds GET error:", error);
    return NextResponse.json({ error: "Failed to fetch refunds" }, { status: 500 });
  }
}

/**
 * POST /api/refunds — Create a refund (admin only)
 * Processes payment refund via Tap, creates records, updates order status, optionally restocks
 */
export async function POST(req: Request) {
  try {
    // Rate limit refund creation (per-minute + daily cap)
    const ip = getClientIp(req);
    const rlResponse = await rateLimitResponse(refundLimiter, ip);
    if (rlResponse) return rlResponse;

    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Daily refund cap per admin user (prevents mass credit-note generation)
    const dailyRl = await rateLimitResponse(dailyRefundLimiter, session.user.id);
    if (dailyRl) return dailyRl;

    const body = await req.json();
    const parsed = createRefundSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Fetch the order with items and transactions
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, data.orderId),
      with: {
        items: true,
        transactions: {
          orderBy: (t, { desc: d }) => [d(t.createdAt)],
        },
        refunds: {
          with: { items: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.paymentStatus === "REFUNDED") {
      return NextResponse.json(
        { error: "Order is already fully refunded" },
        { status: 400 }
      );
    }

    // Calculate refund amount
    let refundAmount: number;
    let refundItemsData: { orderItemId: string; quantity: number; amount: number }[] = [];

    const totalAmount = Number(order.totalAmount);
    const alreadyRefunded = order.refunds
      .filter((r: { status: string }) => r.status === "COMPLETED" || r.status === "APPROVED")
      .reduce((sum: number, r: { amount: string | number }) => sum + Number(r.amount), 0);

    const maxRefundable = totalAmount - alreadyRefunded;

    // Build a map of already-refunded quantity per order item
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const completedRefunds = order.refunds.filter((r: any) => r.status === "COMPLETED" || r.status === "APPROVED");
    const alreadyRefundedQty = new Map<string, number>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const r of completedRefunds as any[]) {
      for (const ri of (r.items || [])) {
        alreadyRefundedQty.set(ri.orderItemId, (alreadyRefundedQty.get(ri.orderItemId) || 0) + ri.quantity);
      }
    }

    if (data.type === "FULL") {
      // For full refund, only refund remaining un-refunded quantities
      refundItemsData = [];
      for (const item of order.items as { id: string; quantity: number; totalPrice: string | number; price: string | number }[]) {
        const alreadyQty = alreadyRefundedQty.get(item.id) || 0;
        const remainingQty = item.quantity - alreadyQty;
        if (remainingQty > 0) {
          const unitPrice = Number(item.totalPrice) / item.quantity;
          refundItemsData.push({
            orderItemId: item.id,
            quantity: remainingQty,
            amount: Math.round(unitPrice * remainingQty * 100) / 100,
          });
        }
      }
      refundAmount = refundItemsData.reduce((sum, i) => sum + i.amount, 0);
      if (refundAmount > maxRefundable + 0.01) {
        refundAmount = maxRefundable;
      }
    } else {
      if (!data.items || data.items.length === 0) {
        return NextResponse.json(
          { error: "Items are required for partial refunds" },
          { status: 400 }
        );
      }

      // Validate items belong to this order and check per-item quantity limits
      const orderItemMap = new Map(order.items.map((i: { id: string; quantity: number }) => [i.id, i]));
      for (const item of data.items) {
        const orderItem = orderItemMap.get(item.orderItemId);
        if (!orderItem) {
          return NextResponse.json(
            { error: `Item ${item.orderItemId} does not belong to this order` },
            { status: 400 }
          );
        }
        const alreadyQty = alreadyRefundedQty.get(item.orderItemId) || 0;
        const maxQty = orderItem.quantity - alreadyQty;
        if (item.quantity > maxQty) {
          return NextResponse.json(
            { error: `Item "${item.orderItemId}" — requested ${item.quantity} but only ${maxQty} remaining to refund` },
            { status: 400 }
          );
        }
      }

      refundAmount = data.items.reduce((sum, i) => sum + i.amount, 0);
      refundItemsData = data.items;
    }

    if (refundAmount <= 0) {
      return NextResponse.json({ error: "Refund amount must be positive" }, { status: 400 });
    }

    if (refundAmount > maxRefundable + 0.01) {
      return NextResponse.json(
        { error: `Refund amount (${refundAmount.toFixed(2)}) exceeds maximum refundable (${maxRefundable.toFixed(2)})` },
        { status: 400 }
      );
    }

    // Find the Tap charge ID from the successful payment transaction
    // Webhook sets status to "PAID" (mapped from Tap "CAPTURED"), so match that
    const paymentTx = order.transactions.find(
      (t: { type: string; status: string; reference: string | null }) =>
        t.type === "CHARGE" && (t.status === "PAID" || t.status === "COMPLETED") && t.reference
    );

    // Process refund via Tap Payments if we have a charge reference
    let tapRefundId: string | null = null;
    let refundStatus = "COMPLETED";

    if (paymentTx?.reference) {
      try {
        const tapSecretKey = process.env.TAP_SECRET_KEY;
        if (tapSecretKey) {
          const tapRefund = await createTapRefund(
            tapSecretKey,
            paymentTx.reference,
            refundAmount,
            order.currency,
            data.reason || "Admin refund"
          );
          tapRefundId = tapRefund.id;
          // If Tap returns a non-success status, mark as pending
          if (tapRefund.status !== "REFUNDED" && tapRefund.status !== "refunded") {
            refundStatus = "PENDING";
          }
        }
      } catch (tapError) {
        console.error("Tap refund failed:", tapError);
        // Still create the refund record but mark it as pending
        refundStatus = "PENDING";
      }
    }

    // Create refund record and update order in a transaction
    const result = await db.transaction(async (tx) => {
      // Create refund
      const [refund] = await tx
        .insert(refunds)
        .values({
          orderId: data.orderId,
          amount: refundAmount.toFixed(2),
          reason: data.reason || null,
          notes: data.notes || null,
          status: refundStatus,
          type: data.type,
          restockItems: data.restockItems,
          processedBy: session.user.id,
        })
        .returning();

      // Create refund items
      if (refundItemsData.length > 0) {
        await tx.insert(refundItems).values(
          refundItemsData.map((item) => ({
            refundId: refund.id,
            orderItemId: item.orderItemId,
            quantity: item.quantity,
            amount: item.amount.toFixed(2),
          }))
        );
      }

      // Create transaction record
      await tx.insert(transactions).values({
        orderId: data.orderId,
        type: "REFUND",
        status: refundStatus === "COMPLETED" ? "COMPLETED" : "PENDING",
        amount: refundAmount.toFixed(2),
        currency: order.currency,
        paymentMethod: paymentTx?.paymentMethod || "MANUAL",
        reference: tapRefundId,
        metadata: JSON.stringify({ refundId: refund.id, reason: data.reason }),
      });

      // Update order payment status
      const newTotalRefunded = alreadyRefunded + (refundStatus === "COMPLETED" ? refundAmount : 0);
      const isFullyRefunded = Math.abs(newTotalRefunded - totalAmount) < 0.01;

      await tx
        .update(orders)
        .set({
          paymentStatus: isFullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED",
          status: isFullyRefunded ? "REFUNDED" : order.status,
          refundReason: data.reason || order.refundReason,
        })
        .where(eq(orders.id, data.orderId));

      // Restock items if requested
      if (data.restockItems && refundStatus === "COMPLETED") {
        for (const item of refundItemsData) {
          const orderItem = order.items.find((i: { id: string }) => i.id === item.orderItemId);
          if (orderItem?.variantId) {
            await tx
              .update(productVariants)
              .set({ quantity: sql`${productVariants.quantity} + ${item.quantity}` })
              .where(eq(productVariants.id, orderItem.variantId));
          } else if (orderItem?.productId) {
            await tx
              .update(products)
              .set({ quantity: sql`${products.quantity} + ${item.quantity}` })
              .where(eq(products.id, orderItem.productId));
          }
        }
      }

      // Add timeline entry
      await tx.insert(orderTimeline).values({
        orderId: data.orderId,
        title: `${data.type === "FULL" ? "Full" : "Partial"} Refund — ${refundAmount.toFixed(2)} ${order.currency}`,
        message: data.reason
          ? `Reason: ${data.reason}${data.restockItems ? " (items restocked)" : ""}`
          : data.restockItems
            ? "Items restocked"
            : null,
        type: "REFUND",
      });

      return refund;
    });

    // Report credit note to ZATCA (non-blocking)
    reportCreditNoteToZatca(result.id).catch((err) =>
      console.error("ZATCA credit note reporting failed:", err)
    );

    // Track for anomaly detection (non-blocking)
    trackInvoiceEvent({ ip, type: "refund", userId: session.user.id, refundId: result.id });

    // Sync refund to Meta Commerce if this is a Meta order (non-blocking)
    syncRefundToMeta(data.orderId, refundItemsData, order.items, data.reason || "BUYERS_REMORSE").catch((err) =>
      console.error("Meta refund sync failed:", err)
    );

    return NextResponse.json(serializeDecimal(result), { status: 201 });
  } catch (error) {
    console.error("Refund POST error:", error);
    return NextResponse.json({ error: "Failed to process refund" }, { status: 500 });
  }
}

// ─── Meta Refund Sync ───────────────────────────────────────

async function syncRefundToMeta(
  orderId: string,
  refundItemsData: { orderItemId: string; quantity: number; amount: number }[],
  orderItemsList: { id: string; sku: string | null; productId: string }[],
  reason: string,
) {
  // Check if this order has a Meta channel mapping
  const channelOrder = await db.query.channelOrders.findFirst({
    where: eq(channelOrders.orderId, orderId),
  });
  if (!channelOrder?.externalOrderId) return;

  const channel = await db.query.salesChannels.findFirst({
    where: eq(salesChannels.id, channelOrder.channelId),
  });
  if (!channel) return;

  let credentials: MetaCredentials;
  try {
    credentials = JSON.parse(channel.credentials || "{}");
  } catch { return; }
  if (!credentials.accessToken) return;

  // Map refund items to Meta retailer IDs
  const itemMap = new Map(orderItemsList.map((i) => [i.id, i]));
  const metaItems = refundItemsData
    .map((item) => {
      const oi = itemMap.get(item.orderItemId);
      if (!oi) return null;
      return { retailer_id: oi.sku || oi.productId, quantity: item.quantity };
    })
    .filter((i): i is { retailer_id: string; quantity: number } => i !== null);

  if (metaItems.length === 0) return;

  await metaRefundOrder(
    channelOrder.externalOrderId,
    metaItems,
    reason,
    credentials.accessToken,
  );
}
