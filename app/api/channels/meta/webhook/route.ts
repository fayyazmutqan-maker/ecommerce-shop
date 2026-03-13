/**
 * Meta Commerce Webhook Handler
 *
 * GET  /api/channels/meta/webhook — Subscription verification (challenge-response)
 * POST /api/channels/meta/webhook — Receive order/product webhook events
 *
 * This endpoint is excluded from CSRF middleware and uses HMAC-SHA256 verification.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  salesChannels,
  channelOrders,
  orders,
  orderItems,
  orderAddresses,
  products,
  productVariants,
} from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import {
  verifyWebhookSignature,
  verifyWebhookSubscription,
  acknowledgeOrder,
  parseMetaPrice,
} from "@/lib/meta";
import type { MetaCredentials, MetaOrderWebhookPayload } from "@/lib/meta";
import { generateOrderNumber } from "@/lib/helpers";
import { audit } from "@/lib/audit";
import { reportOrderToZatca } from "@/lib/zatca/service";

// GET — Webhook subscription verification
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const result = verifyWebhookSubscription(mode, token, challenge);
  if (result) {
    return new Response(result, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

// POST — Receive webhook events
export async function POST(req: Request) {
  // Read raw body for signature verification
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256") || "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: MetaOrderWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Process entries
  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field === "orders" || change.field === "commerce_orders") {
        await processOrderEvent(entry.id, change.value, rawBody).catch((err) => {
          console.error("[Meta Webhook] Order processing error:", err);
        });
      }
    }
  }

  // Always return 200 quickly to prevent retries
  return NextResponse.json({ received: true });
}

// ─── Order Processing ────────────────────────────────────────

async function processOrderEvent(
  pageId: string,
  orderData: MetaOrderWebhookPayload["entry"][0]["changes"][0]["value"],
  rawPayload: string,
) {
  const externalOrderId = orderData.id;
  if (!externalOrderId) return;

  // Find channel by page ID
  const channel = await db.query.salesChannels.findFirst({
    where: and(
      eq(salesChannels.externalPageId, pageId),
      eq(salesChannels.status, "ACTIVE"),
    ),
  });

  if (!channel) {
    console.warn(`[Meta Webhook] No active channel for page ${pageId}`);
    return;
  }

  // Check settings — is order import enabled?
  let settings: Record<string, unknown> = {};
  try { settings = JSON.parse(channel.settings || "{}"); } catch { /* ignore */ }
  if (settings.syncOrders === false) return;

  // Deduplicate — check if we already imported this order
  const existing = await db.query.channelOrders.findFirst({
    where: and(
      eq(channelOrders.channelId, channel.id),
      eq(channelOrders.externalOrderId, externalOrderId),
    ),
  });
  if (existing) {
    // If order already exists, check for status updates
    await updateOrderStatus(existing.orderId!, orderData);
    return;
  }

  // Parse credentials for acknowledgment
  let credentials: MetaCredentials;
  try {
    credentials = JSON.parse(channel.credentials || "{}");
  } catch { return; }

  const buyer = orderData.buyer_details;
  const shipping = orderData.shipping_address;
  const items = orderData.items || [];
  const payment = orderData.estimated_payment_details;

  if (!buyer?.email || items.length === 0) return;

  // Map Meta items to local products
  const resolvedItems: {
    productId: string;
    variantId: string | null;
    name: string;
    sku: string;
    variantName: string | null;
    price: number;
    quantity: number;
  }[] = [];

  for (const item of items) {
    // Try to resolve by retailer_id (our SKU/product ID)
    let product = await db.query.products.findFirst({
      where: eq(products.sku, item.retailer_id),
    });

    let variant = null;
    if (!product) {
      // Try finding by variant SKU
      variant = await db.query.productVariants.findFirst({
        where: eq(productVariants.sku, item.retailer_id),
      });
      if (variant) {
        product = await db.query.products.findFirst({
          where: eq(products.id, variant.productId),
        });
      }
    }

    if (!product) {
      // Try finding by product ID directly
      product = await db.query.products.findFirst({
        where: eq(products.id, item.retailer_id),
      });
    }

    if (!product) {
      console.warn(`[Meta Webhook] Product not found for retailer_id: ${item.retailer_id}`);
      continue;
    }

    const price = parseMetaPrice(item.price_per_unit.amount);
    resolvedItems.push({
      productId: product.id,
      variantId: variant?.id || null,
      name: product.name,
      sku: product.sku || product.id,
      variantName: variant?.name || null,
      price,
      quantity: item.quantity,
    });
  }

  if (resolvedItems.length === 0) {
    console.warn(`[Meta Webhook] No resolvable items for order ${externalOrderId}`);
    return;
  }

  // Calculate totals
  const subtotal = resolvedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxAmount = payment?.tax ? parseMetaPrice(payment.tax.amount) : 0;
  const shippingAmount = payment?.shipping ? parseMetaPrice(payment.shipping.amount) : 0;
  const totalAmount = payment?.total ? parseMetaPrice(payment.total.amount) : subtotal + taxAmount + shippingAmount;

  // Create order in transaction
  const order = await db.transaction(async (tx) => {
    const orderNumber = generateOrderNumber();

    const [newOrder] = await tx.insert(orders).values({
      orderNumber,
      email: buyer.email,
      phone: buyer.phone || null,
      status: "CONFIRMED",
      paymentStatus: "PAID", // Meta handles payment
      fulfillmentStatus: "UNFULFILLED",
      subtotal: subtotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      shippingAmount: shippingAmount.toFixed(2),
      discountAmount: "0.00",
      totalAmount: totalAmount.toFixed(2),
      currency: payment?.total?.currency || "SAR",
      source: "FACEBOOK",
      paymentMethod: "META_COMMERCE",
      notes: `Imported from Meta Commerce (Order ID: ${externalOrderId})`,
    }).returning();

    // Insert order items
    await tx.insert(orderItems).values(
      resolvedItems.map((item) => ({
        orderId: newOrder.id,
        productId: item.productId,
        variantId: item.variantId,
        name: item.name,
        sku: item.sku,
        variantName: item.variantName,
        price: item.price.toFixed(2),
        quantity: item.quantity,
        totalPrice: (item.price * item.quantity).toFixed(2),
        taxAmount: "0.00",
        discountAmount: "0.00",
      })),
    );

    // Insert shipping address
    if (shipping) {
      const [addr] = await tx.insert(orderAddresses).values({
        orderId: newOrder.id,
        type: "SHIPPING",
        firstName: shipping.name?.split(" ")[0] || "",
        lastName: shipping.name?.split(" ").slice(1).join(" ") || "",
        address1: shipping.street1,
        address2: shipping.street2 || null,
        city: shipping.city,
        state: shipping.state || null,
        postalCode: shipping.postal_code,
        country: shipping.country,
      }).returning();

      await tx.update(orders).set({
        shippingAddressId: addr.id,
      }).where(eq(orders.id, newOrder.id));
    }

    return newOrder;
  });

  // Record the channel order mapping
  await db.insert(channelOrders).values({
    channelId: channel.id,
    orderId: order.id,
    externalOrderId,
    externalCustomerId: buyer.email,
    platform: channel.platform || "FACEBOOK",
    status: "IMPORTED",
    rawPayload,
  });

  // Acknowledge order on Meta (so it moves to IN_PROGRESS)
  if (credentials.accessToken) {
    try {
      await acknowledgeOrder(externalOrderId, credentials.accessToken);
    } catch (err) {
      console.error(`[Meta Webhook] Failed to acknowledge order ${externalOrderId}:`, err);
    }
  }

  // Report invoice to ZATCA (non-blocking — Meta orders arrive as PAID)
  reportOrderToZatca(order.id).catch((err) =>
    console.error(`[Meta Webhook] ZATCA reporting failed for order ${order.id}:`, err)
  );

  audit({
    action: "CHANNEL_WEBHOOK",
    resource: "Order",
    resourceId: order.id,
    details: {
      event: "order_created",
      externalOrderId,
      platform: channel.platform,
      totalAmount,
    },
    success: true,
  });
}

// ─── Order Status Updates ────────────────────────────────────

async function updateOrderStatus(
  orderId: string,
  orderData: MetaOrderWebhookPayload["entry"][0]["changes"][0]["value"],
) {
  const state = orderData.order_status?.state;
  if (!state) return;

  const statusMap: Record<string, { status?: string; fulfillmentStatus?: string }> = {
    "COMPLETED": { status: "DELIVERED", fulfillmentStatus: "FULFILLED" },
    "CANCELLED": { status: "CANCELLED" },
    "IN_PROGRESS": { status: "PROCESSING" },
  };

  const updates = statusMap[state];
  if (updates) {
    await db.update(orders).set(updates).where(eq(orders.id, orderId));
  }
}
