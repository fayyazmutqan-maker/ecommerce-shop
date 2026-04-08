import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { returns, returnItems, orderTimeline, refunds, refundItems, orders, transactions, products, productVariants } from "@/lib/schema";
import { serializeDecimal } from "@/lib/decimal";
import { reportCreditNoteToZatca } from "@/lib/zatca/service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const updateReturnSchema = z.object({
  status: z.enum(["REQUESTED", "APPROVED", "RECEIVED", "COMPLETED", "REJECTED"]).optional(),
  adminNotes: z.string().max(1000).nullable().optional(),
  trackingNumber: z.string().max(200).nullable().optional(),
});

/**
 * GET /api/returns/[id] — Get a single return
 */
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const returnReq = await db.query.returns.findFirst({
      where: eq(returns.id, id),
      with: {
        items: {
          with: {
            orderItem: { columns: { id: true, name: true, sku: true, quantity: true, price: true } },
          },
        },
        order: {
          columns: { id: true, orderNumber: true, email: true, totalAmount: true, userId: true },
          with: { user: { columns: { id: true, name: true, email: true } } },
        },
      },
    });

    if (!returnReq) {
      return NextResponse.json({ error: "Return not found" }, { status: 404 });
    }

    const isAdmin = session.user.role === "ADMIN";
    if (!isAdmin && returnReq.order.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(serializeDecimal(returnReq));
  } catch (error) {
    console.error("Return GET error:", error);
    return NextResponse.json({ error: "Failed to fetch return" }, { status: 500 });
  }
}

/**
 * PUT /api/returns/[id] — Update return status (admin only)
 *
 * Handles state transitions with side effects:
 * - RECEIVED: Restock returned items to inventory
 * - COMPLETED (action=REFUND): Auto-create refund + ZATCA credit note
 */
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = updateReturnSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const data = parsed.data;
    const existing = await db.query.returns.findFirst({
      where: eq(returns.id, id),
      with: {
        items: {
          with: {
            orderItem: true,
          },
        },
        order: {
          with: {
            refunds: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Return not found" }, { status: 404 });
    }

    // Validate status transitions (state machine)
    if (data.status && data.status !== existing.status) {
      const VALID_TRANSITIONS: Record<string, string[]> = {
        REQUESTED: ["APPROVED", "REJECTED"],
        APPROVED: ["RECEIVED", "REJECTED"],
        RECEIVED: ["COMPLETED", "REJECTED"],
        COMPLETED: [],
        REJECTED: [],
      };
      const allowed = VALID_TRANSITIONS[existing.status] || [];
      if (!allowed.includes(data.status)) {
        return NextResponse.json(
          { error: `Cannot transition return from ${existing.status} to ${data.status}` },
          { status: 400 }
        );
      }
    }

    let zatcaRefundId: string | null = null;

    const result = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(returns)
        .set({
          ...(data.status && { status: data.status }),
          ...(data.adminNotes !== undefined && { adminNotes: data.adminNotes }),
          ...(data.trackingNumber !== undefined && { trackingNumber: data.trackingNumber }),
          ...(data.status && { processedBy: session.user.id }),
        })
        .where(eq(returns.id, id))
        .returning();

      if (data.status && data.status !== existing.status) {
        await tx.insert(orderTimeline).values({
          orderId: existing.orderId,
          title: `Return ${data.status} — ${existing.returnNumber}`,
          message: data.adminNotes || null,
          type: "RETURN",
        });
      }

      // Restock inventory when items are physically received
      if (data.status === "RECEIVED" && existing.status !== "RECEIVED") {
        for (const item of existing.items) {
          if (item.orderItem.variantId) {
            await tx.update(productVariants).set({
              quantity: sql`${productVariants.quantity} + ${item.quantity}`,
            }).where(eq(productVariants.id, item.orderItem.variantId));
          } else if (item.orderItem.productId) {
            await tx.update(products).set({
              quantity: sql`${products.quantity} + ${item.quantity}`,
            }).where(eq(products.id, item.orderItem.productId));
          }
        }

        await tx.insert(orderTimeline).values({
          orderId: existing.orderId,
          title: `Inventory Restocked — ${existing.returnNumber}`,
          message: `${existing.items.length} item(s) restocked from return`,
          type: "INFO",
        });
      }

      // Auto-create refund when return is completed with REFUND action
      if (data.status === "COMPLETED" && existing.status !== "COMPLETED" && existing.action === "REFUND") {
        const refundAmount = existing.items.reduce((sum, item) => {
          return sum + Number(item.orderItem.totalPrice) * (item.quantity / item.orderItem.quantity);
        }, 0);

        const roundedAmount = Math.round(refundAmount * 100) / 100;

        // Check if order is already fully refunded
        const totalAmount = Number(existing.order.totalAmount);
        const alreadyRefunded = existing.order.refunds
          .filter((r: { status: string }) => r.status === "COMPLETED" || r.status === "APPROVED")
          .reduce((sum: number, r: { amount: string | number }) => sum + Number(r.amount), 0);

        const maxRefundable = totalAmount - alreadyRefunded;
        const finalAmount = Math.min(roundedAmount, maxRefundable);

        if (finalAmount > 0) {
          const [refund] = await tx.insert(refunds).values({
            orderId: existing.orderId,
            amount: finalAmount.toFixed(2),
            reason: existing.reason,
            notes: `Auto-generated from return ${existing.returnNumber}`,
            status: "COMPLETED",
            type: existing.items.length === existing.order.refunds.length ? "FULL" : "PARTIAL",
            restockItems: false, // Already restocked on RECEIVED
            processedBy: session.user.id,
          }).returning();

          await tx.insert(refundItems).values(
            existing.items.map((item) => ({
              refundId: refund.id,
              orderItemId: item.orderItemId,
              quantity: item.quantity,
              amount: (Number(item.orderItem.totalPrice) * (item.quantity / item.orderItem.quantity)).toFixed(2),
            })),
          );

          // Create refund transaction
          await tx.insert(transactions).values({
            orderId: existing.orderId,
            type: "REFUND",
            status: "COMPLETED",
            amount: finalAmount.toFixed(2),
            currency: "SAR",
            paymentMethod: "RETURN",
            metadata: JSON.stringify({ returnId: id, refundId: refund.id }),
          });

          // Update order payment status
          const newTotalRefunded = alreadyRefunded + finalAmount;
          const isFullyRefunded = Math.abs(newTotalRefunded - totalAmount) < 0.01;

          await tx.update(orders).set({
            paymentStatus: isFullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED",
            status: isFullyRefunded ? "REFUNDED" : undefined,
          }).where(eq(orders.id, existing.orderId));

          // Link refund to return
          await tx.update(returns).set({ refundId: refund.id }).where(eq(returns.id, id));

          await tx.insert(orderTimeline).values({
            orderId: existing.orderId,
            title: `Refund Issued — ${finalAmount.toFixed(2)} SAR`,
            message: `Auto-created from completed return ${existing.returnNumber}`,
            type: "REFUND",
          });

          // Will trigger ZATCA credit note after transaction commits
          zatcaRefundId = refund.id;
        }
      }

      return updated;
    });

    // Report ZATCA credit note outside the DB transaction (non-blocking)
    if (zatcaRefundId) {
      reportCreditNoteToZatca(zatcaRefundId).catch((err) =>
        console.error("ZATCA credit note for return failed:", err)
      );
    }

    return NextResponse.json(serializeDecimal(result));
  } catch (error) {
    console.error("Return PUT error:", error);
    return NextResponse.json({ error: "Failed to update return" }, { status: 500 });
  }
}
