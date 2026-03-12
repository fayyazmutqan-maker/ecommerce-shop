/**
 * Snapchat Webhook Handler
 *
 * POST /api/channels/snapchat/webhook — Incoming push notifications
 *
 * Snapchat sends catalog status updates and product status change events.
 * Signature verified via HMAC-SHA256 using the client secret.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { salesChannels, channelOrders } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { validateWebhookSignature } from "@/lib/snapchat";
import { audit } from "@/lib/audit";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-snap-signature");

  // Validate signature
  if (!validateWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: {
    event_type: string;
    organization_id?: string;
    catalog_id?: string;
    data: Record<string, unknown>;
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event_type, organization_id, catalog_id, data } = payload;

  // Find channel by organization ID or catalog ID
  let channel = null;
  if (organization_id) {
    channel = await db.query.salesChannels.findFirst({
      where: eq(salesChannels.externalAccountId, organization_id),
    });
  }
  if (!channel && catalog_id) {
    channel = await db.query.salesChannels.findFirst({
      where: eq(salesChannels.externalCatalogId, catalog_id),
    });
  }

  if (!channel || channel.platform !== "SNAPCHAT") {
    // Acknowledge receipt even if no channel found (prevents retries)
    return NextResponse.json({ status: "ok" });
  }

  try {
    switch (event_type) {
      case "CATALOG_PRODUCT_UPDATE":
      case "CATALOG_PRODUCT_STATUS":
        await handleProductEvent(channel.id, data);
        break;

      case "CATALOG_FEED_PROCESSED":
        await handleFeedEvent(channel.id, data);
        break;

      default:
        audit({
          action: "CHANNEL_WEBHOOK",
          resource: "SalesChannel",
          resourceId: channel.id,
          details: { platform: "SNAPCHAT", event_type, catalogId: catalog_id },
          success: true,
        });
    }
  } catch (error) {
    console.error("[Snapchat Webhook] Processing error:", error);
  }

  // Always return success to prevent retries
  return NextResponse.json({ status: "ok" });
}

// ─── Event Handlers ──────────────────────────────────────────

async function handleProductEvent(
  channelId: string,
  data: Record<string, unknown>,
): Promise<void> {
  audit({
    action: "CHANNEL_WEBHOOK",
    resource: "SalesChannel",
    resourceId: channelId,
    details: {
      platform: "SNAPCHAT",
      event: "product_update",
      retailer_id: data.retailer_id,
      status: data.status,
    },
    success: true,
  });
}

async function handleFeedEvent(
  channelId: string,
  data: Record<string, unknown>,
): Promise<void> {
  audit({
    action: "CHANNEL_WEBHOOK",
    resource: "SalesChannel",
    resourceId: channelId,
    details: {
      platform: "SNAPCHAT",
      event: "feed_processed",
      feed_id: data.feed_id,
      items_processed: data.items_processed,
      errors_count: data.errors_count,
    },
    success: true,
  });
}
