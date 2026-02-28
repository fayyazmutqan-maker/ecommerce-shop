import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sendAbandonedCartEmail } from "@/lib/email";
import { eq } from "drizzle-orm";
import { abandonedCarts } from "@/lib/schema";

/**
 * POST /api/abandoned-carts/send-recovery — Send recovery email for an abandoned cart
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { cartId } = await req.json();
    if (!cartId) {
      return NextResponse.json({ error: "Cart ID required" }, { status: 400 });
    }

    const cart = await db.query.abandonedCarts.findFirst({ where: eq(abandonedCarts.id, cartId) });
    if (!cart) {
      return NextResponse.json({ error: "Abandoned cart not found" }, { status: 404 });
    }

    if (!cart.email) {
      return NextResponse.json({ error: "No email address associated with this cart" }, { status: 400 });
    }

    if (cart.status === "RECOVERED") {
      return NextResponse.json({ error: "Cart already recovered" }, { status: 400 });
    }

    const items = JSON.parse(cart.items);
    const recoveryUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/cart?recover=${cart.recoveryToken}`;

    await sendAbandonedCartEmail({
      email: cart.email,
      items,
      subtotal: Number(cart.subtotal),
      recoveryUrl,
    });

    await db.update(abandonedCarts).set({
      status: "EMAIL_SENT",
      emailSentAt: new Date(),
    }).where(eq(abandonedCarts.id, cartId));

    return NextResponse.json({ message: "Recovery email sent" });
  } catch (error) {
    console.error("Send recovery email error:", error);
    return NextResponse.json({ error: "Failed to send recovery email" }, { status: 500 });
  }
}
