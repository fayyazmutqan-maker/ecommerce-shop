import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { createTapCharge, parseSaudiPhone } from "@/lib/tap";
import { z } from "zod";
import { orders, storeSettings, transactions, orderTimeline } from "@/lib/schema";
import { eq } from "drizzle-orm";

const createChargeSchema = z.object({
  orderId: z.string().min(1),
  email: z.string().email().optional(), // Required for guest checkout verification
});

/**
 * POST /api/payments/create-charge
 * Creates a Tap Payments charge for an existing order.
 * Returns the Tap hosted payment page URL for customer redirect.
 * Supports both authenticated users and guest checkout.
 */
export async function POST(req: Request) {
  try {
    const session = await auth();

    const body = await req.json();
    const parsed = createChargeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    const { orderId, email: guestEmail } = parsed.data;

    // Guests must provide the email that matches the order
    if (!session?.user && !guestEmail) {
      return NextResponse.json({ error: "Email required for guest checkout" }, { status: 400 });
    }

    // Fetch the order
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: { shippingAddress: true },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Verify order ownership
    if (session?.user) {
      // Authenticated user: must own the order or have matching email
      if (order.userId && order.userId !== session.user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
      if (!order.userId && order.email !== session.user.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    } else {
      // Guest user: email must match the order email exactly
      if (order.email !== guestEmail) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    // Only allow payment for PENDING orders
    if (order.paymentStatus !== "PENDING") {
      return NextResponse.json(
        { error: "Order payment is not pending" },
        { status: 400 }
      );
    }

    // Get Tap settings from store settings
    const settings = await db.query.storeSettings.findFirst();
    if (!settings?.tapEnabled || !settings?.tapSecretKey) {
      return NextResponse.json(
        { error: "Payment gateway not configured" },
        { status: 500 }
      );
    }

    // Build the base URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;

    // Create the Tap charge
    const charge = await createTapCharge(settings.tapSecretKey, {
      amount: Number(order.totalAmount),
      currency: order.currency || "SAR",
      description: `Order ${order.orderNumber}`,
      reference: {
        order: order.orderNumber,
      },
      receipt: {
        email: true,
        sms: false,
      },
      customer: {
        first_name: order.shippingAddress?.firstName || "Customer",
        last_name: order.shippingAddress?.lastName || "",
        email: order.email,
        phone: parseSaudiPhone(order.phone || undefined),
      },
      source: {
        id: "src_all", // All payment methods (mada, Visa, MC, Apple Pay, STC Pay)
      },
      redirect: {
        url: `${baseUrl}/api/payments/callback?order_id=${order.id}`,
      },
      post: {
        url: `${baseUrl}/api/payments/webhook`,
      },
      metadata: {
        order_id: order.id,
        order_number: order.orderNumber,
      },
    });

    // Store the charge ID on the order for later verification
    await db.update(orders).set({
      paymentMethod: "TAP",
    }).where(eq(orders.id, order.id));

    // Create a transaction record
    await db.insert(transactions).values({
      orderId: order.id,
      type: "CHARGE",
      status: "PENDING",
      amount: order.totalAmount,
      currency: order.currency || "SAR",
      paymentMethod: "TAP",
      reference: charge.id,
      metadata: JSON.stringify({
        tap_charge_id: charge.id,
        tap_status: charge.status,
      }),
    });

    // Add timeline entry
    await db.insert(orderTimeline).values({
      orderId: order.id,
      title: "Payment Initiated",
      message: `Customer redirected to Tap payment page (Charge: ${charge.id})`,
      type: "INFO",
    });

    // Return the Tap payment page URL
    return NextResponse.json({
      paymentUrl: charge.transaction.url,
      chargeId: charge.id,
    });
  } catch (error) {
    console.error("Create charge error:", error);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}
