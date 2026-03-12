/**
 * WhatsApp Business API Client
 *
 * Centralized service for all WhatsApp Business Platform API interactions.
 * Uses the Meta Graph API / WhatsApp Cloud API.
 *
 * Handles: Token management, Catalog operations, Messaging, Webhook verification.
 *
 * WhatsApp Business API docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 * WhatsApp Commerce docs: https://developers.facebook.com/docs/whatsapp/product-catalog
 */

import { env } from "@/lib/env";
import crypto from "crypto";

// ─── Constants ───────────────────────────────────────────────

const API_BASE = "https://graph.facebook.com";
const apiVersion = () => env.META_API_VERSION || "v21.0";
const apiUrl = (path: string) => `${API_BASE}/${apiVersion()}/${path}`;

// ─── Types ───────────────────────────────────────────────────

export interface WhatsAppCredentials {
  accessToken: string;
  phoneNumberId: string;
  wabaId: string; // WhatsApp Business Account ID
}

export interface WhatsAppCatalogItem {
  retailer_id: string; // Your product SKU or ID
  name: string;
  description: string;
  availability: "in stock" | "out of stock";
  price: number; // Price in minor units (cents/halalas)
  currency: string; // ISO 4217 (e.g. "SAR")
  sale_price?: number;
  sale_price_currency?: string;
  url: string;
  image_url: string;
  brand?: string;
  category?: string;
  condition?: "new" | "refurbished" | "used";
  content_id?: string;
  origin_country?: string;
}

export interface WhatsAppProductSet {
  id: string;
  name: string;
  filter?: string;
  product_count?: number;
}

export interface WhatsAppBusinessProfile {
  about?: string;
  address?: string;
  description?: string;
  email?: string;
  profile_picture_url?: string;
  websites?: string[];
  vertical?: string;
}

export interface WhatsAppPhoneNumber {
  id: string;
  display_phone_number: string;
  verified_name: string;
  quality_rating: string;
  status: string;
}

export interface WhatsAppMessageResponse {
  messaging_product: "whatsapp";
  contacts: { input: string; wa_id: string }[];
  messages: { id: string }[];
}

export interface WhatsAppWebhookPayload {
  object: "whatsapp_business_account";
  entry: {
    id: string;
    changes: {
      value: {
        messaging_product: "whatsapp";
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: { profile: { name: string }; wa_id: string }[];
        messages?: WhatsAppIncomingMessage[];
        statuses?: WhatsAppMessageStatus[];
      };
      field: "messages";
    }[];
  }[];
}

export interface WhatsAppIncomingMessage {
  from: string; // sender phone number
  id: string;
  timestamp: string;
  type: "text" | "image" | "order" | "interactive" | "button" | "document";
  text?: { body: string };
  order?: {
    catalog_id: string;
    product_items: {
      product_retailer_id: string;
      quantity: number;
      item_price: number;
      currency: string;
    }[];
    text?: string;
  };
  interactive?: {
    type: string;
    list_reply?: { id: string; title: string; description?: string };
    button_reply?: { id: string; title: string };
    nfm_reply?: { response_json: string; body?: string; name?: string };
  };
}

export interface WhatsAppMessageStatus {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  errors?: { code: number; title: string; message?: string; href?: string }[];
}

// ─── Token Helper ────────────────────────────────────────────

/**
 * Get the access token for WhatsApp API calls.
 * WhatsApp uses permanent System User tokens (no refresh flow).
 * Falls back to the env variable if not stored in channel credentials.
 */
export function getAccessToken(credentials?: WhatsAppCredentials): string {
  if (credentials?.accessToken) return credentials.accessToken;
  if (env.WHATSAPP_ACCESS_TOKEN) return env.WHATSAPP_ACCESS_TOKEN;
  throw new Error("WhatsApp access token not configured");
}

// ─── Webhook Verification ────────────────────────────────────

/**
 * Verify a webhook subscription challenge from Meta.
 * Returns the challenge string if valid, null if invalid.
 */
export function verifyWebhook(
  mode: string | null,
  token: string | null,
  challenge: string | null,
): string | null {
  const verifyToken = env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (!verifyToken) return null;
  if (mode === "subscribe" && token === verifyToken && challenge) {
    return challenge;
  }
  return null;
}

/**
 * Validate webhook payload signature (HMAC SHA-256).
 */
