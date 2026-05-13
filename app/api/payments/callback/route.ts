import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { retrieveTapCharge, mapTapStatus } from "@/lib/tap";
import { orders, transactions } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { webhookLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

/**
 * GET /api/payments/callback
 * Customer is redirected here after completing payment on Tap's hosted page.
 * Verifies the charge status and redirects to order confirmation or failure page.
 */
export async function GET(req: Request) {
  const ip = getClientIp(req);
  const rlResponse = await rateLimitResponse(webhookLimiter, ip);
  if (rlResponse) return rlResponse;

  try {
    const { searchParams } = new URL(req.url);
    const tapId = searchParams.get("tap_id");
    const orderId = searchParams.get("order_id");
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;

    if (!orderId) {
      return NextResponse.redirect(`${baseUrl}/checkout?error=missing_order`);
    }

    // Get the order
    const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
    if (!order) {
      return NextResponse.redirect(`${baseUrl}/checkout?error=order_not_found`);
    }

    // If we have a tap_id, verify the charge
    if (tapId) {
      const tapSecretKey = process.env.TAP_SECRET_KEY;
      if (tapSecretKey) {
        try {
          const charge = await retrieveTapCharge(tapSecretKey, tapId);
          const paymentStatus = mapTapStatus(charge.status);

          // Cross-check: every charge created by this app must be bound to this order.
          if (charge.metadata?.order_id !== orderId) {
            console.error("Callback: order_id in metadata doesn't match URL param", {
              metadataOrderId: charge.metadata?.order_id,
              urlOrderId: orderId,
            });
            return NextResponse.redirect(`${baseUrl}/checkout?error=payment_mismatch`);
          }

          // Verify charged amount matches order
          if (
            paymentStatus === "PAID" &&
            (Math.abs(charge.amount - Number(order.totalAmount)) > 0.01 ||
              charge.currency !== (order.currency || "SAR"))
          ) {
            console.error("Callback: Amount mismatch", {
              charged: `${charge.currency} ${charge.amount}`,
              order: `${order.currency} ${order.totalAmount}`,
            });
            return NextResponse.redirect(
              `${baseUrl}/order-confirmation?order=${order.orderNumber}&status=failed`
            );
          }

          // Update order if webhook hasn't done it yet
          if (order.paymentStatus === "PENDING") {
            const updateData: Record<string, unknown> = { paymentStatus };
            if (paymentStatus === "PAID") {
              updateData.status = "CONFIRMED";
            }
            // Don't cancel order on failed payment — allow retry

            await db.update(orders).set(updateData).where(eq(orders.id, orderId));

            // Update/create transaction
            const existingTx = await db.query.transactions.findFirst({
              where: and(eq(transactions.orderId, orderId), eq(transactions.reference, tapId)),
            });

            if (existingTx) {
              await db.update(transactions).set({
                status: paymentStatus,
                paymentMethod: charge.source?.payment_method || "TAP",
                metadata: JSON.stringify({
                  tap_charge_id: charge.id,
                  tap_status: charge.status,
                  tap_response_code: charge.response?.code,
                  tap_response_message: charge.response?.message,
                  verified_via: "callback",
                }),
              }).where(eq(transactions.id, existingTx.id));
            }
          }

          // Redirect based on payment status
          if (paymentStatus === "PAID" || paymentStatus === "AUTHORIZED") {
            return NextResponse.redirect(
              `${baseUrl}/order-confirmation?order=${order.orderNumber}`
            );
          } else {
            return NextResponse.redirect(
              `${baseUrl}/order-confirmation?order=${order.orderNumber}&status=failed`
            );
          }
        } catch (error) {
          console.error("Callback charge verification error:", error);
          // Fall through to order confirmation with current status
        }
      }
    }

    // Default: redirect to order confirmation (let the page show current status)
    return NextResponse.redirect(
      `${baseUrl}/order-confirmation?order=${order.orderNumber}`
    );
  } catch (error) {
    console.error("Payment callback error:", error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    return NextResponse.redirect(`${baseUrl}/checkout?error=payment_error`);
  }
}
