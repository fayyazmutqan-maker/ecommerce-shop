/**
 * TikTok Shop Webhook Handler
 *
 * POST /api/channels/tiktok/webhook — Incoming push notifications
 *
 * TikTok sends: order events, product events, return events.
 * Signature verified via HMAC-SHA256 in the authorization header.
 *
 * Docs: https://partner.tiktokshop.com/docv2/page/6503512ca825b002be56a1f5
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { salesChannels, channelOrders } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { validateWebhookSignature } from "@/lib/tiktok-shop";
import { audit } from "@/lib/audit";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("authorization");

  // Validate signature
  if (!validateWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: {
    type: number;
    shop_id: string;
    timestamp: number;
    data: Record<string, unknown>;
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, shop_id, data } = payload;

  // Find channel by shop ID
  const channel = await db.query.salesChannels.findFirst({
    where: eq(salesChannels.externalAccountId, shop_id),
  });

  if (!channel || channel.platform !== "TIKTOK") {
    // Acknowledge receipt even if no channel found (prevents retries)
    return NextResponse.json({ code: 0, message: "success" });
  }

  try {
    switch (type) {
      case 1: // Order status change
        await handleOrderEvent(channel.id, data);
        break;

      case 3: // Product status change
        await handleProductEvent(channel.id, data);
        break;

      case 2: // Reverse order / return
        await handleReturnEvent(channel.id, data);
        break;

      default:
        // Log unhandled event types for future support
        audit({
          action: "CHANNEL_WEBHOOK",
          resource: "SalesChannel",
          resourceId: channel.id,
          details: {
            platform: "TIKTOK",
            type,
            shopId: shop_id,
          },
          success: true,
        });
    }
  } catch (error) {
    console.error("[TikTok Webhook] Processing error:", error);
  }

  // Always return success to prevent TikTok from retrying
  return NextResponse.json({ code: 0, message: "success" });
}

// ─── Event Handlers ──────────────────────────────────────────

async function handleOrderEvent(
  channelId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const orderId = data.order_id as string;
  const orderStatus = data.order_status as string;

  if (!orderId) return;

  // Upsert channel order for tracking
  try {
    await db.insert(channelOrders).values({
      channelId,
      externalOrderId: orderId,
      externalCustomerId: (data.buyer_uid as string) || null,
      platform: "TIKTOK",
      status: mapTikTokOrderStatus(orderStatus),
      rawPayload: JSON.stringify(data),
    });
  } catch (error) {
    // Duplicate — update status instead
    if (String(error).includes("unique") || String(error).includes("duplicate")) {
      const existing = await db.query.channelOrders.findFirst({
        where: eq(channelOrders.externalOrderId, orderId),
      });
      if (existing) {
        await db.update(channelOrders)
          .set({
            status: mapTikTokOrderStatus(orderStatus),
            rawPayload: JSON.stringify(data),
          })
          .where(eq(channelOrders.id, existing.id));
      }
    } else {
      throw error;
    }
  }

  audit({
    action: "CHANNEL_WEBHOOK",
    resource: "SalesChannel",
    resourceId: channelId,
    details: {
      platform: "TIKTOK",
      type: "order",
      orderId,
      status: orderStatus,
    },
    success: true,
  });
}

async function handleProductEvent(
  channelId: string,
  data: Record<string, unknown>,
): Promise<void> {
  // Product status changes (approval, rejection, etc.)
  audit({
    action: "CHANNEL_WEBHOOK",
    resource: "SalesChannel",
    resourceId: channelId,
    details: {
      platform: "TIKTOK",
      type: "product",
      productId: data.product_id,
      event: data.event,
    },
    success: true,
  });
}

async function handleReturnEvent(
  channelId: string,
  data: Record<string, unknown>,
): Promise<void> {
  audit({
    action: "CHANNEL_WEBHOOK",
    resource: "SalesChannel",
    resourceId: channelId,
    details: {
      platform: "TIKTOK",
      type: "return",
      orderId: data.order_id,
      returnId: data.return_id,
    },
    success: true,
  });
}

// ─── Status Mapping ──────────────────────────────────────────

function mapTikTokOrderStatus(status: string): string {
  // TikTok order statuses → our internal statuses
  switch (status) {
    case "AWAITING_SHIPMENT":
    case "AWAITING_COLLECTION":
    case "UNPAID":
      return "PENDING";
    case "IN_TRANSIT":
    case "PARTIALLY_SHIPPING":
      return "IMPORTED";
    case "DELIVERED":
    case "COMPLETED":
      return "FULFILLED";
    case "CANCELLED":
      return "ERROR";
    default:
      return "PENDING";
  }
}
