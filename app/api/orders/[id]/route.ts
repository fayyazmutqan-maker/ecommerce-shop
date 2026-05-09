import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { and, eq, inArray, sql } from "drizzle-orm";
import { orders, orderItems, orderTimeline, productVariants, products, channelOrders, salesChannels, refunds, refundItems } from "@/lib/schema";
import { sendShippingUpdate } from "@/lib/email";
import { cancelOrder as metaCancelOrder } from "@/lib/meta";
import type { MetaCredentials } from "@/lib/meta";
import { serializeDecimal } from "@/lib/decimal";
import { reportCreditNoteToZatca } from "@/lib/zatca/service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const updateOrderSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]).optional(),
  fulfillmentStatus: z.enum(["UNFULFILLED", "PARTIALLY_FULFILLED", "FULFILLED"]).optional(),
  paymentStatus: z.enum(["PENDING", "PAID", "PARTIALLY_PAID", "REFUNDED", "PARTIALLY_REFUNDED", "FAILED"]).optional(),
  trackingNumber: z.string().max(200).nullable().optional(),
  shippingMethod: z.string().max(200).nullable().optional(),
  cancelReason: z.string().max(500).nullable().optional(),
  refundReason: z.string().max(500).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

/**
 * GET /api/orders/[id] — Get a single order
 */
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const refundableOnly = searchParams.get("refundable") === "true";
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        items: {
          with: {
            product: {
              columns: { id: true, name: true, slug: true },
              with: { images: { limit: 1 } },
            },
            variant: { columns: { id: true, name: true } },
          },
        },
        shippingAddress: true,
        billingAddress: true,
        transactions: { orderBy: (t, { desc: d }) => [d(t.createdAt)] },
        timeline: { orderBy: (t, { desc: d }) => [d(t.createdAt)] },
        user: { columns: { id: true, name: true, email: true, image: true, phone: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Non-admin can only see their own orders
    const isAdmin = session.user.role === "ADMIN" || session.user.role === "STAFF";
    if (!isAdmin && (!order.userId || order.userId !== session.user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (isAdmin && refundableOnly) {
      const completedRefunds = await db.query.refunds.findMany({
        columns: {
          id: true,
          orderId: true,
          status: true,
        },
        where: and(
          eq(refunds.orderId, id),
          inArray(refunds.status, ["COMPLETED", "APPROVED"]),
        ),
        with: {
          items: {
            columns: {
              orderItemId: true,
              quantity: true,
            },
          },
        },
      });

      const refundedQtyByItem = new Map<string, number>();
      for (const refund of completedRefunds) {
        for (const item of refund.items) {
          refundedQtyByItem.set(
            item.orderItemId,
            (refundedQtyByItem.get(item.orderItemId) || 0) + item.quantity,
          );
        }
      }

      return NextResponse.json(serializeDecimal({
        ...order,
        items: order.items.map((item) => {
          const refundedQuantity = refundedQtyByItem.get(item.id) || 0;
          const refundableQuantity = Math.max(0, item.quantity - refundedQuantity);
          return {
            ...item,
            refundedQuantity,
            refundableQuantity,
          };
        }),
      }));
    }

    return NextResponse.json(serializeDecimal(order));
  } catch (error) {
    console.error("Order GET error:", error);
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}

/**
 * PUT /api/orders/[id] — Update order status, tracking, etc. (Admin only)
 */
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = updateOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const data = parsed.data;
    const existing = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: { user: { columns: { name: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Build timeline entries for status changes
    const timelineEntries: { orderId: string; title: string; message: string; type: string }[] = [];

    if (data.status && data.status !== existing.status) {
      timelineEntries.push({
        orderId: id,
        title: `Status: ${data.status}`,
        message: `Order status changed from ${existing.status} to ${data.status}`,
        type: data.status === "CANCELLED" ? "WARNING" : "INFO",
      });
    }

    if (data.fulfillmentStatus && data.fulfillmentStatus !== existing.fulfillmentStatus) {
      timelineEntries.push({
        orderId: id,
        title: `Fulfillment: ${data.fulfillmentStatus}`,
        message: `Fulfillment status changed to ${data.fulfillmentStatus}`,
        type: "INFO",
      });
    }

    if (data.trackingNumber && data.trackingNumber !== existing.trackingNumber) {
      timelineEntries.push({
        orderId: id,
        title: "Tracking Added",
        message: `Tracking number: ${data.trackingNumber}`,
        type: "INFO",
      });
    }

    const order = await db.transaction(async (tx) => {
      const [updated] = await tx.update(orders).set({
        ...(data.status && { status: data.status }),
        ...(data.fulfillmentStatus && { fulfillmentStatus: data.fulfillmentStatus }),
        ...(data.paymentStatus && { paymentStatus: data.paymentStatus }),
        ...(data.trackingNumber !== undefined && { trackingNumber: data.trackingNumber }),
        ...(data.shippingMethod !== undefined && { shippingMethod: data.shippingMethod }),
        ...(data.cancelReason !== undefined && { cancelReason: data.cancelReason }),
        ...(data.refundReason !== undefined && { refundReason: data.refundReason }),
        ...(data.notes !== undefined && { notes: data.notes }),
      }).where(eq(orders.id, id)).returning();

      // Restore inventory if cancelled
      if (data.status === "CANCELLED" && existing.status !== "CANCELLED") {
        const items = await tx.query.orderItems.findMany({
          where: eq(orderItems.orderId, id),
        });
        for (const item of items) {
          if (item.variantId) {
            await tx.update(productVariants).set({
              quantity: sql`${productVariants.quantity} + ${item.quantity}`,
            }).where(eq(productVariants.id, item.variantId));
          } else {
            await tx.update(products).set({
              quantity: sql`${products.quantity} + ${item.quantity}`,
            }).where(eq(products.id, item.productId));
          }
        }
      }

      // Create timeline entries
      if (timelineEntries.length > 0) {
        await tx.insert(orderTimeline).values(timelineEntries);
      }

      return updated;
    });

    // Send status update email (non-blocking)
    if (data.status && data.status !== existing.status) {
      sendShippingUpdate({
        email: existing.email,
        customerName: existing.user?.name || "",
        orderNumber: existing.orderNumber,
        status: data.status,
        trackingNumber: data.trackingNumber || existing.trackingNumber,
      }).catch((err) => console.error("Failed to send shipping update email:", err));
    }

    // Sync cancellation to Meta Commerce if this is a Meta order (non-blocking)
    if (data.status === "CANCELLED" && existing.status !== "CANCELLED") {
      syncCancellationToMeta(id, data.cancelReason || "CUSTOMER_REQUESTED").catch((err) =>
        console.error("Meta cancellation sync failed:", err)
      );

      // Issue ZATCA credit note if the invoice was already reported
      if (existing.zatcaStatus === "REPORTED" || existing.zatcaStatus === "CLEARED") {
        issueCancellationCreditNote(id, existing, session.user.id).catch((err) =>
          console.error("ZATCA cancellation credit note failed:", err)
        );
      }
    }

    return NextResponse.json(serializeDecimal(order));
  } catch (error) {
    console.error("Order PUT error:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}

// ─── Meta Cancellation Sync ─────────────────────────────────

async function syncCancellationToMeta(orderId: string, reason: string) {
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

  // Get order items to send to Meta
  const items = await db.query.orderItems.findMany({
    where: eq(orderItems.orderId, orderId),
  });

  const metaItems = items
    .map((item) => ({
      retailer_id: item.sku || item.productId,
      quantity: item.quantity,
    }))
    .filter((i) => i.retailer_id);

  if (metaItems.length === 0) return;

  await metaCancelOrder(
    channelOrder.externalOrderId,
    reason,
    metaItems,
    credentials.accessToken,
  );
}

// ─── ZATCA Cancellation Credit Note ─────────────────────────

async function issueCancellationCreditNote(
  orderId: string,
  existing: { totalAmount: string | number; currency: string },
  processedBy: string,
) {
  // Check if a full refund already exists for this order (prevents duplicate credit notes)
  const existingRefunds = await db.query.refunds.findMany({
    where: eq(refunds.orderId, orderId),
  });
  const alreadyRefunded = existingRefunds
    .filter((r) => r.status === "COMPLETED" || r.status === "APPROVED")
    .reduce((sum, r) => sum + Number(r.amount), 0);
  const totalAmount = Number(existing.totalAmount);
  const maxRefundable = totalAmount - alreadyRefunded;

  if (maxRefundable < 0.01) {
    // Already fully refunded — no need for another credit note
    return;
  }

  // Fetch order items to create refund line items
  const items = await db.query.orderItems.findMany({
    where: eq(orderItems.orderId, orderId),
  });

  if (items.length === 0) return;

  // Create a refund for the remaining un-refunded amount
  const [refund] = await db.insert(refunds).values({
    orderId,
    amount: maxRefundable.toFixed(2),
    reason: "Order cancelled",
    notes: "Auto-generated credit note for cancelled order",
    status: "COMPLETED",
    type: Math.abs(maxRefundable - totalAmount) < 0.01 ? "FULL" : "PARTIAL",
    restockItems: false, // Inventory already restocked in the cancellation logic
    processedBy,
  }).returning();

  // Create refund items (proportional to un-refunded amount)
  await db.insert(refundItems).values(
    items.map((item) => ({
      refundId: refund.id,
      orderItemId: item.id,
      quantity: item.quantity,
      amount: String(item.totalPrice),
    })),
  );

  // Report credit note to ZATCA
  await reportCreditNoteToZatca(refund.id);
}
