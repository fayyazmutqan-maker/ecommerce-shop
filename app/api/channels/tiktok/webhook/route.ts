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
import {
  salesChannels,
  channelOrders,
  orders,
  orderItems,
  orderAddresses,
  products,
  productVariants,
} from "@/lib/schema";
import { eq } from "drizzle-orm";
import { validateWebhookSignature, getOrderDetail } from "@/lib/tiktok-shop";
import type { TikTokCredentials, TikTokOrder } from "@/lib/tiktok-shop";
import { generateOrderNumber } from "@/lib/helpers";
import { audit } from "@/lib/audit";
import { reportOrderToZatca } from "@/lib/zatca/service";

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
    // Parse credentials to get access token for API calls
    let credentials: TikTokCredentials | null = null;
    try {
      credentials = JSON.parse(channel.credentials || "{}");
    } catch { /* no credentials */ }

    switch (type) {
      case 1: // Order status change
        await handleOrderEvent(channel.id, shop_id, data, credentials);
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
  shopId: string,
  data: Record<string, unknown>,
  credentials: TikTokCredentials | null,
): Promise<void> {
  const externalOrderId = data.order_id as string;
  const orderStatus = data.order_status as string;

  if (!externalOrderId) return;

  // Check if this order was already imported as a real order
  const existing = await db.query.channelOrders.findFirst({
    where: eq(channelOrders.externalOrderId, externalOrderId),
  });

  if (existing?.orderId) {
    // Already imported — just update the channel order status
    await db.update(channelOrders)
      .set({
        status: mapTikTokOrderStatus(orderStatus),
        rawPayload: JSON.stringify(data),
      })
      .where(eq(channelOrders.id, existing.id));

    audit({
      action: "CHANNEL_WEBHOOK",
      resource: "SalesChannel",
      resourceId: channelId,
      details: { platform: "TIKTOK", type: "order_update", orderId: externalOrderId, status: orderStatus },
      success: true,
    });
    return;
  }

  // Try to fetch full order details from TikTok API and create a real order
  if (credentials?.accessToken) {
    try {
      const orderDetails = await getOrderDetail(credentials.accessToken, shopId, [externalOrderId]);
      const tiktokOrder = orderDetails?.[0];

      if (tiktokOrder?.line_items?.length) {
        const order = await importTikTokOrder(channelId, externalOrderId, tiktokOrder, data);

        if (order) {
          audit({
            action: "CHANNEL_WEBHOOK",
            resource: "Order",
            resourceId: order.id,
            details: {
              event: "order_created",
              externalOrderId,
              platform: "TIKTOK",
              totalAmount: tiktokOrder.payment_info?.total_amount,
            },
            success: true,
          });
          return;
        }
      }
    } catch (err) {
      console.error(`[TikTok Webhook] Failed to fetch order detail for ${externalOrderId}:`, err);
    }
  }

  // Fallback: store as tracking-only channel order (no access token or API fetch failed)
  try {
    await db.insert(channelOrders).values({
      channelId,
      externalOrderId,
      externalCustomerId: (data.buyer_uid as string) || null,
      platform: "TIKTOK",
      status: mapTikTokOrderStatus(orderStatus),
      rawPayload: JSON.stringify(data),
    });
  } catch (error) {
    if (String(error).includes("unique") || String(error).includes("duplicate")) {
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
    details: { platform: "TIKTOK", type: "order", orderId: externalOrderId, status: orderStatus },
    success: true,
  });
}

// ─── TikTok Order Import ────────────────────────────────────

async function importTikTokOrder(
  channelId: string,
  externalOrderId: string,
  tiktokOrder: TikTokOrder,
  webhookData: Record<string, unknown>,
): Promise<{ id: string } | null> {
  const lineItems = tiktokOrder.line_items || [];
  if (lineItems.length === 0) return null;

  // Resolve products from our catalog by SKU or product ID
  const resolvedItems: {
    productId: string;
    variantId: string | null;
    name: string;
    sku: string;
    variantName: string | null;
    price: number;
    quantity: number;
  }[] = [];

  for (const item of lineItems) {
    let product = null;
    let variant = null;

    // Try finding by SKU (seller_sku on the TikTok side maps to our SKU)
    if (item.sku_id) {
      product = await db.query.products.findFirst({
        where: eq(products.sku, item.sku_id),
      });
      if (!product) {
        variant = await db.query.productVariants.findFirst({
          where: eq(productVariants.sku, item.sku_id),
        });
        if (variant) {
          product = await db.query.products.findFirst({
            where: eq(products.id, variant.productId),
          });
        }
      }
    }

    // Try finding by product ID directly
    if (!product && item.product_id) {
      product = await db.query.products.findFirst({
        where: eq(products.id, item.product_id),
      });
    }

    if (!product) {
      console.warn(`[TikTok Webhook] Product not found for item: sku=${item.sku_id}, product_id=${item.product_id}`);
      continue;
    }

    const price = parseFloat(item.sale_price) || 0;
    resolvedItems.push({
      productId: product.id,
      variantId: variant?.id || null,
      name: item.product_name || product.name,
      sku: product.sku || product.id,
      variantName: item.sku_name || variant?.name || null,
      price,
      quantity: item.quantity,
    });
  }

  if (resolvedItems.length === 0) {
    console.warn(`[TikTok Webhook] No resolvable items for order ${externalOrderId}`);
    return null;
  }

  // Calculate totals
  const payment = tiktokOrder.payment_info;
  const subtotal = payment?.sub_total
    ? parseFloat(payment.sub_total)
    : resolvedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const shippingAmount = payment?.shipping_fee ? parseFloat(payment.shipping_fee) : 0;
  const totalAmount = payment?.total_amount
    ? parseFloat(payment.total_amount)
    : subtotal + shippingAmount;
  const currency = payment?.currency || "SAR";

  // Create order in transaction
  const order = await db.transaction(async (tx) => {
    const orderNumber = generateOrderNumber();

    const [newOrder] = await tx.insert(orders).values({
      orderNumber,
      email: "",
      status: "CONFIRMED",
      paymentStatus: "PAID",
      fulfillmentStatus: "UNFULFILLED",
      subtotal: subtotal.toFixed(2),
      taxAmount: "0.00",
      shippingAmount: shippingAmount.toFixed(2),
      discountAmount: "0.00",
      totalAmount: totalAmount.toFixed(2),
      currency,
      source: "TIKTOK",
      paymentMethod: "TIKTOK_SHOP",
      notes: `Imported from TikTok Shop (Order ID: ${externalOrderId})`,
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

    return newOrder;
  });

  // Record the channel order mapping (linked to real order)
  try {
    await db.insert(channelOrders).values({
      channelId,
      orderId: order.id,
      externalOrderId,
      externalCustomerId: (webhookData.buyer_uid as string) || null,
      platform: "TIKTOK",
      status: "IMPORTED",
      rawPayload: JSON.stringify(webhookData),
      processedAt: new Date(),
    });
  } catch (error) {
    // If duplicate, update to link with the real order
    if (String(error).includes("unique") || String(error).includes("duplicate")) {
      const existing = await db.query.channelOrders.findFirst({
        where: eq(channelOrders.externalOrderId, externalOrderId),
      });
      if (existing) {
        await db.update(channelOrders)
          .set({ orderId: order.id, status: "IMPORTED", processedAt: new Date() })
          .where(eq(channelOrders.id, existing.id));
      }
    }
  }

  // Report invoice to ZATCA (non-blocking)
  reportOrderToZatca(order.id).catch((err) =>
    console.error(`[TikTok Webhook] ZATCA reporting failed for order ${order.id}:`, err)
  );

  return order;
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
