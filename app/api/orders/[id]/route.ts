import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { eq, desc, sql } from "drizzle-orm";
import { orders, orderItems, orderTimeline, productVariants, products } from "@/lib/schema";
import { sendShippingUpdate } from "@/lib/email";
import { serializeDecimal } from "@/lib/decimal";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const updateOrderSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]).optional(),
  fulfillmentStatus: z.enum(["UNFULFILLED", "PARTIALLY_FULFILLED", "FULFILLED"]).optional(),
  paymentStatus: z.enum(["PENDING", "PAID", "PARTIALLY_PAID", "REFUNDED", "FAILED"]).optional(),
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
    const isAdmin = session.user.role === "ADMIN";
    if (!isAdmin && order.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    return NextResponse.json(serializeDecimal(order));
  } catch (error) {
    console.error("Order PUT error:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