export function validateWebhookSignature(
  rawBody: string,
  signature: string | null,
): boolean {
  if (!signature || !env.META_APP_SECRET) return false;
  if (!signature.startsWith("sha256=")) return false;
  const expectedSig = crypto
    .createHmac("sha256", env.META_APP_SECRET)
    .update(rawBody)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(`sha256=${expectedSig}`),
      Buffer.from(signature),
    );
  } catch {
    return false;
  }
}

// ─── Business Profile ────────────────────────────────────────

/**
 * Get the WhatsApp Business Profile for a phone number.
 */
export async function getBusinessProfile(
  phoneNumberId: string,
  accessToken: string,
): Promise<WhatsAppBusinessProfile> {
  const res = await fetch(
    apiUrl(`${phoneNumberId}/whatsapp_business_profile?fields=about,address,description,email,profile_picture_url,websites,vertical`),
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to get business profile: ${JSON.stringify(err)}`);
  }
  const data = await res.json();
  return data.data?.[0] || {};
}

/**
 * Get WhatsApp phone numbers for a business account.
 */
export async function getPhoneNumbers(
  wabaId: string,
  accessToken: string,
): Promise<WhatsAppPhoneNumber[]> {
  const res = await fetch(
    apiUrl(`${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,status`),
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to get phone numbers: ${JSON.stringify(err)}`);
  }
  const data = await res.json();
  return data.data || [];
}

// ─── Catalog Management (via Commerce API) ───────────────────

/**
 * Get catalogs connected to a WhatsApp Business Account.
 */
export async function getCatalogs(
  wabaId: string,
  accessToken: string,
): Promise<{ id: string; name: string; product_count?: number }[]> {
  const res = await fetch(
    apiUrl(`${wabaId}/product_catalogs?fields=id,name,product_count`),
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to get catalogs: ${JSON.stringify(err)}`);
  }
  const data = await res.json();
  return data.data || [];
}

/**
 * Get product sets within a catalog.
 */
export async function getProductSets(
  catalogId: string,
  accessToken: string,
): Promise<WhatsAppProductSet[]> {
  const res = await fetch(
    apiUrl(`${catalogId}/product_sets?fields=id,name,filter,product_count`),
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to get product sets: ${JSON.stringify(err)}`);
  }
  const data = await res.json();
  return data.data || [];
}

/**
 * Create a product set within a catalog.
 */
export async function createProductSet(
  catalogId: string,
  name: string,
  accessToken: string,
  filter?: string,
): Promise<{ id: string }> {
  const body: Record<string, string> = { name };
  if (filter) body.filter = filter;

  const res = await fetch(apiUrl(`${catalogId}/product_sets`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to create product set: ${JSON.stringify(err)}`);
  }
  return res.json();
}

/**
 * Add/update a product in a Meta Commerce catalog (used by WhatsApp Commerce).
 * Uses the batch API for efficiency.
 */
export async function upsertCatalogProducts(
  catalogId: string,
  items: WhatsAppCatalogItem[],
  accessToken: string,
): Promise<{ handles: string[] }> {
  // Meta Commerce Catalog batch API
  const requests = items.map((item) => ({
    method: "UPDATE",
    retailer_id: item.retailer_id,
    data: {
      name: item.name,
      description: item.description,
      availability: item.availability,
      price: item.price,
      currency: item.currency,
      sale_price: item.sale_price,
      sale_price_currency: item.sale_price_currency,
      url: item.url,
      image_url: item.image_url,
      brand: item.brand,
      category: item.category,
      condition: item.condition || "new",
      origin_country: item.origin_country,
    },
  }));

  const res = await fetch(apiUrl(`${catalogId}/batch`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      allow_upsert: true,
      requests,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Catalog batch upsert failed: ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  return { handles: data.handles || [] };
}

/**
 * Delete products from a catalog by retailer IDs.
 */
export async function deleteCatalogProducts(
  catalogId: string,
  retailerIds: string[],
  accessToken: string,
): Promise<void> {
  const requests = retailerIds.map((id) => ({
    method: "DELETE",
    retailer_id: id,
  }));

  const res = await fetch(apiUrl(`${catalogId}/batch`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ requests }),
  });

  // 404 means already deleted — not an error
  if (!res.ok && res.status !== 404) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Catalog batch delete failed: ${JSON.stringify(err)}`);
  }
}

