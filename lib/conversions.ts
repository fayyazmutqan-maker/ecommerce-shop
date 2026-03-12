/**
 * Meta Conversions API Service
 *
 * Server-side event tracking for Meta Pixel.
 * Sends events to Meta Conversions API for better attribution
 * without relying solely on client-side pixel.
 *
 * Docs: https://developers.facebook.com/docs/marketing-api/conversions-api/
 */

import { db } from "@/lib/db";
import { salesChannels } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { sendConversionEvents, hashPII } from "@/lib/meta";
import type { MetaConversionEvent, MetaCredentials } from "@/lib/meta";
import crypto from "crypto";

// ─── Types ───────────────────────────────────────────────────

interface TrackingContext {
  /** Customer email (will be hashed) */
  email?: string;
  /** Customer phone (will be hashed) */
  phone?: string;
  /** Client IP address */
  ipAddress?: string;
  /** User agent string */
  userAgent?: string;
  /** Meta click ID cookie (_fbc) */
  fbc?: string;
  /** Meta browser ID cookie (_fbp) */
  fbp?: string;
  /** Internal user/customer ID */
  userId?: string;
  /** Source page URL */
  sourceUrl?: string;
}

interface PurchaseData {
  orderId: string;
  value: number;
  currency: string;
  items: { id: string; quantity: number; price: number }[];
}

interface ProductViewData {
  productId: string;
  productName: string;
  value: number;
  currency: string;
}

interface CartData {
  productId: string;
  value: number;
  currency: string;
  quantity: number;
}

interface SearchData {
  query: string;
}

// ─── Event Builders ──────────────────────────────────────────

function buildBaseEvent(
  eventName: MetaConversionEvent["event_name"],
  context: TrackingContext,
): Omit<MetaConversionEvent, "custom_data"> {
  return {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: crypto.randomUUID(),
    event_source_url: context.sourceUrl,
    action_source: "website",
    user_data: {
      em: context.email ? [hashPII(context.email)] : undefined,
      ph: context.phone ? [hashPII(context.phone)] : undefined,
      client_ip_address: context.ipAddress,
      client_user_agent: context.userAgent,
      fbc: context.fbc,
      fbp: context.fbp,
      external_id: context.userId ? [hashPII(context.userId)] : undefined,
    },
  };
}

// ─── Public Tracking Functions ───────────────────────────────

/**
 * Track a purchase event (sent after order confirmation).
 */
export async function trackPurchase(
  data: PurchaseData,
  context: TrackingContext,
): Promise<void> {
  const event: MetaConversionEvent = {
    ...buildBaseEvent("Purchase", context),
    custom_data: {
      value: data.value,
      currency: data.currency,
      content_ids: data.items.map((i) => i.id),
      content_type: "product",
      contents: data.items.map((i) => ({
        id: i.id,
        quantity: i.quantity,
        item_price: i.price,
      })),
      num_items: data.items.reduce((sum, i) => sum + i.quantity, 0),
    },
  };

  await sendToAllPixels([event]);
}

/**
 * Track a product view event.
 */
export async function trackProductView(
  data: ProductViewData,
  context: TrackingContext,
): Promise<void> {
  const event: MetaConversionEvent = {
    ...buildBaseEvent("ViewContent", context),
    custom_data: {
      value: data.value,
      currency: data.currency,
      content_ids: [data.productId],
      content_type: "product",
    },
  };

  await sendToAllPixels([event]);
}

/**
 * Track an add-to-cart event.
 */
export async function trackAddToCart(
  data: CartData,
  context: TrackingContext,
): Promise<void> {
  const event: MetaConversionEvent = {
    ...buildBaseEvent("AddToCart", context),
    custom_data: {
      value: data.value,
      currency: data.currency,
      content_ids: [data.productId],
      content_type: "product",
      contents: [{ id: data.productId, quantity: data.quantity }],
    },
  };

  await sendToAllPixels([event]);
}

/**
 * Track checkout initiation.
 */
export async function trackInitiateCheckout(
  value: number,
  currency: string,
  items: { id: string; quantity: number }[],
  context: TrackingContext,
): Promise<void> {
  const event: MetaConversionEvent = {
    ...buildBaseEvent("InitiateCheckout", context),
    custom_data: {
      value,
      currency,
      content_ids: items.map((i) => i.id),
      content_type: "product",
      contents: items.map((i) => ({ id: i.id, quantity: i.quantity })),
      num_items: items.reduce((sum, i) => sum + i.quantity, 0),
    },
  };

  await sendToAllPixels([event]);
}

/**
 * Track a search event.
 */
export async function trackSearch(
  data: SearchData,
  context: TrackingContext,
): Promise<void> {
  const event: MetaConversionEvent = {
    ...buildBaseEvent("Search", context),
    custom_data: {
      search_string: data.query,
    },
  };

  await sendToAllPixels([event]);
}

/**
 * Track a page view.
 */
export async function trackPageView(context: TrackingContext): Promise<void> {
  const event: MetaConversionEvent = {
    ...buildBaseEvent("PageView", context),
  };

  await sendToAllPixels([event]);
}

// ─── Internal ────────────────────────────────────────────────

/**
 * Send events to all active channels that have a Pixel ID configured.
 */
async function sendToAllPixels(events: MetaConversionEvent[]): Promise<void> {
  const activeChannels = await db.query.salesChannels.findMany({
    where: eq(salesChannels.status, "ACTIVE"),
  });

  const pixelChannels = activeChannels.filter((ch) => ch.pixelId);
  if (pixelChannels.length === 0) return;

  await Promise.allSettled(
    pixelChannels.map(async (channel) => {
      let credentials: MetaCredentials;
      try {
        credentials = JSON.parse(channel.credentials || "{}");
      } catch { return; }
      if (!credentials.accessToken || !channel.pixelId) return;

      await sendConversionEvents(channel.pixelId, events, credentials.accessToken);
    }),
  );
}

// ─── Helper: Extract Tracking Context from Request ───────────

export function extractTrackingContext(req: Request, userId?: string): TrackingContext {
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [key, ...val] = c.trim().split("=");
      return [key, val.join("=")];
    }),
  );

  return {
    ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
               req.headers.get("x-real-ip") || undefined,
    userAgent: req.headers.get("user-agent") || undefined,
    fbc: cookies["_fbc"] || undefined,
    fbp: cookies["_fbp"] || undefined,
    userId,
    sourceUrl: req.headers.get("referer") || undefined,
  };
}
