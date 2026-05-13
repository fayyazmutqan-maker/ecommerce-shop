import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { returns, orderTimeline } from "@/lib/schema";
import { serializeDecimal } from "@/lib/decimal";

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
 * Handles the RMA workflow only.
 * Refunds, payment reversals, and inventory restocking are handled by the
 * dedicated refund/order tools so customer returns do not behave like POS refunds.
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
        order: true,
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
        const statusMessages: Record<string, string> = {
          APPROVED: "Return request approved. Awaiting returned items or pickup confirmation.",
          REJECTED: "Return request rejected.",
          RECEIVED: "Returned items received for inspection. Process any refund separately from the order refund workflow.",
          COMPLETED: "Return workflow completed. Refunds, exchanges, or store credit must be processed through their dedicated workflows.",
        };

        await tx.insert(orderTimeline).values({
          orderId: existing.orderId,
          title: `Return ${data.status} — ${existing.returnNumber}`,
          message: data.adminNotes || statusMessages[data.status] || null,
          type: "RETURN",
        });
      }

      return updated;
    });

    return NextResponse.json(serializeDecimal(result));
  } catch (error) {
    console.error("Return PUT error:", error);
    return NextResponse.json({ error: "Failed to update return" }, { status: 500 });
  }
}
