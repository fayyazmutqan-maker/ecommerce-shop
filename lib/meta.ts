/**
 * Meta Commerce API Client
 *
 * Centralized service for all Facebook/Instagram Commerce Platform API interactions.
 * Handles: OAuth, Catalog Sync, Order Management, Fulfillments, Conversions API.
 *
 * Meta API docs: https://developers.facebook.com/docs/commerce-platform/
 */

import { env } from "@/lib/env";
import crypto from "crypto";

// ─── Constants ───────────────────────────────────────────────

const API_BASE = "https://graph.facebook.com";
const apiVersion = () => env.META_API_VERSION || "v21.0";
const apiUrl = (path: string) => `${API_BASE}/${apiVersion()}/${path}`;

// ─── Types ───────────────────────────────────────────────────

export interface MetaCredentials {
  accessToken: string;
  pageAccessToken?: string;
  expiresAt?: string; // ISO date
}

export interface MetaCatalogItem {
  id?: string; // retailer_id (your product ID)
  title: string;
  description: string;
  availability: "in stock" | "out of stock" | "available for order";
  condition: "new" | "refurbished" | "used";
  price: string; // "1000 SAR" format
  sale_price?: string;
  link: string;
  image_link: string;
  additional_image_link?: string[];
  brand?: string;
  google_product_category?: string;
  item_group_id?: string; // groups variants together
  size?: string;
  color?: string;
  inventory?: number;
  custom_label_0?: string;
}

export interface MetaOrderWebhookPayload {
  object: string;
  entry: {
    id: string;
    time: number;
    changes: {
      field: string;
      value: {
        id: string;
        buyer_details?: {
          name: string;
          email: string;
          phone?: string;
        };
        shipping_address?: {
          street1: string;
          street2?: string;
          city: string;
          state: string;
          postal_code: string;
          country: string;
          name: string;
        };
        items?: {
          retailer_id: string;
          product_id: string;
          quantity: number;
          price_per_unit: { amount: string; currency: string };
          tax: { amount: string; currency: string };
        }[];
        order_status?: {
          state: string; // CREATED | FB_PROCESSING | IN_PROGRESS | COMPLETED | CANCELLED
        };
        created: string;
        estimated_payment_details?: {
          subtotal: { amount: string; currency: string };
          tax?: { amount: string; currency: string };
          total: { amount: string; currency: string };
          shipping?: { amount: string; currency: string };
        };
      };
    }[];
  }[];
}

export interface MetaConversionEvent {
  event_name: "PageView" | "ViewContent" | "AddToCart" | "InitiateCheckout" | "Purchase" | "Search";
  event_time: number;
  event_id: string;
  event_source_url?: string;
  action_source: "website";
  user_data: {
    em?: string[]; // SHA-256 hashed emails
    ph?: string[]; // SHA-256 hashed phones
    client_ip_address?: string;
    client_user_agent?: string;
    fbc?: string; // click ID cookie
    fbp?: string; // browser ID cookie
    external_id?: string[];
  };
  custom_data?: {
    value?: number;
    currency?: string;
    content_ids?: string[];
    content_type?: string;
    contents?: { id: string; quantity: number; item_price?: number }[];
    num_items?: number;
    search_string?: string;
  };
}

// ─── OAuth ───────────────────────────────────────────────────

export function getOAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: env.META_APP_ID || "",
    redirect_uri: redirectUri,
    state,
    scope: "catalog_management,commerce_manage_accounts,pages_read_engagement,pages_show_list,business_management",
    response_type: "code",
  });
  return `https://www.facebook.com/${apiVersion()}/dialog/oauth?${params}`;
}

export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  const params = new URLSearchParams({
    client_id: env.META_APP_ID || "",
    client_secret: env.META_APP_SECRET || "",
    redirect_uri: redirectUri,
    code,
  });

  const tokenRes = await fetch(`${apiUrl("oauth/access_token")}?${params}`);
  if (!tokenRes.ok) {
    const err = await tokenRes.json().catch(() => ({}));
    throw new Error(`Meta token exchange failed: ${JSON.stringify(err)}`);
  }

  const data = await tokenRes.json();
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in || 5184000, // default 60 days
  };
}

