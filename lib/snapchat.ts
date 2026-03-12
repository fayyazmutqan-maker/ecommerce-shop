/**
 * Snapchat Marketing API Client
 *
 * Centralized service for all Snapchat Marketing API interactions.
 * Uses Snapchat Marketing API v1 with OAuth2 authorization code flow.
 *
 * Handles: OAuth, Catalog Management, Product Sync, Webhook/Alerts.
 *
 * Snapchat Marketing API docs: https://marketingapi.snapchat.com/docs/
 * Catalogs docs: https://marketingapi.snapchat.com/docs/#catalogs
 */

import { env } from "@/lib/env";
import crypto from "crypto";

// ─── Constants ───────────────────────────────────────────────

const API_BASE = "https://adsapi.snapchat.com/v1";
const AUTH_URL = "https://accounts.snapchat.com/login/oauth2/authorize";
const TOKEN_URL = "https://accounts.snapchat.com/login/oauth2/access_token";

// ─── Types ───────────────────────────────────────────────────

export interface SnapchatCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: string; // ISO date string
}

export interface SnapchatOrganization {
  id: string;
  name: string;
  country?: string;
  type?: string;
}

export interface SnapchatAdAccount {
  id: string;
  name: string;
  type: string;
  status: string;
  organization_id: string;
  currency: string;
  timezone: string;
}

export interface SnapchatCatalog {
  id: string;
  name: string;
  organization_id: string;
  event_sources?: { id: string }[];
  default_product_feed_id?: string;
}

export interface SnapchatProductFeed {
  id: string;
  name: string;
  catalog_id: string;
  status: string;
  schedule?: {
    url: string;
    interval: string;
  };
}

export interface SnapchatProductItem {
  id: string;
  product_set_id: string;
  catalog_id: string;
  retailer_id: string; // Your internal product ID
  title: string;
  description: string;
  link: string;
  image_url: string;
  price: string; // e.g. "19.99 USD"
  availability: string; // in stock | out of stock
  condition?: string;
  brand?: string;
  gtin?: string;
  mpn?: string;
  google_product_category?: string;
  custom_label_0?: string;
  custom_label_1?: string;
}

export interface SnapchatProductSet {
  id: string;
  catalog_id: string;
  name: string;
  filter?: Record<string, unknown>;
}

// ─── OAuth ───────────────────────────────────────────────────

/**
 * Generate the Snapchat OAuth2 authorization URL.
 */
export function getOAuthUrl(redirectUri: string, state: string): string {
  const clientId = env.SNAPCHAT_CLIENT_ID;
  if (!clientId) throw new Error("SNAPCHAT_CLIENT_ID not configured");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "snapchat-marketing-api",
    state,
  });
  return `${AUTH_URL}?${params}`;
}

/**
 * Exchange authorization code for access + refresh tokens.
 */
export async function exchangeCode(authCode: string, redirectUri: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const clientId = env.SNAPCHAT_CLIENT_ID;
  const clientSecret = env.SNAPCHAT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Snapchat API credentials not configured");
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: authCode,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    throw new Error(`Snapchat token exchange failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in || 1800, // default 30 minutes
  };
}

/**
 * Refresh access token using refresh token.
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const clientId = env.SNAPCHAT_CLIENT_ID;
  const clientSecret = env.SNAPCHAT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Snapchat API credentials not configured");
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "Unknown error");
    throw new Error(`Snapchat token refresh failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresIn: data.expires_in || 1800,
  };
}

// ─── Token Management ────────────────────────────────────────

/**
 * Get a valid token, refreshing if within 5-minute buffer of expiry.
 */
export async function getValidToken(
  credentials: SnapchatCredentials,
): Promise<{ accessToken: string; refreshed: boolean; credentials: SnapchatCredentials }> {
  const expiresAt = new Date(credentials.expiresAt).getTime();
  const fiveMinBuffer = 5 * 60 * 1000;

  if (Date.now() < expiresAt - fiveMinBuffer) {
    return { accessToken: credentials.accessToken, refreshed: false, credentials };
  }

  const refreshed = await refreshAccessToken(credentials.refreshToken);
  const newCredentials: SnapchatCredentials = {
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
    expiresAt: new Date(Date.now() + refreshed.expiresIn * 1000).toISOString(),
  };

  return { accessToken: refreshed.accessToken, refreshed: true, credentials: newCredentials };
}

/**
 * Persist refreshed credentials back to the channel record.
 */
