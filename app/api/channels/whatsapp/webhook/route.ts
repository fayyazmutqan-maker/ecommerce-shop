/**
 * WhatsApp Webhook Handler
 *
 * GET  /api/channels/whatsapp/webhook — Webhook verification (Meta challenge)
 * POST /api/channels/whatsapp/webhook — Incoming messages, orders, statuses
 *
 * Webhook events: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { salesChannels, channelOrders, orders, users } from "@/lib/schema";
import { eq, and, or } from "drizzle-orm";
import {
  verifyWebhook,
  validateWebhookSignature,
  markMessageAsRead,
  sendTextMessage,
} from "@/lib/whatsapp";
import type {
  WhatsAppWebhookPayload,
  WhatsAppIncomingMessage,
  WhatsAppCredentials,
} from "@/lib/whatsapp";
import { audit } from "@/lib/audit";

// GET — Webhook verification (Meta subscription challenge)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const result = verifyWebhook(mode, token, challenge);
  if (result) {
    return new Response(result, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// POST — Incoming webhook events
export async function POST(req: Request) {
  const rawBody = await req.text();

  // Validate signature
  const signature = req.headers.get("x-hub-signature-256");
  if (!validateWebhookSignature(rawBody, signature)) {
    console.error("[WhatsApp Webhook] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: WhatsAppWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload.object !== "whatsapp_business_account") {
    return NextResponse.json({ received: true });
  }

  // Process each entry
  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      if (change.field !== "messages") continue;

      const value = change.value;
      const phoneNumberId = value.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      // Find the matching channel
      const channel = await db.query.salesChannels.findFirst({
        where: and(
          eq(salesChannels.platform, "WHATSAPP"),
          eq(salesChannels.externalPageId, phoneNumberId),
          eq(salesChannels.status, "ACTIVE"),
        ),
      });
      if (!channel) continue;

      let credentials: WhatsAppCredentials;
      try {
        credentials = JSON.parse(channel.credentials || "{}");
      } catch { continue; }
      if (!credentials.accessToken) continue;

      // Handle incoming messages
      if (value.messages) {
        for (const message of value.messages) {
          await processMessage(message, channel.id, credentials);
        }
      }

      // Handle status updates (delivered, read, failed)
      if (value.statuses) {
        for (const status of value.statuses) {
          if (status.status === "failed" && status.errors?.length) {
            console.error(
              `[WhatsApp] Message ${status.id} failed:`,
              status.errors[0].title,
              status.errors[0].message,
            );
          }
        }
      }
    }
  }

  // Always return 200 to acknowledge receipt
  return NextResponse.json({ received: true });
}

// ─── Message Processing ──────────────────────────────────────

async function processMessage(
  message: WhatsAppIncomingMessage,
  channelId: string,
  credentials: WhatsAppCredentials,
): Promise<void> {
  const { phoneNumberId, accessToken } = credentials;

  // Mark as read
  try {
    await markMessageAsRead(phoneNumberId, message.id, accessToken);
  } catch {
    // Non-blocking
  }

  switch (message.type) {
    case "order":
      await handleOrderMessage(message, channelId, credentials);
      break;

    case "text":
      await handleTextMessage(message, credentials);
      break;

    // Interactive replies (button, list, product inquiry)
    case "interactive":
    case "button":
      // Log for future handling
      audit({
        action: "CHANNEL_WEBHOOK",
        resource: "SalesChannel",
        resourceId: channelId,
        details: {
          platform: "WHATSAPP",
          type: message.type,
          from: message.from,
        },
        success: true,
      });
      break;
  }
}

// ─── Order Message Handler ───────────────────────────────────

async function handleOrderMessage(
  message: WhatsAppIncomingMessage,
  channelId: string,
  credentials: WhatsAppCredentials,
): Promise<void> {
  if (!message.order) return;

  const { catalog_id, product_items, text: orderText } = message.order;

  // Calculate order total
  let total = 0;
  for (const item of product_items) {
    total += item.item_price * item.quantity;
  }

  // Store as a channel order for admin review
  try {
    await db.insert(channelOrders).values({
      channelId,
      externalOrderId: message.id,
      externalCustomerId: message.from,
      platform: "WHATSAPP",
      status: "PENDING",
      rawPayload: JSON.stringify({
        from: message.from,
        timestamp: message.timestamp,
        catalogId: catalog_id,
        items: product_items,
        total,
        note: orderText,
      }),
    });
  } catch (error) {
    // Duplicate order ID — already processed
    if (String(error).includes("unique") || String(error).includes("duplicate")) {
      return;
    }
    throw error;
  }

  // Send acknowledgment to customer
  const itemCount = product_items.reduce((sum, item) => sum + item.quantity, 0);
  const currency = product_items[0]?.currency || "SAR";
  const totalFormatted = (total / 100).toFixed(2);

  try {
    await sendTextMessage(
      credentials.phoneNumberId,
      message.from,
      `✅ Thank you for your order!\n\n` +
      `📦 ${itemCount} item(s) — ${currency} ${totalFormatted}\n\n` +
      `We'll process your order shortly and send you an update.`,
      credentials.accessToken,
    );
  } catch {
    // Non-blocking — order is still stored
  }

  audit({
    action: "CHANNEL_WEBHOOK",
    resource: "SalesChannel",
    resourceId: channelId,
    details: {
      platform: "WHATSAPP",
      type: "order",
      from: message.from,
      itemCount,
      total,
    },
    success: true,
  });
}

// ─── Text Message Handler ────────────────────────────────────

async function handleTextMessage(
  message: WhatsAppIncomingMessage,
  credentials: WhatsAppCredentials,
): Promise<void> {
  // Simple auto-reply for common queries
  const text = message.text?.body?.toLowerCase().trim() || "";
  const { phoneNumberId, accessToken } = credentials;
  const from = message.from;

  // Check for order status inquiry
  if (text.includes("order") && (text.includes("status") || text.includes("track"))) {
    // Look up recent orders for this phone number
    const phoneLike = from.startsWith("+") ? from.slice(1) : from;
    const recentOrder = await db.query.orders.findFirst({
      where: or(eq(orders.phone, from), eq(orders.phone, phoneLike), eq(orders.phone, `+${phoneLike}`)),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      columns: { id: true, orderNumber: true, status: true, createdAt: true },
    });

    if (recentOrder) {
      await sendTextMessage(
        phoneNumberId,
        from,
        `📋 Your latest order:\n\n` +
        `Order: #${recentOrder.orderNumber}\n` +
        `Status: ${recentOrder.status}\n\n` +
        `For more details, please visit our website or contact support.`,
        accessToken,
      );
    } else {
      await sendTextMessage(
        phoneNumberId,
        from,
        `We couldn't find an order linked to your phone number. ` +
        `Please provide your order number or contact our support team.`,
        accessToken,
      );
    }
    return;
  }

  // Default auto-reply
  await sendTextMessage(
    phoneNumberId,
    from,
    `👋 Welcome! Thanks for reaching out.\n\n` +
    `You can:\n` +
    `• Browse our catalog directly in this chat\n` +
    `• Type "order status" to check your order\n` +
    `• Our team will respond shortly`,
    accessToken,
  );
}
