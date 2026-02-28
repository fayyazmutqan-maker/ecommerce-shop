import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { serializeDecimal } from "@/lib/decimal";
import { eq, asc, desc } from "drizzle-orm";
import { autoDiscounts } from "@/lib/schema";

const autoDiscountSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(["BOGO", "BUY_X_GET_Y", "SPEND_X_GET_Y", "PERCENTAGE_OFF", "FIXED_OFF"]),
  status: z.enum(["ACTIVE", "SCHEDULED", "EXPIRED", "DISABLED"]).default("ACTIVE"),
  priority: z.number().int().default(0),
  combinesWith: z.boolean().default(false),
  minQuantity: z.number().int().min(1).optional().nullable(),
  minOrderAmount: z.number().min(0).optional().nullable(),
  buyProductIds: z.array(z.string()).optional().nullable(),
  buyCategoryIds: z.array(z.string()).optional().nullable(),
  customerIds: z.array(z.string()).optional().nullable(),
  discountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "FREE_ITEM"]).default("PERCENTAGE"),
  discountValue: z.number().min(0).default(0),
  getQuantity: z.number().int().min(1).optional().nullable(),
  getProductIds: z.array(z.string()).optional().nullable(),
  getCategoryIds: z.array(z.string()).optional().nullable(),
  maxUsesTotal: z.number().int().min(1).optional().nullable(),
  maxUsesPerCustomer: z.number().int().min(1).optional().nullable(),
  startsAt: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
});

/**
 * GET /api/auto-discounts — Get all automatic discounts
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const discounts = await db.query.autoDiscounts.findMany({
      orderBy: [desc(autoDiscounts.priority), desc(autoDiscounts.createdAt)],
    });

    return NextResponse.json(serializeDecimal(discounts.map((d) => ({
      ...d,
      buyProductIds: d.buyProductIds ? JSON.parse(d.buyProductIds) : [],
      buyCategoryIds: d.buyCategoryIds ? JSON.parse(d.buyCategoryIds) : [],
      customerIds: d.customerIds ? JSON.parse(d.customerIds) : [],
      getProductIds: d.getProductIds ? JSON.parse(d.getProductIds) : [],
      getCategoryIds: d.getCategoryIds ? JSON.parse(d.getCategoryIds) : [],
    }))));
  } catch (error) {
    console.error("Auto discounts GET error:", error);
    return NextResponse.json({ error: "Failed to fetch auto discounts" }, { status: 500 });
  }
}

/**
 * POST /api/auto-discounts — Create an automatic discount
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = autoDiscountSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const data = parsed.data;

    if (data.discountType === "PERCENTAGE" && data.discountValue > 100) {
      return NextResponse.json({ error: "Percentage cannot exceed 100%" }, { status: 400 });
    }

    const [discount] = await db.insert(autoDiscounts).values({
      name: data.name,
      type: data.type,
      status: data.status,
      priority: data.priority,
      combinesWith: data.combinesWith,
      minQuantity: data.minQuantity || null,
      minOrderAmount: data.minOrderAmount != null ? String(data.minOrderAmount) : null,
      buyProductIds: data.buyProductIds?.length ? JSON.stringify(data.buyProductIds) : null,
      buyCategoryIds: data.buyCategoryIds?.length ? JSON.stringify(data.buyCategoryIds) : null,
      customerIds: data.customerIds?.length ? JSON.stringify(data.customerIds) : null,
      discountType: data.discountType,
      discountValue: data.discountValue,
      getQuantity: data.getQuantity || null,
      getProductIds: data.getProductIds?.length ? JSON.stringify(data.getProductIds) : null,
      getCategoryIds: data.getCategoryIds?.length ? JSON.stringify(data.getCategoryIds) : null,
      maxUsesTotal: data.maxUsesTotal || null,
      maxUsesPerCustomer: data.maxUsesPerCustomer || null,
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    }).returning();

    return NextResponse.json(serializeDecimal(discount), { status: 201 });
  } catch (error) {
    console.error("Auto discount POST error:", error);
    return NextResponse.json({ error: "Failed to create auto discount" }, { status: 500 });
  }
}

/**
 * PUT /api/auto-discounts — Update an automatic discount
 */
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "Discount ID required" }, { status: 400 });

    const existing = await db.query.autoDiscounts.findFirst({ where: eq(autoDiscounts.id, id) });
    if (!existing) return NextResponse.json({ error: "Discount not found" }, { status: 404 });

    // Serialize arrays to JSON
    const data: Record<string, unknown> = {};
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.type !== undefined) data.type = updates.type;
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.priority !== undefined) data.priority = updates.priority;
    if (updates.combinesWith !== undefined) data.combinesWith = updates.combinesWith;
    if (updates.minQuantity !== undefined) data.minQuantity = updates.minQuantity || null;
    if (updates.minOrderAmount !== undefined) data.minOrderAmount = updates.minOrderAmount != null ? String(updates.minOrderAmount) : null;
    if (updates.buyProductIds !== undefined) data.buyProductIds = updates.buyProductIds?.length ? JSON.stringify(updates.buyProductIds) : null;
    if (updates.buyCategoryIds !== undefined) data.buyCategoryIds = updates.buyCategoryIds?.length ? JSON.stringify(updates.buyCategoryIds) : null;
    if (updates.customerIds !== undefined) data.customerIds = updates.customerIds?.length ? JSON.stringify(updates.customerIds) : null;
    if (updates.discountType !== undefined) data.discountType = updates.discountType;
    if (updates.discountValue !== undefined) data.discountValue = updates.discountValue;
    if (updates.getQuantity !== undefined) data.getQuantity = updates.getQuantity || null;
    if (updates.getProductIds !== undefined) data.getProductIds = updates.getProductIds?.length ? JSON.stringify(updates.getProductIds) : null;
    if (updates.getCategoryIds !== undefined) data.getCategoryIds = updates.getCategoryIds?.length ? JSON.stringify(updates.getCategoryIds) : null;
    if (updates.maxUsesTotal !== undefined) data.maxUsesTotal = updates.maxUsesTotal || null;
    if (updates.maxUsesPerCustomer !== undefined) data.maxUsesPerCustomer = updates.maxUsesPerCustomer || null;
    if (updates.startsAt !== undefined) data.startsAt = updates.startsAt ? new Date(updates.startsAt) : null;
    if (updates.expiresAt !== undefined) data.expiresAt = updates.expiresAt ? new Date(updates.expiresAt) : null;

    const [discount] = await db.update(autoDiscounts).set(data).where(eq(autoDiscounts.id, id)).returning();
    return NextResponse.json(serializeDecimal(discount));
  } catch (error) {
    console.error("Auto discount PUT error:", error);
    return NextResponse.json({ error: "Failed to update auto discount" }, { status: 500 });
  }
}

/**
 * DELETE /api/auto-discounts — Delete an automatic discount
 */
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Discount ID required" }, { status: 400 });

    await db.delete(autoDiscounts).where(eq(autoDiscounts.id, id));
    return NextResponse.json({ message: "Auto discount deleted" });
  } catch (error) {
    console.error("Auto discount DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete auto discount" }, { status: 500 });
  }
}