export async function updateChannelCredentials(
  channelId: string,
  credentials: SnapchatCredentials,
): Promise<void> {
  // Lazy import to avoid circular dependency
  const { db } = await import("@/lib/db");
  const { salesChannels } = await import("@/lib/schema");
  const { eq } = await import("drizzle-orm");

  await db.update(salesChannels)
    .set({ credentials: JSON.stringify(credentials) })
    .where(eq(salesChannels.id, channelId));
}

/**
 * Combined helper: get valid token + persist if refreshed.
 */
export async function getChannelToken(
  channelId: string,
  credentials: SnapchatCredentials,
): Promise<string> {
  const result = await getValidToken(credentials);
  if (result.refreshed) {
    await updateChannelCredentials(channelId, result.credentials);
  }
  return result.accessToken;
}

// ─── API Request Helper ──────────────────────────────────────

async function snapchatRequest<T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  accessToken: string,
  body?: unknown,
): Promise<T> {
  const url = `${API_BASE}${path}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };

  const init: RequestInit = { method, headers };

  if (body && (method === "POST" || method === "PUT")) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  const res = await fetch(url, init);

  if (!res.ok) {
    const errBody = await res.text().catch(() => "Unknown error");
    throw new Error(`Snapchat API ${method} ${path} failed (${res.status}): ${errBody}`);
  }

  if (res.status === 204) return {} as T;

  return res.json() as Promise<T>;
}

// ─── Organization & Ad Accounts ──────────────────────────────

/**
 * Get all organizations the authenticated user belongs to.
 */
export async function getOrganizations(
  accessToken: string,
): Promise<SnapchatOrganization[]> {
  const data = await snapchatRequest<{
    organizations: { organization: SnapchatOrganization }[];
  }>("GET", "/me/organizations", accessToken);

  return (data.organizations || []).map((o) => o.organization);
}

/**
 * Get ad accounts for an organization.
 */
export async function getAdAccounts(
  accessToken: string,
  organizationId: string,
): Promise<SnapchatAdAccount[]> {
  const data = await snapchatRequest<{
    adaccounts: { adaccount: SnapchatAdAccount }[];
  }>("GET", `/organizations/${organizationId}/adaccounts`, accessToken);

  return (data.adaccounts || []).map((a) => a.adaccount);
}

// ─── Catalogs ────────────────────────────────────────────────

/**
 * List catalogs for an organization.
 */
export async function getCatalogs(
  accessToken: string,
  organizationId: string,
): Promise<SnapchatCatalog[]> {
  const data = await snapchatRequest<{
    catalogs: { catalog: SnapchatCatalog }[];
  }>("GET", `/organizations/${organizationId}/catalogs`, accessToken);

  return (data.catalogs || []).map((c) => c.catalog);
}

/**
 * Create a new catalog.
 */
export async function createCatalog(
  accessToken: string,
  organizationId: string,
  name: string,
): Promise<SnapchatCatalog> {
  const data = await snapchatRequest<{
    catalogs: { catalog: SnapchatCatalog }[];
  }>("POST", `/organizations/${organizationId}/catalogs`, accessToken, {
    catalogs: [{ name }],
  });

  return data.catalogs[0].catalog;
}

// ─── Product Feeds ───────────────────────────────────────────

/**
 * List product feeds for a catalog.
 */
export async function getProductFeeds(
  accessToken: string,
  catalogId: string,
): Promise<SnapchatProductFeed[]> {
  const data = await snapchatRequest<{
    product_feeds: { product_feed: SnapchatProductFeed }[];
  }>("GET", `/catalogs/${catalogId}/product_feeds`, accessToken);

  return (data.product_feeds || []).map((f) => f.product_feed);
}

/**
 * Create a product feed for a catalog.
 */
export async function createProductFeed(
  accessToken: string,
  catalogId: string,
  name: string,
): Promise<SnapchatProductFeed> {
  const data = await snapchatRequest<{
    product_feeds: { product_feed: SnapchatProductFeed }[];
  }>("POST", `/catalogs/${catalogId}/product_feeds`, accessToken, {
    product_feeds: [
      {
        catalog_id: catalogId,
        name,
        default_currency: "SAR",
      },
    ],
  });

  return data.product_feeds[0].product_feed;
}

// ─── Product Items (Batch Sync) ──────────────────────────────

/**
 * Batch upsert product items into a product feed.
 * Snapchat supports batch operations on product items.
 * Items are identified by retailer_id (your internal product ID/SKU).
 */
export async function batchUpsertProducts(
  accessToken: string,
  catalogId: string,
  items: SnapchatProductItemPayload[],
): Promise<{ success_count: number; error_count: number; errors: string[] }> {
  if (items.length === 0) return { success_count: 0, error_count: 0, errors: [] };

  // Snapchat batch limit is 10,000 items per request
  const BATCH_SIZE = 5000;
  let totalSuccess = 0;
  let totalErrors = 0;
  const allErrors: string[] = [];

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);

    try {
      const data = await snapchatRequest<{
        product_items?: { product_item: { retailer_id: string; status?: string } }[];
        errors?: { message: string }[];
      }>(
        "POST",
        `/catalogs/${catalogId}/product_items/batch`,
        accessToken,
        batch,
      );

      const batchItems = data.product_items || [];
      totalSuccess += batchItems.length;
      totalErrors += batch.length - batchItems.length;
      if (data.errors) {
        allErrors.push(...data.errors.map((e) => e.message));
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Batch upload failed";
      allErrors.push(msg);
      totalErrors += batch.length;
    }
  }

  return { success_count: totalSuccess, error_count: totalErrors, errors: allErrors };
}

/**
 * Delete product items from a catalog by retailer_id.
 */
export async function batchDeleteProducts(
  accessToken: string,
  catalogId: string,
  retailerIds: string[],
): Promise<void> {
  if (retailerIds.length === 0) return;

  await snapchatRequest(
    "DELETE",
    `/catalogs/${catalogId}/product_items/batch`,
    accessToken,
    retailerIds.map((id) => ({ retailer_id: id })),
  );
}

/**
 * Get product items in a catalog with optional filtering.
 */
export async function getProductItems(
  accessToken: string,
  catalogId: string,
  limit = 50,
  cursor?: string,
): Promise<{
  products: SnapchatProductItem[];
  nextCursor?: string;
}> {
  let path = `/catalogs/${catalogId}/product_items?limit=${limit}`;
  if (cursor) path += `&cursor=${encodeURIComponent(cursor)}`;

  const data = await snapchatRequest<{
    product_items?: { product_item: SnapchatProductItem }[];
    paging?: { next_link?: string };
  }>("GET", path, accessToken);

  const products = (data.product_items || []).map((p) => p.product_item);

  // Extract cursor from next_link if present
  let nextCursor: string | undefined;
  if (data.paging?.next_link) {
    try {
      const nextUrl = new URL(data.paging.next_link);
      nextCursor = nextUrl.searchParams.get("cursor") || undefined;
    } catch {
      // Invalid URL — no more pages
    }
  }

  return { products, nextCursor };
}

// ─── Product Sets ────────────────────────────────────────────

/**
 * List product sets for a catalog.
 */
export async function getProductSets(
  accessToken: string,
  catalogId: string,
): Promise<SnapchatProductSet[]> {
  const data = await snapchatRequest<{
    product_sets: { product_set: SnapchatProductSet }[];
  }>("GET", `/catalogs/${catalogId}/product_sets`, accessToken);

  return (data.product_sets || []).map((s) => s.product_set);
}

// ─── Product Item Payload ────────────────────────────────────

export interface SnapchatProductItemPayload {
  retailer_id: string;
  title: string;
  description: string;
  link: string;
  image_url: string;
  price: string; // format: "19.99 SAR"
  availability: "in stock" | "out of stock" | "preorder";
  condition?: "new" | "refurbished" | "used";
  brand?: string;
  gtin?: string;
  mpn?: string;
  google_product_category?: string;
  sale_price?: string;
  custom_label_0?: string;
  custom_label_1?: string;
  additional_image_urls?: string[];
}

// ─── Price Formatter ─────────────────────────────────────────

/**
 * Format a price for Snapchat catalog: "19.99 SAR"
 */
export function formatSnapchatPrice(price: string | number, currency = "SAR"): string {
  const num = typeof price === "string" ? parseFloat(price) : price;
  if (isNaN(num)) return `0.00 ${currency}`;
  return `${num.toFixed(2)} ${currency}`;
}

// ─── Webhook Signature Verification ──────────────────────────

/**
 * Verify Snapchat webhook/callback signature.
 * Snapchat signs payloads with HMAC-SHA256 using the client secret.
 */
export function validateWebhookSignature(
  rawBody: string,
  signature: string | null,
): boolean {
  if (!signature) return false;
  const secret = env.SNAPCHAT_CLIENT_SECRET;
  if (!secret) return false;

  try {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected),
    );
  } catch {
    return false;
  }
}
