import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { serializeDecimal } from "@/lib/decimal";
import { isRequestAbortedError } from "@/lib/request-errors";
import { eq, desc, count, and } from "drizzle-orm";
import { abandonedCarts } from "@/lib/schema";

const abandonedCartSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    variantId: z.string().optional().nullable(),
    name: z.string(),
    price: z.number(),
    quantity: z.number(),
    image: z.string().optional(),
    variantName: z.string().optional(),
  })),
  subtotal: z.number().min(0),
});

/**
 * POST /api/abandoned-carts — Save/update abandoned cart
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = abandonedCartSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const data = parsed.data;
    const session = await auth();
    const userId = session?.user?.id || null;
    const email = data.email || session?.user?.email || null;

    // Find existing abandoned cart for this user/email
    const existing = userId
      ? await db.query.abandonedCarts.findFirst({ where: and(eq(abandonedCarts.userId, userId), eq(abandonedCarts.status, "ABANDONED")) })
      : email
        ? await db.query.abandonedCarts.findFirst({ where: and(eq(abandonedCarts.email, email), eq(abandonedCarts.status, "ABANDONED")) })
        : null;

    if (existing) {
      const [cart] = await db.update(abandonedCarts).set({
        items: JSON.stringify(data.items),
        subtotal: String(data.subtotal),
        email: email || existing.email,
        phone: data.phone || existing.phone,
      }).where(eq(abandonedCarts.id, existing.id)).returning();
      return NextResponse.json(serializeDecimal(cart));
    }

    const [cart] = await db.insert(abandonedCarts).values({
      userId,
      email,
      phone: data.phone || null,
      items: JSON.stringify(data.items),
      subtotal: String(data.subtotal),
    }).returning();

    return NextResponse.json(serializeDecimal(cart), { status: 201 });
  } catch (error) {
    if (isRequestAbortedError(error)) {
      return new Response(null, { status: 204 });
    }
    console.error("Abandoned cart POST error:", error);
    return NextResponse.json({ error: "Failed to save abandoned cart" }, { status: 500 });
  }
}

/**
 * GET /api/abandoned-carts — Admin: list all abandoned carts
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") || "20"));
    const status = searchParams.get("status") || undefined;

    const whereClause = status ? eq(abandonedCarts.status, status) : undefined;

    const [carts, [{ value: total }]] = await Promise.all([
      db.query.abandonedCarts.findMany({
        where: whereClause,
        orderBy: desc(abandonedCarts.createdAt),
        limit,
        offset: (page - 1) * limit,
      }),
      db.select({ value: count() }).from(abandonedCarts).where(whereClause),
    ]);

    return NextResponse.json(serializeDecimal({
      carts: carts.map((c) => ({
        ...c,
        items: JSON.parse(c.items),
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }));
  } catch (error) {
    console.error("Abandoned carts GET error:", error);
    return NextResponse.json({ error: "Failed to fetch abandoned carts" }, { status: 500 });
  }
}

/**
 * DELETE /api/abandoned-carts — Admin: delete abandoned cart
 */
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await db.delete(abandonedCarts).where(eq(abandonedCarts.id, id));
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error("Abandoned cart DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
