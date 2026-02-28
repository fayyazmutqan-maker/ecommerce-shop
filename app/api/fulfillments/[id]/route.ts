import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { fulfillments, orderTimeline } from "@/lib/schema";
import { serializeDecimal } from "@/lib/decimal";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const updateFulfillmentSchema = z.object({
  status: z.enum(["PENDING", "SHIPPED", "DELIVERED", "CANCELLED"]).optional(),
  trackingNumber: z.string().max(200).nullable().optional(),
  trackingUrl: z.string().url().max(500).nullable().optional(),
  carrier: z.string().max(200).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

/**
 * PUT /api/fulfillments/[id] — Update fulfillment status
 */
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = updateFulfillmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const data = parsed.data;
    const existing = await db.query.fulfillments.findFirst({
      where: eq(fulfillments.id, id),
    });

    if (!existing) {
      return NextResponse.json({ error: "Fulfillment not found" }, { status: 404 });
    }

    const result = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(fulfillments)
        .set({
          ...(data.status && { status: data.status }),
          ...(data.trackingNumber !== undefined && { trackingNumber: data.trackingNumber }),
          ...(data.trackingUrl !== undefined && { trackingUrl: data.trackingUrl }),
          ...(data.carrier !== undefined && { carrier: data.carrier }),
          ...(data.notes !== undefined && { notes: data.notes }),
          ...(data.status === "SHIPPED" && !existing.shippedAt && { shippedAt: new Date() }),
          ...(data.status === "DELIVERED" && !existing.deliveredAt && { deliveredAt: new Date() }),
        })
        .where(eq(fulfillments.id, id))
        .returning();

      if (data.status && data.status !== existing.status) {
        await tx.insert(orderTimeline).values({
          orderId: existing.orderId,
          title: `Fulfillment ${data.status}`,
          message: data.trackingNumber ? `Tracking: ${data.trackingNumber}` : null,
          type: "FULFILLMENT",
        });
      }

      return updated;
    });

    return NextResponse.json(serializeDecimal(result));
  } catch (error) {
    console.error("Fulfillment PUT error:", error);
    return NextResponse.json({ error: "Failed to update fulfillment" }, { status: 500 });
  }
}
