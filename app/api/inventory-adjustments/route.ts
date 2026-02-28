import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { inventoryAdjustments, products, productVariants } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { eq, desc, and, sql } from "drizzle-orm";
import { z } from "zod";

const adjustmentSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().nullable().optional(),
  newQuantity: z.number().int().min(0),
  reason: z.enum(["MANUAL", "ORDER", "RESTOCK", "RETURN", "CORRECTION", "TRANSFER"]),
  note: z.string().max(500).nullable().optional(),
});

// GET — list inventory adjustments
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    const conditions = [];
    if (productId) conditions.push(eq(inventoryAdjustments.productId, productId));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [adjustments, totalResult] = await Promise.all([
      db.query.inventoryAdjustments.findMany({
        where,
        orderBy: desc(inventoryAdjustments.createdAt),
        limit,
        offset,
      }),
      db.select({ count: sql<number>`count(*)` }).from(inventoryAdjustments).where(where),
    ]);

    const total = Number(totalResult[0].count);

    return NextResponse.json({
      adjustments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Inventory adjustments GET error:", error);
    return NextResponse.json({ error: "Failed to fetch adjustments" }, { status: 500 });
  }
}

// POST — create inventory adjustment
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = adjustmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const data = parsed.data;

    // Get current quantity
    let previousQuantity = 0;
    if (data.variantId) {
      const variant = await db.query.productVariants.findFirst({
        where: eq(productVariants.id, data.variantId),
      });
      if (!variant) {
        return NextResponse.json({ error: "Variant not found" }, { status: 404 });
      }
      previousQuantity = variant.quantity;

      // Update variant quantity
      await db.update(productVariants)
        .set({ quantity: data.newQuantity })
        .where(eq(productVariants.id, data.variantId));
    } else {
      const product = await db.query.products.findFirst({
        where: eq(products.id, data.productId),
      });
      if (!product) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }
      previousQuantity = product.quantity;

      // Update product quantity
      await db.update(products)
        .set({ quantity: data.newQuantity })
        .where(eq(products.id, data.productId));
    }

    const adjustmentQuantity = data.newQuantity - previousQuantity;

    const [adjustment] = await db.insert(inventoryAdjustments).values({
      productId: data.productId,
      variantId: data.variantId || null,
      previousQuantity,
      newQuantity: data.newQuantity,
      adjustmentQuantity,
      reason: data.reason,
      note: data.note || null,
      userId: session.user.id,
      userName: session.user.name || "Admin",
    }).returning();

    return NextResponse.json(adjustment, { status: 201 });
  } catch (error) {
    console.error("Inventory adjustment POST error:", error);
    return NextResponse.json({ error: "Failed to create adjustment" }, { status: 500 });
  }
}