export async function getLongLivedToken(shortLivedToken: string): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: env.META_APP_ID || "",
    client_secret: env.META_APP_SECRET || "",
    fb_exchange_token: shortLivedToken,
  });

  const res = await fetch(`${apiUrl("oauth/access_token")}?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Long-lived token exchange failed: ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in || 5184000,
  };
}

export async function getPageAccessToken(userAccessToken: string, pageId: string): Promise<string> {
  const res = await fetch(apiUrl(`${pageId}?fields=access_token&access_token=${userAccessToken}`));
  if (!res.ok) throw new Error("Failed to get page access token");
  const data = await res.json();
  return data.access_token;
}

// ─── Account & Page Discovery ────────────────────────────────

export async function getPages(accessToken: string): Promise<{ id: string; name: string; category: string }[]> {
  const res = await fetch(apiUrl(`me/accounts?fields=id,name,category&access_token=${accessToken}`));
  if (!res.ok) throw new Error("Failed to fetch pages");
  const data = await res.json();
  return data.data || [];
}

export async function getBusinessAccounts(accessToken: string): Promise<{ id: string; name: string }[]> {
  const res = await fetch(apiUrl(`me/businesses?fields=id,name&access_token=${accessToken}`));
  if (!res.ok) throw new Error("Failed to fetch business accounts");
  const data = await res.json();
  return data.data || [];
}

export async function getInstagramAccounts(pageId: string, accessToken: string): Promise<{ id: string; name: string; username: string }[]> {
  const res = await fetch(apiUrl(`${pageId}?fields=instagram_business_account{id,name,username}&access_token=${accessToken}`));
  if (!res.ok) throw new Error("Failed to fetch Instagram business accounts");
  const data = await res.json();
  const ig = data.instagram_business_account;
  return ig ? [ig] : [];
}

// ─── Catalog Management ──────────────────────────────────────

export async function createCatalog(
  businessId: string,
  name: string,
  accessToken: string,
): Promise<string> {
  const res = await fetch(apiUrl(`${businessId}/owned_product_catalogs`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      vertical: "commerce",
      access_token: accessToken,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Create catalog failed: ${JSON.stringify(err)}`);
  }
  const data = await res.json();
  return data.id;
}

export async function getCatalogs(businessId: string, accessToken: string): Promise<{ id: string; name: string; product_count: number }[]> {
  const res = await fetch(apiUrl(`${businessId}/owned_product_catalogs?fields=id,name,product_count&access_token=${accessToken}`));
  if (!res.ok) throw new Error("Failed to fetch catalogs");
  const data = await res.json();
  return data.data || [];
}

/**
 * Batch upsert products to a Meta catalog.
 * Uses the Batch API: POST /{catalog_id}/items_batch
 * Max 5000 items per batch.
 */
export async function syncProductsBatch(
  catalogId: string,
  items: MetaCatalogItem[],
  accessToken: string,
): Promise<{ handles: string[] }> {
  // Meta batch API accepts max 5000 items per request
  const BATCH_SIZE = 4999;
  const handles: string[] = [];

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const requests = batch.map((item) => ({
      method: "UPDATE",
      retailer_id: item.id,
      data: item,
    }));

    const res = await fetch(apiUrl(`${catalogId}/items_batch`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: accessToken,
        requests,
        item_type: "PRODUCT_ITEM",
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Catalog batch sync failed: ${JSON.stringify(err)}`);
    }

    const data = await res.json();
    if (data.handles) handles.push(...data.handles);
  }

  return { handles };
}

/**
 * Delete products from a Meta catalog by retailer IDs.
 */
export async function deleteProductsBatch(
  catalogId: string,
  retailerIds: string[],
  accessToken: string,
): Promise<void> {
  const requests = retailerIds.map((id) => ({
    method: "DELETE",
    retailer_id: id,
  }));

  const res = await fetch(apiUrl(`${catalogId}/items_batch`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token: accessToken,
      requests,
      item_type: "PRODUCT_ITEM",
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Catalog batch delete failed: ${JSON.stringify(err)}`);
  }
}

/**
 * Check batch upload status.
 */
export async function getBatchStatus(
  catalogId: string,
  handle: string,
  accessToken: string,
): Promise<{ status: string; num_received: number; num_sent: number; errors: unknown[] }> {
  const res = await fetch(apiUrl(`${catalogId}/check_batch_request_status?handle=${handle}&access_token=${accessToken}`));
  if (!res.ok) throw new Error("Failed to check batch status");
  const data = await res.json();
  return data.data?.[0] || data;
}

