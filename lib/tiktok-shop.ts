/**
 * TikTok Shop API Client
 *
 * Centralized service for all TikTok Shop Open API interactions.
 * Uses the TikTok Shop Open API v202309 with OAuth2 + HMAC-SHA256 signing.
 *
 * Handles: OAuth, Product Sync, Order Management, Webhook Verification.
 *
 * TikTok Shop API docs: https://partner.tiktokshop.com/docv2
 * Auth docs: https://partner.tiktokshop.com/docv2/page/6507ead7b99d5302be949ba9
 */

import { env } from "@/lib/env";
import crypto from "crypto";

// ─── Constants ───────────────────────────────────────────────

const API_BASE = "https://open-api.tiktokglobalshop.com";
const AUTH_URL = "https://auth.tiktok-shops.com/oauth/authorize";
const TOKEN_URL = `${API_BASE}/api/v2/token/get`;
const REFRESH_URL = `${API_BASE}/api/v2/token/refresh`;
const API_VERSION = "202309";

// ─── Types ───────────────────────────────────────────────────

export interface TikTokCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: string; // ISO date string
  openId?: string; // Seller's TikTok Shop open ID
}

export interface TikTokShop {
  id: string;
  name: string;
  region: string;
  seller_type?: string;
}

export interface TikTokCategory {
  id: string;
  parent_id: string;
  name: string;
  is_leaf: boolean;
}

export interface TikTokProduct {
  id: string;
  title: string;
  description?: string;
  status: number; // 1=draft, 2=pending, 3=failed, 4=live, 5=seller_deactivated, 6=platform_deactivated, 7=frozen
  create_time?: number;
  update_time?: number;
  skus?: TikTokSku[];
  images?: { id: string; url: string }[];
  category_chains?: { id: string; name: string }[];
}

export interface TikTokSku {
  id: string;
  seller_sku?: string;
  price: { amount: string; currency: string };
  stock_infos?: { warehouse_id: string; available_stock: number }[];
  sales_attributes?: { id: string; name: string; value_id: string; value_name: string }[];
}

export interface TikTokOrder {
  id: string;
  order_number?: string;
  status: string;
  payment_info?: {
    total_amount: string;
    currency: string;
    shipping_fee: string;
    sub_total: string;
  };
  line_items?: {
    id: string;
    product_id: string;
    product_name: string;
    sku_id: string;
    sku_name?: string;
    quantity: number;
    sale_price: string;
  }[];
  buyer_message?: string;
  create_time?: number;
  update_time?: number;
}

export interface TikTokProductCreatePayload {
  title: string;
  description: string;
  category_id: string;
  brand_id?: string;
  images: { uri: string }[]; // TikTok image URIs from upload
  skus: {
    seller_sku?: string;
    price: { amount: string; currency: string };
    stock_infos: { warehouse_id: string; available_stock: number }[];
    sales_attributes?: { id: string; value_id: string }[];
    identifier_code?: { code: string; type?: number };
  }[];
  package_dimensions?: {
    height: string;
    length: string;
    width: string;
    unit: "CENTIMETER" | "INCH";
  };
  package_weight?: {
    value: string;
    unit: "KILOGRAM" | "POUND";
  };
  is_cod_allowed?: boolean;
  delivery_options?: { id: string }[];
  external_product_id?: string;
  product_attributes?: { id: string; values: { id: string }[] }[];
}

export interface TikTokProductUpdatePayload extends Partial<TikTokProductCreatePayload> {
  product_id: string;
}

export interface TikTokImageUploadResult {
  uri: string;
  url: string;
  width: number;
  height: number;
}

export interface TikTokWebhookPayload {
  type: number; // 1=order, 2=reverse_order, 3=product, etc.
  shop_id: string;
  timestamp: number;
  data: Record<string, unknown>;
}

// ─── Request Signing ─────────────────────────────────────────

/**
 * Generate HMAC-SHA256 signature for TikTok Shop API requests.
 *
 * TikTok signing algorithm:
 * 1. Extract path (e.g. "/api/products/search")
 * 2. Sort query params (excluding sign, access_token) alphabetically by key
 * 3. Concatenate: app_secret + path + sorted_key1+sorted_val1 + ... + body + app_secret
 * 4. HMAC-SHA256 hex digest with app_secret
 */
export function generateSignature(
  path: string,
  queryParams: Record<string, string>,
  body: string = "",
): string {
  const appSecret = env.TIKTOK_APP_SECRET;
  if (!appSecret) throw new Error("TIKTOK_APP_SECRET not configured");

  // Filter excluded params and sort
  const excludedKeys = new Set(["sign", "access_token"]);
  const sortedEntries = Object.entries(queryParams)
    .filter(([key]) => !excludedKeys.has(key))
    .sort(([a], [b]) => a.localeCompare(b));

  // Build signing string
  let signString = appSecret + path;
  for (const [key, value] of sortedEntries) {
    signString += key + value;
  }
  signString += body + appSecret;

  return crypto.createHmac("sha256", appSecret).update(signString).digest("hex");
}

