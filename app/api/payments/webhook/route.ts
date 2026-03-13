import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { retrieveTapCharge, mapTapStatus, verifyTapWebhookSignature } from "@/lib/tap";
import { orders, transactions, orderTimeline } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { webhookLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

/**
 * POST /api/payments/webhook
 * Tap Payments webhook handler — receives server-to-server payment status updates.
 * 
 * IMPORTANT: This route must NOT be behind auth middleware.
 * Tap sends POST requests with charge data when payment status changes.
 */
export async function POST(req: Request) {
  const ip = getClientIp(req);

  // Rate-limit webhooks to prevent abuse
  const rlResponse = await rateLimitResponse(webhookLimiter, ip);
  if (rlResponse) {
    audit({ action: "RATE_LIMIT_HIT", ip, resource: "payment-webhook", success: false });
    return rlResponse;
  }

  try {
    // Read the raw body for HMAC verification before parsing JSON
    const rawBody = await req.text();
    const hashString = req.headers.get("hashstring");

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const chargeId = body?.id;

    if (!chargeId || typeof chargeId !== "string") {
      return NextResponse.json(
        { error: "Invalid webhook payload" },
        { status: 400 }
      );
    }

    // Get Tap secret key from environment
    const tapSecretKey = process.env.TAP_SECRET_KEY;
    if (!tapSecretKey) {
      console.error("Webhook: TAP_SECRET_KEY not configured in environment");
      return NextResponse.json(
        { error: "Payment gateway not configured" },
        { status: 500 }
      );
    }

    // Verify webhook HMAC signature if provided by Tap
    // Log a warning if missing but still proceed (re-fetch provides secondary verification)
    if (hashString) {
      const isValid = verifyTapWebhookSignature(tapSecretKey, rawBody, hashString);
      if (!isValid) {
        console.error("Webhook: HMAC signature verification failed for charge", chargeId);
        return NextResponse.json(
          { error: "Invalid webhook signature" },
          { status: 403 }
        );
      }
    } else {
      console.error("Webhook: No hashstring header present — rejecting unsigned webhook");
      return NextResponse.json(
        { error: "Missing webhook signature" },
        { status: 403 }
      );
    }

    // Always re-fetch the charge from Tap API to verify authenticity
    // This prevents spoofed webhook payloads
    const charge = await retrieveTapCharge(tapSecretKey, chargeId);

    if (!charge || !charge.id) {
      console.error("Webhook: Could not verify charge", chargeId);
      return NextResponse.json(
        { error: "Could not verify charge" },
        { status: 400 }
      );
    }

    const orderId = charge.metadata?.order_id;
    if (!orderId) {
      console.error("Webhook: No order_id in charge metadata", chargeId);
      return NextResponse.json(
        { error: "No order_id in metadata" },
        { status: 400 }
      );
    }

    // Map Tap status to our internal status
    const paymentStatus = mapTapStatus(charge.status);

    // Update order payment status
    const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
    if (!order) {
      console.error("Webhook: Order not found", orderId);
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Verify the charged amount matches the order total (prevent underpayment attacks)
    if (
      paymentStatus === "PAID" &&
      (Math.abs(charge.amount - Number(order.totalAmount)) > 0.01 ||
        charge.currency !== (order.currency || "SAR"))
    ) {
      console.error(
        `Webhook: Amount mismatch. Charged: ${charge.currency} ${charge.amount}, Order: ${order.currency} ${order.totalAmount}`
      );
      return NextResponse.json(
        { error: "Amount mismatch" },
        { status: 400 }
      );
    }

    // Idempotency: skip if the order already has this exact payment status
    if (order.paymentStatus === paymentStatus) {
      console.log(`Webhook: Order ${order.orderNumber} already has status ${paymentStatus}, skipping`);
      return NextResponse.json({ status: "ok", message: "Already processed" });
    }

    // Don't allow regressing from PAID to other statuses
    if (order.paymentStatus === "PAID" && paymentStatus !== "PAID") {
      console.warn(`Webhook: Ignoring status regression from PAID to ${paymentStatus} for order ${order.orderNumber}`);
      return NextResponse.json({ status: "ok", message: "Status regression ignored" });
    }

    // Update the order
    const updateData: Record<string, unknown> = {
      paymentStatus,
    };

    // If payment is successful, confirm the order
    if (paymentStatus === "PAID") {
      updateData.status = "CONFIRMED";
    }
    // Don't cancel the entire order on payment failure — allow retry
    // Only mark the payment as failed

    await db.update(orders).set(updateData).where(eq(orders.id, orderId));

    // Update or create transaction record
    const existingTx = await db.query.transactions.findFirst({
      where: and(eq(transactions.orderId, orderId), eq(transactions.reference, chargeId)),
    });

    const txData = {
      status: paymentStatus,
      paymentMethod: charge.source?.payment_method || "TAP",
      metadata: JSON.stringify({
        tap_charge_id: charge.id,
        tap_status: charge.status,
        tap_response_code: charge.response?.code,
        tap_response_message: charge.response?.message,
        tap_gateway_response: charge.gateway?.response?.message,
        tap_source_type: charge.source?.type,
        tap_payment_type: charge.source?.payment_type,
      }),
    };

    if (existingTx) {
      await db.update(transactions).set(txData).where(eq(transactions.id, existingTx.id));
    } else {
      await db.insert(transactions).values({
        orderId,
        type: "CHARGE",
        amount: String(charge.amount),
        currency: charge.currency,
        reference: chargeId,
        ...txData,
      });
    }

    // Add timeline entry
    const timelineMessages: Record<string, { title: string; message: string; type: string }> = {
      PAID: {
        title: "Payment Captured",
        message: `Payment of ${charge.currency} ${charge.amount} captured successfully via ${charge.source?.payment_method || "Tap"}`,
        type: "SUCCESS",
      },
      FAILED: {
        title: "Payment Failed",
        message: `Payment failed: ${charge.response?.message || "Unknown error"}`,
        type: "ERROR",
      },
      CANCELLED: {
        title: "Payment Cancelled",
        message: "Customer cancelled the payment",
        type: "WARNING",
      },
      AUTHORIZED: {
        title: "Payment Authorized",
        message: `Payment of ${charge.currency} ${charge.amount} authorized`,
        type: "INFO",
      },
    };

    const timeline = timelineMessages[paymentStatus];
    if (timeline) {
      await db.insert(orderTimeline).values({
        orderId,
        ...timeline,
      });
    }

    console.log(`Webhook: Order ${order.orderNumber} payment status → ${paymentStatus}`);

    audit({
      action: "PAYMENT_WEBHOOK",
      ip,
      resource: "payment",
      resourceId: chargeId as string,
      details: { orderId, orderNumber: order.orderNumber, paymentStatus, amount: charge.amount, currency: charge.currency },
      success: true,
    });

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Webhook error:", error);
    audit({ action: "PAYMENT_WEBHOOK", ip, success: false, error: String(error) });
    // Return 500 for recoverable errors so Tap will retry
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