// ─── Order Management ────────────────────────────────────────

export async function getCommerceOrders(
  pageId: string,
  accessToken: string,
  state?: string,
): Promise<unknown[]> {
  const params = new URLSearchParams({
    access_token: accessToken,
    fields: "id,order_status,created,buyer_details,items,shipping_address,estimated_payment_details",
  });
  if (state) params.set("state", state);

  const res = await fetch(apiUrl(`${pageId}/commerce_orders?${params}`));
  if (!res.ok) throw new Error("Failed to fetch commerce orders");
  const data = await res.json();
  return data.data || [];
}

export async function acknowledgeOrder(orderId: string, accessToken: string): Promise<void> {
  const res = await fetch(apiUrl(`${orderId}/acknowledge_order`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_token: accessToken }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Acknowledge order failed: ${JSON.stringify(err)}`);
  }
}

export async function fulfillOrder(
  orderId: string,
  trackingInfo: { carrier: string; tracking_number: string; shipping_method_name?: string },
  items: { retailer_id: string; quantity: number }[],
  accessToken: string,
): Promise<void> {
  const res = await fetch(apiUrl(`${orderId}/shipments`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token: accessToken,
      tracking_info: trackingInfo,
      items,
      external_shipment_id: `ship_${orderId}_${Date.now()}`,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Fulfill order failed: ${JSON.stringify(err)}`);
  }
}

export async function cancelOrder(
  orderId: string,
  reason: string,
  items: { retailer_id: string; quantity: number }[],
  accessToken: string,
): Promise<void> {
  const res = await fetch(apiUrl(`${orderId}/cancellations`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token: accessToken,
      cancel_reason: { reason_code: reason },
      items,
      idempotency_key: `cancel_${orderId}_${Date.now()}`,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Cancel order failed: ${JSON.stringify(err)}`);
  }
}

export async function refundOrder(
  orderId: string,
  items: { retailer_id: string; quantity: number }[],
  reason: string,
  accessToken: string,
): Promise<void> {
  const res = await fetch(apiUrl(`${orderId}/refunds`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token: accessToken,
      reason_code: reason,
      items,
      idempotency_key: `refund_${orderId}_${Date.now()}`,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Refund order failed: ${JSON.stringify(err)}`);
  }
}

// ─── Conversions API ─────────────────────────────────────────

/**
 * Send server-side events to Meta Conversions API.
 * https://developers.facebook.com/docs/marketing-api/conversions-api/
 */
export async function sendConversionEvents(
  pixelId: string,
  events: MetaConversionEvent[],
  accessToken: string,
): Promise<{ events_received: number; fbtrace_id: string }> {
  const res = await fetch(apiUrl(`${pixelId}/events`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: events,
      access_token: accessToken,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Conversions API error: ${JSON.stringify(err)}`);
  }

  return res.json();
}

// ─── Webhook Verification ────────────────────────────────────

/**
 * Verify Facebook webhook signature (X-Hub-Signature-256 header).
 * Uses HMAC-SHA256 with the app secret.
 */
export function verifyWebhookSignature(rawBody: string | Buffer, signature: string): boolean {
  if (!env.META_APP_SECRET) return false;
  const expected = "sha256=" + crypto
    .createHmac("sha256", env.META_APP_SECRET)
    .update(rawBody)
    .digest("hex");

  // Constant-time comparison to prevent timing attacks
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

/**
 * Verify webhook subscription (GET challenge).
 */
export function verifyWebhookSubscription(
  mode: string | null,
  token: string | null,
  challenge: string | null,
): string | null {
  if (mode === "subscribe" && token === env.META_WEBHOOK_VERIFY_TOKEN) {
    return challenge;
  }
  return null;
}

// ─── Helpers ─────────────────────────────────────────────────

/**
 * SHA-256 hash for PII data (emails, phones) as required by Meta.
 */
export function hashPII(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

/**
 * Format price for Meta catalog: "1000.00 SAR"
 */
export function formatMetaPrice(amount: number | string, currency = "SAR"): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `${(num * 100).toFixed(0)} ${currency}`;
}

/**
 * Parse Meta price "100000 SAR" back to decimal.
 * Meta stores prices in cents (minor units).
 */
export function parseMetaPrice(metaPrice: string): number {
  const match = metaPrice.match(/^(\d+)/);
  if (!match) return 0;
  return parseInt(match[1], 10) / 100;
}
