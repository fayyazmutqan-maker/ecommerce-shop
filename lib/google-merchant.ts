/**
 * Google Merchant Center API Client
 *
 * Centralized service for all Google Shopping Content API interactions.
 * Uses REST API v2.1 with service account or OAuth2 authentication.
 *
 * Handles: OAuth, Product Feed Sync, Account Discovery, Inventory Updates.
 *
 * Google Content API docs: https://developers.google.com/shopping-content/reference/rest/v2.1
 */

import { env } from "@/lib/env";
import crypto from "crypto";

// ─── Constants ───────────────────────────────────────────────

const CONTENT_API_BASE = "https://shoppingcontent.googleapis.com/content/v2.1";
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const OAUTH_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

// Google Shopping scopes
const SCOPES = [
  "https://www.googleapis.com/auth/content", // Full Merchant Center access
].join(" ");

// ─── Types ───────────────────────────────────────────────────

export interface GoogleCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: string; // ISO date
}

export interface GoogleProductItem {
  offerId: string;       // Unique product ID (your SKU or product ID)
  title: string;
  description: string;
  link: string;           // Product page URL
  imageLink: string;
  additionalImageLinks?: string[];
  contentLanguage: string; // e.g. "en" or "ar"
  targetCountry: string;   // e.g. "SA"
  channel: "online";
  availability: "in_stock" | "out_of_stock" | "preorder";
  condition: "new" | "refurbished" | "used";
  price: { value: string; currency: string };
  salePrice?: { value: string; currency: string };
  brand?: string;
  gtin?: string;           // barcode / EAN / UPC
  mpn?: string;            // manufacturer part number
  googleProductCategory?: string;
  productTypes?: string[];
  itemGroupId?: string;    // Groups variants together
  color?: string;
  sizes?: string[];
  weight?: { value: string; unit: string };
  shipping?: { country: string; price: { value: string; currency: string } }[];
  customLabel0?: string;
  customLabel1?: string;
  identifierExists?: boolean;
}

export interface GoogleProductStatus {
  productId: string;
  title?: string;
  destinationStatuses?: {
    destination: string;
    status: string; // "approved" | "disapproved" | "pending"
  }[];
  itemLevelIssues?: {
    code: string;
    servability: string;
    resolution: string;
    attributeName?: string;
    destination?: string;
    description?: string;
    detail?: string;
    documentation?: string;
  }[];
}

export interface GoogleMerchantAccount {
  id: string;
  name: string;
  websiteUrl?: string;
  adultContent?: boolean;
}

export interface GoogleBatchEntry {
  batchId: number;
  merchantId: string;
  method: "insert" | "delete" | "get";
  product?: GoogleProductItem;
  productId?: string;
}

export interface GoogleBatchResult {
  entries: {
    batchId: number;
    product?: GoogleProductItem & { id?: string };
    errors?: { code: number; message: string; domain?: string }[];
  }[];
}

// ─── Token Management ────────────────────────────────────────

/**
 * Get OAuth URL for user-based authentication.
 * Used when connecting a Google Merchant Center account via the admin panel.
 */
