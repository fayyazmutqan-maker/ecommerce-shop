import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { abandonedCarts } from "@/lib/schema";

/**
 * GET /api/abandoned-carts/recover?token=xxx — Recover abandoned cart items
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Recovery token required" }, { status: 400 });
    }

    const cart = await db.query.abandonedCarts.findFirst({
      where: eq(abandonedCarts.recoveryToken, token),
    });

    if (!cart) {
      return NextResponse.json({ error: "Invalid recovery link" }, { status: 404 });
    }

    if (cart.status === "RECOVERED") {
      return NextResponse.json({ error: "This cart has already been recovered" }, { status: 400 });
    }

    // Check if cart is older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (cart.createdAt < thirtyDaysAgo) {
      await db.update(abandonedCarts)
        .set({ status: "EXPIRED" })
        .where(eq(abandonedCarts.id, cart.id));
      return NextResponse.json({ error: "This recovery link has expired" }, { status: 410 });
    }

    const items = JSON.parse(cart.items);

    return NextResponse.json({
      items,
      subtotal: cart.subtotal,
      email: cart.email,
    });
  } catch (error) {
    console.error("Recover cart error:", error);
    return NextResponse.json({ error: "Failed to recover cart" }, { status: 500 });
  }
}