/**
 * Get products from a catalog with pagination.
 */
export async function getCatalogProducts(
  catalogId: string,
  accessToken: string,
  limit = 100,
  after?: string,
): Promise<{
  products: { id: string; retailer_id: string; name: string; availability: string; price: string; image_url: string }[];
  nextCursor?: string;
}> {
  const params = new URLSearchParams({
    fields: "id,retailer_id,name,availability,price,image_url",
    limit: String(limit),
  });
  if (after) params.set("after", after);

  const res = await fetch(
    apiUrl(`${catalogId}/products?${params}`),
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to get catalog products: ${JSON.stringify(err)}`);
  }
  const data = await res.json();
  return {
    products: data.data || [],
    nextCursor: data.paging?.cursors?.after,
  };
}

// ─── Messaging ───────────────────────────────────────────────

/**
 * Send a text message to a WhatsApp user.
 */
export async function sendTextMessage(
  phoneNumberId: string,
  to: string,
  text: string,
  accessToken: string,
  previewUrl = false,
): Promise<WhatsAppMessageResponse> {
  const res = await fetch(apiUrl(`${phoneNumberId}/messages`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { preview_url: previewUrl, body: text },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to send text message: ${JSON.stringify(err)}`);
  }
  return res.json();
}

/**
 * Send a product message (single product from catalog).
 */
export async function sendProductMessage(
  phoneNumberId: string,
  to: string,
  catalogId: string,
  productRetailerId: string,
  accessToken: string,
  bodyText?: string,
  footerText?: string,
): Promise<WhatsAppMessageResponse> {
  const res = await fetch(apiUrl(`${phoneNumberId}/messages`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "product",
        body: bodyText ? { text: bodyText } : undefined,
        footer: footerText ? { text: footerText } : undefined,
        action: {
          catalog_id: catalogId,
          product_retailer_id: productRetailerId,
        },
      },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to send product message: ${JSON.stringify(err)}`);
  }
  return res.json();
}

/**
 * Send a multi-product message (product list from catalog).
 * Max 30 products, organized in sections.
 */
export async function sendProductListMessage(
  phoneNumberId: string,
  to: string,
  catalogId: string,
  sections: {
    title: string;
    product_items: { product_retailer_id: string }[];
  }[],
  accessToken: string,
  headerText: string,
  bodyText: string,
  footerText?: string,
): Promise<WhatsAppMessageResponse> {
  const res = await fetch(apiUrl(`${phoneNumberId}/messages`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "interactive",
      interactive: {
        type: "product_list",
        header: { type: "text", text: headerText },
        body: { text: bodyText },
        footer: footerText ? { text: footerText } : undefined,
        action: {
          catalog_id: catalogId,
          sections,
        },
      },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to send product list message: ${JSON.stringify(err)}`);
  }
  return res.json();
}

/**
 * Send an order status update template message.
 */
export async function sendOrderStatusMessage(
  phoneNumberId: string,
  to: string,
  templateName: string,
  languageCode: string,
  parameters: { type: "text"; text: string }[],
  accessToken: string,
): Promise<WhatsAppMessageResponse> {
  const res = await fetch(apiUrl(`${phoneNumberId}/messages`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components: [
          {
            type: "body",
            parameters,
          },
        ],
      },
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to send template message: ${JSON.stringify(err)}`);
  }
  return res.json();
}

/**
 * Mark a message as read.
 */
export async function markMessageAsRead(
  phoneNumberId: string,
  messageId: string,
  accessToken: string,
): Promise<void> {
  await fetch(apiUrl(`${phoneNumberId}/messages`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    }),
  });
}

// ─── Price Helper ────────────────────────────────────────────

/**
 * Convert a decimal price string to minor units (cents/halalas).
 * "10.50" → 1050
 */
export function priceToMinorUnits(price: string, currency = "SAR"): number {
  // Most currencies use 2 decimal places
  const factor = currency === "KWD" || currency === "BHD" || currency === "OMR" ? 1000 : 100;
  return Math.round(parseFloat(price) * factor);
}

/**
 * Format price for WhatsApp catalog (minor units as integer).
 */
export function formatWhatsAppPrice(price: string, currency = "SAR"): number {
  return priceToMinorUnits(price, currency);
}