export function getGoogleOAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${OAUTH_AUTH_URL}?${params}`;
}

/**
 * Exchange authorization code for access + refresh tokens.
 */
export async function exchangeGoogleCode(code: string, redirectUri: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Google token exchange failed: ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  if (!data.refresh_token) {
    throw new Error("No refresh token returned. User may need to revoke access and reconnect.");
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in || 3600,
  };
}

/**
 * Refresh an expired access token using the stored refresh token.
 */
export async function refreshGoogleToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Google token refresh failed: ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in || 3600,
  };
}

/**
 * Get a valid access token, refreshing if necessary.
 * Returns updated credentials if a refresh occurred.
 */
export async function getValidToken(credentials: GoogleCredentials): Promise<{
  accessToken: string;
  updated: boolean;
  credentials: GoogleCredentials;
}> {
  const expiresAt = new Date(credentials.expiresAt).getTime();
  const now = Date.now();
  // Refresh if token expires within 5 minutes
  const BUFFER_MS = 5 * 60 * 1000;

  if (expiresAt - now > BUFFER_MS) {
    return { accessToken: credentials.accessToken, updated: false, credentials };
  }

  const { accessToken, expiresIn } = await refreshGoogleToken(credentials.refreshToken);
  const newCredentials: GoogleCredentials = {
    accessToken,
    refreshToken: credentials.refreshToken,
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };

  return { accessToken, updated: true, credentials: newCredentials };
}

// ─── Account Discovery ───────────────────────────────────────

/**
 * List Merchant Center accounts the user has access to.
 */
export async function listMerchantAccounts(accessToken: string): Promise<GoogleMerchantAccount[]> {
  const res = await fetch(`${CONTENT_API_BASE}/accounts/authinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to list merchant accounts: ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  const accountIds: { merchantId: string; adwordsLinks?: unknown }[] = data.accountIdentifiers || [];

  // Fetch details for each account
  const accounts: GoogleMerchantAccount[] = [];
  for (const acc of accountIds) {
    try {
      const detailRes = await fetch(`${CONTENT_API_BASE}/${acc.merchantId}/accounts/${acc.merchantId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (detailRes.ok) {
        const detail = await detailRes.json();
        accounts.push({
          id: acc.merchantId,
          name: detail.name || `Account ${acc.merchantId}`,
          websiteUrl: detail.websiteUrl,
          adultContent: detail.adultContent,
        });
      }
    } catch {
      // Best-effort: include basic info even on error
      accounts.push({ id: acc.merchantId, name: `Account ${acc.merchantId}` });
    }
  }

  return accounts;
}

/**
 * Get a single merchant account's details.
 */
export async function getMerchantAccount(
  merchantId: string,
  accessToken: string,
): Promise<GoogleMerchantAccount> {
  const res = await fetch(`${CONTENT_API_BASE}/${merchantId}/accounts/${merchantId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to get merchant account: ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  return {
    id: merchantId,
    name: data.name || `Account ${merchantId}`,
    websiteUrl: data.websiteUrl,
    adultContent: data.adultContent,
  };
}

// ─── Product Management ──────────────────────────────────────

/**
 * Insert or update a single product in Google Merchant Center.
 */
export async function insertProduct(
  merchantId: string,
  product: GoogleProductItem,
  accessToken: string,
): Promise<{ id: string }> {
  const res = await fetch(`${CONTENT_API_BASE}/${merchantId}/products`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(product),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to insert product ${product.offerId}: ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  return { id: data.id || `online:${product.contentLanguage}:${product.targetCountry}:${product.offerId}` };
}

/**
 * Delete a product from Google Merchant Center.
 */
export async function deleteProduct(
  merchantId: string,
  productId: string,
  accessToken: string,
): Promise<void> {
  const res = await fetch(`${CONTENT_API_BASE}/${merchantId}/products/${encodeURIComponent(productId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // 404 means already deleted — not an error
  if (!res.ok && res.status !== 404) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to delete product ${productId}: ${JSON.stringify(err)}`);
  }
}

/**
 * Batch insert/delete products (up to 10,000 per request).
 * Google Content API batch endpoint.
 */
export async function batchProducts(
  merchantId: string,
  entries: GoogleBatchEntry[],
  accessToken: string,
): Promise<GoogleBatchResult> {
  const res = await fetch(`${CONTENT_API_BASE}/products/batch`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ entries }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Batch products request failed: ${JSON.stringify(err)}`);
  }

  return res.json();
}

/**
 * List all products in the Merchant Center account.
 */
export async function listProducts(
  merchantId: string,
  accessToken: string,
  maxResults = 250,
  pageToken?: string,
): Promise<{ products: (GoogleProductItem & { id: string })[]; nextPageToken?: string }> {
  const params = new URLSearchParams({ maxResults: String(maxResults) });
  if (pageToken) params.set("pageToken", pageToken);

  const res = await fetch(`${CONTENT_API_BASE}/${merchantId}/products?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to list products: ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  return {
    products: data.resources || [],
    nextPageToken: data.nextPageToken,
  };
}

// ─── Product Status ──────────────────────────────────────────

/**
 * Get product status (approval state, issues) for a single product.
 */
export async function getProductStatus(
  merchantId: string,
  productId: string,
  accessToken: string,
): Promise<GoogleProductStatus> {
  const res = await fetch(
    `${CONTENT_API_BASE}/${merchantId}/productstatuses/${encodeURIComponent(productId)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to get product status: ${JSON.stringify(err)}`);
  }

  return res.json();
}

/**
 * List product statuses for the whole account (batch check).
 */
export async function listProductStatuses(
  merchantId: string,
  accessToken: string,
  maxResults = 250,
  pageToken?: string,
): Promise<{ statuses: GoogleProductStatus[]; nextPageToken?: string }> {
  const params = new URLSearchParams({ maxResults: String(maxResults) });
  if (pageToken) params.set("pageToken", pageToken);

  const res = await fetch(`${CONTENT_API_BASE}/${merchantId}/productstatuses?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Failed to list product statuses: ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  return {
    statuses: data.resources || [],
    nextPageToken: data.nextPageToken,
  };
}

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Format price amount to Google's decimal string format.
 * Google expects "29.99" not cents.
 */
export function formatGooglePrice(amount: number | string, currency = "SAR"): {
  value: string;
  currency: string;
} {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return {
    value: num.toFixed(2),
    currency,
  };
}

/**
 * Build the Google Content API product ID.
 * Format: online:contentLanguage:targetCountry:offerId
 */
export function buildGoogleProductId(
  offerId: string,
  contentLanguage = "en",
  targetCountry = "SA",
): string {
  return `online:${contentLanguage}:${targetCountry}:${offerId}`;
}

/**
 * Parse a Google Content API product ID back to components.
 */
export function parseGoogleProductId(productId: string): {
  channel: string;
  contentLanguage: string;
  targetCountry: string;
  offerId: string;
} | null {
  const parts = productId.split(":");
  if (parts.length !== 4) return null;
  return {
    channel: parts[0],
    contentLanguage: parts[1],
    targetCountry: parts[2],
    offerId: parts[3],
  };
}
