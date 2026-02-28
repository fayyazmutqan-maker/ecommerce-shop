import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { eq, desc, and, inArray } from "drizzle-orm";
import { returns, returnItems, orders, orderItems, orderTimeline } from "@/lib/schema";
import { serializeDecimal } from "@/lib/decimal";

function generateReturnNumber(): string {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `RET-${y}${m}-${rand}`;
}

const createReturnSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().min(1).max(500),
  customerNotes: z.string().max(1000).optional(),
  action: z.enum(["REFUND", "EXCHANGE", "STORE_CREDIT"]).default("REFUND"),
  items: z
    .array(
      z.object({
        orderItemId: z.string().min(1),
        quantity: z.number().int().min(1),
        reason: z.string().max(500).optional(),
        condition: z.enum(["NEW", "OPENED", "DAMAGED"]).optional(),
      })
    )
    .min(1),
});

const updateReturnSchema = z.object({
  status: z.enum(["REQUESTED", "APPROVED", "RECEIVED", "COMPLETED", "REJECTED"]).optional(),
  adminNotes: z.string().max(1000).optional(),
  trackingNumber: z.string().max(200).optional(),
});

/**
 * GET /api/returns — List returns
 * Admin: all returns, optionally filtered by orderId
 * Customer: only their returns
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");
    const isAdmin = session.user.role === "ADMIN";

    let result;

    if (isAdmin) {
      result = await db.query.returns.findMany({
        where: orderId ? eq(returns.orderId, orderId) : undefined,
        with: {
          items: {
            with: {
              orderItem: { columns: { id: true, name: true, sku: true, quantity: true, price: true } },
            },
          },
          order: {
            columns: { id: true, orderNumber: true, email: true, totalAmount: true },
            with: { user: { columns: { id: true, name: true, email: true } } },
          },
        },
        orderBy: [desc(returns.createdAt)],
      });
    } else {
      // Customer: only see returns for their orders (filtered at DB level)
      const userOrders = await db.query.orders.findMany({
        where: eq(orders.userId, session.user.id!),
        columns: { id: true },
      });
      const userOrderIds = userOrders.map((o) => o.id);

      if (userOrderIds.length === 0) {
        return NextResponse.json([]);
      }

      const conditions = [inArray(returns.orderId, userOrderIds)];
      if (orderId) conditions.push(eq(returns.orderId, orderId));

      result = await db.query.returns.findMany({
        where: and(...conditions),
        with: {
          items: {
            with: {
              orderItem: { columns: { id: true, name: true, quantity: true } },
            },
          },
          order: { columns: { id: true, orderNumber: true } },
        },
        orderBy: [desc(returns.createdAt)],
      });
    }

    return NextResponse.json(serializeDecimal(result));
  } catch (error) {
    console.error("Returns GET error:", error);
    return NextResponse.json({ error: "Failed to fetch returns" }, { status: 500 });
  }
}

/**
 * POST /api/returns — Create a return request (customer or admin)
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createReturnSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const data = parsed.data;

    // Verify the order exists and belongs to the user (or admin)
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, data.orderId),
      with: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const isAdmin = session.user.role === "ADMIN";
    if (!isAdmin && order.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only allow returns on delivered/shipped orders
    if (!["DELIVERED", "SHIPPED", "PROCESSING"].includes(order.status)) {
      return NextResponse.json(
        { error: "Returns can only be requested for delivered or shipped orders" },
        { status: 400 }
      );
    }

    // Validate items
    const orderItemMap = new Map(order.items.map((i) => [i.id, i]));
    for (const item of data.items) {
      const oi = orderItemMap.get(item.orderItemId);
      if (!oi) {
        return NextResponse.json({ error: `Item ${item.orderItemId} not found in order` }, { status: 400 });
      }
      if (item.quantity > oi.quantity) {
        return NextResponse.json({ error: `Return quantity exceeds ordered quantity for ${oi.name}` }, { status: 400 });
      }
    }

    const result = await db.transaction(async (tx) => {
      const returnNumber = generateReturnNumber();
      const [returnReq] = await tx
        .insert(returns)
        .values({
          orderId: data.orderId,
          returnNumber,
          reason: data.reason,
          customerNotes: data.customerNotes || null,
          action: data.action,
          status: isAdmin ? "APPROVED" : "REQUESTED",
        })
        .returning();

      await tx.insert(returnItems).values(
        data.items.map((item) => ({
          returnId: returnReq.id,
          orderItemId: item.orderItemId,
          quantity: item.quantity,
          reason: item.reason || null,
          condition: item.condition || null,
        }))
      );

      await tx.insert(orderTimeline).values({
        orderId: data.orderId,
        title: `Return Requested — ${returnNumber}`,
        message: `Reason: ${data.reason}`,
        type: "RETURN",
      });

      return returnReq;
    });

    return NextResponse.json(serializeDecimal(result), { status: 201 });
  } catch (error) {
    console.error("Returns POST error:", error);
    return NextResponse.json({ error: "Failed to create return" }, { status: 500 });
  }
}
