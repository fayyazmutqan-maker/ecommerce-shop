import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { products, productVariants } from "@/lib/schema";

const adjustmentSchema = z.object({
  adjustment: z.number().int(),
});

/**
 * PUT /api/products/inventory — Adjust inventory for a product or variant
 * Query params: productId or variantId
 */
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const variantId = searchParams.get("variantId");

    if (!productId && !variantId) {
      return NextResponse.json({ error: "productId or variantId required" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = adjustmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { adjustment } = parsed.data;

    if (variantId) {
      const [updated] = await db
        .update(productVariants)
        .set({
          quantity: sql`GREATEST(0, ${productVariants.quantity} + ${adjustment})`,
        })
        .where(eq(productVariants.id, variantId))
        .returning({ id: productVariants.id, quantity: productVariants.quantity });

      if (!updated) {
        return NextResponse.json({ error: "Variant not found" }, { status: 404 });
      }

      return NextResponse.json(updated);
    } else {
      const [updated] = await db
        .update(products)
        .set({
          quantity: sql`GREATEST(0, ${products.quantity} + ${adjustment})`,
        })
        .where(eq(products.id, productId!))
        .returning({ id: products.id, quantity: products.quantity });

      if (!updated) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }

      return NextResponse.json(updated);
    }
  } catch (error) {
    console.error("Inventory PUT error:", error);
    return NextResponse.json({ error: "Failed to adjust inventory" }, { status: 500 });
  }
}