/**
 * Validate a webhook payload signature from TikTok Shop.
 * TikTok sends the signature in the `authorization` header.
 * Signing: HMAC-SHA256( app_secret + path + body + app_secret )
 */
export function validateWebhookSignature(
  rawBody: string,
  signature: string | null,
  path: string = "/api/channels/tiktok/webhook",
): boolean {
  if (!signature || !env.TIKTOK_APP_SECRET) return false;
  const appSecret = env.TIKTOK_APP_SECRET;
  const signString = appSecret + path + rawBody + appSecret;
  const expected = crypto.createHmac("sha256", appSecret).update(signString).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

// ─── Signed API Request Helper ───────────────────────────────

/**
 * Make a signed request to TikTok Shop API.
 * Handles signature generation, query param assembly, and error parsing.
 */
async function tiktokRequest<T = unknown>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  options: {
    accessToken?: string;
    shopId?: string;
    query?: Record<string, string>;
    body?: Record<string, unknown>;
  } = {},
): Promise<T> {
  const appKey = env.TIKTOK_APP_KEY;
  if (!appKey) throw new Error("TIKTOK_APP_KEY not configured");

  const queryParams: Record<string, string> = {
    app_key: appKey,
    timestamp: String(Math.floor(Date.now() / 1000)),
    version: API_VERSION,
    ...options.query,
  };

  if (options.shopId) queryParams.shop_id = options.shopId;

  const bodyStr = options.body ? JSON.stringify(options.body) : "";

  // Generate signature
  const sign = generateSignature(path, queryParams, bodyStr);
  queryParams.sign = sign;
  if (options.accessToken) queryParams.access_token = options.accessToken;

  const qs = new URLSearchParams(queryParams).toString();
  const url = `${API_BASE}${path}?${qs}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-tts-access-token": options.accessToken || "",
  };

  const res = await fetch(url, {
    method,
    headers,
    body: method !== "GET" ? bodyStr || undefined : undefined,
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`TikTok API ${method} ${path} failed (${res.status}): ${errBody}`);
  }

  const data = await res.json();

  // TikTok returns { code: 0, message: "Success", data: {...} } on success
  if (data.code !== 0) {
    throw new Error(`TikTok API error: [${data.code}] ${data.message}`);
  }

  return data.data as T;
}

// ─── OAuth ───────────────────────────────────────────────────

/**
 * Generate TikTok Shop OAuth authorization URL.
 * Redirects seller to TikTok login → grants app access → callback with auth_code.
 */
export function getOAuthUrl(redirectUri: string, state: string): string {
  const appKey = env.TIKTOK_APP_KEY;
  if (!appKey) throw new Error("TIKTOK_APP_KEY not configured");

  const params = new URLSearchParams({
    app_key: appKey,
    redirect_uri: redirectUri,
    state,
  });
  return `${AUTH_URL}?${params}`;
}

/**
 * Exchange authorization code for access + refresh tokens.
 */
export async function exchangeCode(authCode: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  openId: string;
  sellerName?: string;
}> {
  const appKey = env.TIKTOK_APP_KEY;
  const appSecret = env.TIKTOK_APP_SECRET;
  if (!appKey || !appSecret) throw new Error("TikTok Shop API credentials not configured");

  const res = await fetch(`${TOKEN_URL}?app_key=${appKey}&app_secret=${appSecret}&auth_code=${authCode}&grant_type=authorized_code`, {
    method: "GET",
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`TikTok token exchange failed: ${errBody}`);
  }

  const json = await res.json();
  if (json.code !== 0) {
    throw new Error(`TikTok token exchange error: [${json.code}] ${json.message}`);
  }

  const d = json.data;
  return {
    accessToken: d.access_token,
    refreshToken: d.refresh_token,
    expiresIn: d.access_token_expire_in, // seconds
    refreshExpiresIn: d.refresh_token_expire_in,
    openId: d.open_id,
    sellerName: d.seller_name,
  };
}

/**
 * Refresh an expired access token.
 * TikTok refresh tokens are long-lived but eventually expire.
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  openId: string;
}> {
  const appKey = env.TIKTOK_APP_KEY;
  const appSecret = env.TIKTOK_APP_SECRET;
  if (!appKey || !appSecret) throw new Error("TikTok Shop API credentials not configured");

  const res = await fetch(
    `${REFRESH_URL}?app_key=${appKey}&app_secret=${appSecret}&refresh_token=${refreshToken}&grant_type=refresh_token`,
    { method: "GET" },
  );

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`TikTok token refresh failed: ${errBody}`);
  }

  const json = await res.json();
  if (json.code !== 0) {
    throw new Error(`TikTok token refresh error: [${json.code}] ${json.message}`);
  }

  const d = json.data;
  return {
    accessToken: d.access_token,
    refreshToken: d.refresh_token,
    expiresIn: d.access_token_expire_in,
    refreshExpiresIn: d.refresh_token_expire_in,
    openId: d.open_id,
  };
}

/**
 * Get a valid access token, refreshing if necessary.
 * Returns updated credentials if a refresh occurred.
 */
export async function getValidToken(
  credentials: TikTokCredentials,
): Promise<{ accessToken: string; updated: boolean; credentials: TikTokCredentials }> {
  const expiresAt = new Date(credentials.expiresAt).getTime();
  const now = Date.now();
  const BUFFER_MS = 5 * 60 * 1000; // refresh 5 min before expiry

  if (expiresAt - now > BUFFER_MS) {
    return { accessToken: credentials.accessToken, updated: false, credentials };
  }

  const result = await refreshAccessToken(credentials.refreshToken);
  const newCredentials: TikTokCredentials = {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresAt: new Date(Date.now() + result.expiresIn * 1000).toISOString(),
    openId: result.openId,
  };

  return { accessToken: result.accessToken, updated: true, credentials: newCredentials };
}

/**
 * Persist refreshed credentials back to the channel record.
 */
export async function updateChannelCredentials(
  channelId: string,
  credentials: TikTokCredentials,
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
 * Helper: get valid token from channel, auto-refreshing and persisting if needed.
 */
export async function getChannelToken(
  channelId: string,
  credentials: TikTokCredentials,
): Promise<string> {
  const result = await getValidToken(credentials);
  if (result.updated) {
    await updateChannelCredentials(channelId, result.credentials);
  }
  return result.accessToken;
}

// ─── Shop Discovery ──────────────────────────────────────────

/**
 * Get authorized shops for the current seller.
 */
export async function getAuthorizedShops(
  accessToken: string,
): Promise<TikTokShop[]> {
  const data = await tiktokRequest<{ shops: TikTokShop[] }>(
    "GET",
    "/api/shop/get_authorized_shop",
    { accessToken },
  );
  return data.shops || [];
}

// ─── Categories ──────────────────────────────────────────────

/**
 * Get product categories for a shop (for product listing rules).
 */
export async function getCategories(
  accessToken: string,
  shopId: string,
  locale: string = "en",
): Promise<TikTokCategory[]> {
  const data = await tiktokRequest<{ categories: TikTokCategory[] }>(
    "GET",
    "/api/products/categories",
    { accessToken, shopId, query: { locale } },
  );
  return data.categories || [];
}

// ─── Product Management ──────────────────────────────────────

/**
 * Search products in a TikTok Shop.
 */
export async function searchProducts(
  accessToken: string,
  shopId: string,
  pageSize: number = 50,
  pageNumber: number = 1,
  status?: number,
): Promise<{ products: TikTokProduct[]; total: number }> {
  const body: Record<string, unknown> = { page_size: pageSize, page_number: pageNumber };
  if (status !== undefined) body.status = status;

  const data = await tiktokRequest<{ products: TikTokProduct[]; total: number }>(
    "POST",
    "/api/products/search",
    { accessToken, shopId, body },
  );
  return { products: data.products || [], total: data.total || 0 };
}

/**
 * Get product details by ID.
 */
export async function getProductDetail(
  accessToken: string,
  shopId: string,
  productId: string,
): Promise<TikTokProduct> {
  return tiktokRequest<TikTokProduct>(
    "GET",
    `/api/products/details`,
    { accessToken, shopId, query: { product_id: productId } },
  );
}

/**
 * Create a product in TikTok Shop.
 */
export async function createProduct(
  accessToken: string,
  shopId: string,
  payload: TikTokProductCreatePayload,
): Promise<{ product_id: string }> {
  return tiktokRequest<{ product_id: string }>(
    "POST",
    "/api/products",
    { accessToken, shopId, body: payload as unknown as Record<string, unknown> },
  );
}

/**
 * Update (edit) an existing product in TikTok Shop.
 */
export async function updateProduct(
  accessToken: string,
  shopId: string,
  payload: TikTokProductUpdatePayload,
): Promise<void> {
  await tiktokRequest(
    "PUT",
    "/api/products",
    { accessToken, shopId, body: payload as unknown as Record<string, unknown> },
  );
}

/**
 * Delete products from TikTok Shop (deactivate).
 * TikTok uses "deactivate" rather than hard delete.
 */
export async function deactivateProducts(
  accessToken: string,
  shopId: string,
  productIds: string[],
): Promise<void> {
  await tiktokRequest(
    "POST",
    "/api/products/deactivate",
    { accessToken, shopId, body: { product_ids: productIds } },
  );
}

/**
 * Activate (re-publish) products in TikTok Shop.
 */
export async function activateProducts(
  accessToken: string,
  shopId: string,
  productIds: string[],
): Promise<void> {
  await tiktokRequest(
    "POST",
    "/api/products/activate",
    { accessToken, shopId, body: { product_ids: productIds } },
  );
}

/**
 * Update product inventory (stock levels).
 */
export async function updateInventory(
  accessToken: string,
  shopId: string,
  productId: string,
  skus: { id: string; stock_infos: { warehouse_id: string; available_stock: number }[] }[],
): Promise<void> {
  await tiktokRequest(
    "PUT",
    "/api/products/stocks",
    { accessToken, shopId, body: { product_id: productId, skus } },
  );
}

/**
 * Update product prices.
 */
export async function updatePrices(
  accessToken: string,
  shopId: string,
  productId: string,
  skus: { id: string; price: { amount: string; currency: string } }[],
): Promise<void> {
  await tiktokRequest(
    "PUT",
    "/api/products/prices",
    { accessToken, shopId, body: { product_id: productId, skus } },
  );
}

// ─── Image Upload ────────────────────────────────────────────

/**
 * Upload a product image to TikTok Shop from a URL.
 * TikTok requires images to be uploaded to their CDN first, returning a URI.
 */
export async function uploadImageByUrl(
  accessToken: string,
  shopId: string,
  imageUrl: string,
): Promise<TikTokImageUploadResult> {
  return tiktokRequest<TikTokImageUploadResult>(
    "POST",
    "/api/products/upload_imgs",
    { accessToken, shopId, body: { img_url: imageUrl } },
  );
}

// ─── Orders ──────────────────────────────────────────────────

/**
 * Get order list for a shop.
 */
export async function getOrders(
  accessToken: string,
  shopId: string,
  pageSize: number = 50,
  cursor: string = "",
  sortBy: string = "CREATE_TIME",
  sortOrder: number = 2, // 1=asc, 2=desc
): Promise<{ orders: TikTokOrder[]; next_cursor: string; total: number }> {
  const body: Record<string, unknown> = {
    page_size: pageSize,
    sort_by: sortBy,
    sort_type: sortOrder,
  };
  if (cursor) body.cursor = cursor;

  return tiktokRequest<{ orders: TikTokOrder[]; next_cursor: string; total: number }>(
    "POST",
    "/api/orders/search",
    { accessToken, shopId, body },
  );
}

/**
 * Get order details by ID(s).
 */
export async function getOrderDetail(
  accessToken: string,
  shopId: string,
  orderIds: string[],
): Promise<TikTokOrder[]> {
  const data = await tiktokRequest<{ orders: TikTokOrder[] }>(
    "POST",
    "/api/orders/detail/query",
    { accessToken, shopId, body: { order_ids: orderIds } },
  );
  return data.orders || [];
}

// ─── Warehouses ──────────────────────────────────────────────

export interface TikTokWarehouse {
  id: string;
  name: string;
  is_default: boolean;
  warehouse_type?: number;
}

/**
 * Get warehouses for a shop (needed for inventory updates).
 */
export async function getWarehouses(
  accessToken: string,
  shopId: string,
): Promise<TikTokWarehouse[]> {
  const data = await tiktokRequest<{ warehouses: TikTokWarehouse[] }>(
    "GET",
    "/api/fulfillment/get_warehouse_list",
    { accessToken, shopId },
  );
  return data.warehouses || [];
}

// ─── Price / Format Helpers ──────────────────────────────────

/**
 * Format a price value (string decimal) for TikTok.
 * TikTok expects price as a string with up to 2 decimal places.
 */
export function formatTikTokPrice(price: string | number, currency: string = "SAR"): string {
  const num = typeof price === "string" ? parseFloat(price) : price;
  if (isNaN(num) || num < 0) return "0.00";
  return num.toFixed(2);
}

/**
 * Convert weight to kilograms for TikTok.
 */
export function toKilograms(weight: number | null, unit: string | null): string {
  if (!weight) return "0.5"; // default
  switch (unit?.toLowerCase()) {
    case "g":
    case "gram":
    case "grams":
      return (weight / 1000).toFixed(3);
    case "lb":
    case "lbs":
    case "pound":
    case "pounds":
      return (weight * 0.453592).toFixed(3);
    case "oz":
    case "ounce":
    case "ounces":
      return (weight * 0.0283495).toFixed(3);
    default:
      return weight.toFixed(3); // assume kg
  }
}
