import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { eq, desc, sql } from "drizzle-orm";
import {
  fulfillments,
  fulfillmentItems,
  orders,
  orderItems,
  orderTimeline,
} from "@/lib/schema";
import { serializeDecimal } from "@/lib/decimal";
import { sendShippingUpdate } from "@/lib/email";

const createFulfillmentSchema = z.object({
  orderId: z.string().min(1),
  trackingNumber: z.string().max(200).optional(),
  trackingUrl: z.string().url().max(500).optional(),
  carrier: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
  items: z
    .array(
      z.object({
        orderItemId: z.string().min(1),
        quantity: z.number().int().min(1),
      })
    )
    .min(1),
});

/**
 * GET /api/fulfillments — List fulfillments for an order
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");

    const result = await db.query.fulfillments.findMany({
      where: orderId ? eq(fulfillments.orderId, orderId) : undefined,
      with: {
        items: {
          with: {
            orderItem: { columns: { id: true, name: true, sku: true, quantity: true } },
          },
        },
        order: { columns: { id: true, orderNumber: true, email: true } },
      },
      orderBy: [desc(fulfillments.createdAt)],
    });

    return NextResponse.json(serializeDecimal(result));
  } catch (error) {
    console.error("Fulfillments GET error:", error);
    return NextResponse.json({ error: "Failed to fetch fulfillments" }, { status: 500 });
  }
}

/**
 * POST /api/fulfillments — Create a fulfillment (admin only)
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createFulfillmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const data = parsed.data;

    // Fetch order with items and existing fulfillments
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, data.orderId),
      with: {
        items: true,
        fulfillments: {
          with: { items: true },
        },
        user: { columns: { name: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Calculate already fulfilled quantities per item
    const fulfilledQty = new Map<string, number>();
    for (const f of order.fulfillments) {
      if (f.status === "CANCELLED") continue;
      for (const fi of f.items) {
        fulfilledQty.set(fi.orderItemId, (fulfilledQty.get(fi.orderItemId) || 0) + fi.quantity);
      }
    }

    // Validate items
    const orderItemMap = new Map(order.items.map((i) => [i.id, i]));
    for (const item of data.items) {
      const oi = orderItemMap.get(item.orderItemId);
      if (!oi) {
        return NextResponse.json({ error: `Item ${item.orderItemId} not in order` }, { status: 400 });
      }
      const alreadyFulfilled = fulfilledQty.get(item.orderItemId) || 0;
      const remaining = oi.quantity - alreadyFulfilled;
      if (item.quantity > remaining) {
        return NextResponse.json(
          { error: `Cannot fulfill ${item.quantity} of "${oi.name}" — only ${remaining} remaining` },
          { status: 400 }
        );
      }
    }

    const result = await db.transaction(async (tx) => {
      const [fulfillment] = await tx
        .insert(fulfillments)
        .values({
          orderId: data.orderId,
          status: data.trackingNumber ? "SHIPPED" : "PENDING",
          trackingNumber: data.trackingNumber || null,
          trackingUrl: data.trackingUrl || null,
          carrier: data.carrier || null,
          notes: data.notes || null,
          shippedAt: data.trackingNumber ? new Date() : null,
        })
        .returning();

      await tx.insert(fulfillmentItems).values(
        data.items.map((item) => ({
          fulfillmentId: fulfillment.id,
          orderItemId: item.orderItemId,
          quantity: item.quantity,
        }))
      );

      // Determine if all items are now fulfilled
      const newFulfilledQty = new Map(fulfilledQty);
      for (const item of data.items) {
        newFulfilledQty.set(item.orderItemId, (newFulfilledQty.get(item.orderItemId) || 0) + item.quantity);
      }

      let allFulfilled = true;
      let anyFulfilled = false;
      for (const oi of order.items) {
        const fulfilled = newFulfilledQty.get(oi.id) || 0;
        if (fulfilled > 0) anyFulfilled = true;
        if (fulfilled < oi.quantity) allFulfilled = false;
      }

      const newFulfillmentStatus = allFulfilled ? "FULFILLED" : anyFulfilled ? "PARTIALLY_FULFILLED" : "UNFULFILLED";

      await tx
        .update(orders)
        .set({
          fulfillmentStatus: newFulfillmentStatus,
          ...(data.trackingNumber && { trackingNumber: data.trackingNumber }),
        })
        .where(eq(orders.id, data.orderId));

      // Timeline
      const itemNames = data.items.map((i) => {
        const oi = orderItemMap.get(i.orderItemId);
        return `${oi?.name} ×${i.quantity}`;
      }).join(", ");

      await tx.insert(orderTimeline).values({
        orderId: data.orderId,
        title: `Fulfillment Created${data.trackingNumber ? ` — ${data.carrier || "Carrier"}: ${data.trackingNumber}` : ""}`,
        message: itemNames,
        type: "FULFILLMENT",
      });

      return fulfillment;
    });

    // Send shipping update email
    if (data.trackingNumber) {
      sendShippingUpdate({
        email: order.email,
        customerName: order.user?.name || "",
        orderNumber: order.orderNumber,
        status: "SHIPPED",
        trackingNumber: data.trackingNumber,
      }).catch((err) => console.error("Shipping email failed:", err));
    }

    return NextResponse.json(serializeDecimal(result), { status: 201 });
  } catch (error) {
    console.error("Fulfillment POST error:", error);
    return NextResponse.json({ error: "Failed to create fulfillment" }, { status: 500 });
  }
}
