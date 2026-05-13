/**
 * Tap Payments Integration Library
 * Supports: mada, Visa, Mastercard, Apple Pay, STC Pay
 * Docs: https://developers.tap.company/reference
 */

import { createHmac, timingSafeEqual } from "crypto";

const TAP_API_BASE = "https://api.tap.company/v2";

// Retry configuration for transient network failures
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

export function getTapSecretKeyMode(secretKey: string): "test" | "live" | "unknown" {
  if (secretKey.startsWith("sk_test_")) return "test";
  if (secretKey.startsWith("sk_live_")) return "live";
  return "unknown";
}

export function assertTapKeyMatchesMode(secretKey: string, testMode: boolean): void {
  const keyMode = getTapSecretKeyMode(secretKey);
  if (keyMode === "unknown") {
    throw new Error("TAP_SECRET_KEY must start with sk_test_ or sk_live_");
  }
  if (testMode && keyMode !== "test") {
    throw new Error("Tap test mode is enabled, but TAP_SECRET_KEY is not a test key");
  }
  if (!testMode && keyMode !== "live") {
    throw new Error("Tap live mode is enabled, but TAP_SECRET_KEY is not a live key");
  }
}

export interface TapChargeRequest {
  amount: number;
  currency: string;
  description: string;
  reference: {
    order: string;
    transaction?: string;
    idempotent?: string;
  };
  receipt: {
    email: boolean;
    sms: boolean;
  };
  customer: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: {
      country_code: string;
      number: string;
    };
  };
  source: {
    id: string; // "src_all" for all payment methods
  };
  redirect: {
    url: string;
  };
  post: {
    url: string;
  };
  metadata?: Record<string, string>;
}

export interface TapChargeResponse {
  id: string;
  status: string;
  amount: number;
  currency: string;
  description: string;
  reference: {
    order: string;
  };
  receipt: {
    id: string;
    email: boolean;
    sms: boolean;
  };
  customer: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  source: {
    id: string;
    type: string;
    payment_type: string;
    payment_method: string;
    channel: string;
  };
  redirect: {
    status: string;
    url: string;
  };
  transaction: {
    timezone: string;
    created: string;
    url: string;
    expiry: {
      period: number;
      type: string;
    };
  };
  metadata?: Record<string, string>;
}

export interface TapChargeRetrieveResponse extends TapChargeResponse {
  response: {
    code: string;
    message: string;
  };
  gateway: {
    response: {
      code: string;
      message: string;
    };
  };
}

type TapWebhookPayload = {
  id?: unknown;
  amount?: unknown;
  currency?: unknown;
  status?: unknown;
  created?: unknown;
  transaction?: {
    created?: unknown;
  };
  reference?: {
    gateway?: unknown;
    payment?: unknown;
  };
};

export interface TapRefundResponse {
  id: string;
  status: string;
  amount?: number;
  currency?: string;
  charge_id?: string;
  metadata?: Record<string, string>;
}

// ─── Retry Helper ─────────────────────────────────────────────

/**
 * Determines whether a failed fetch attempt should be retried.
 * Retries on network errors and 5xx server errors, not on 4xx client errors.
 */
function isRetryable(error: unknown, status?: number): boolean {
  if (status !== undefined) {
    // Retry on server errors (5xx) but not client errors (4xx)
    return status >= 500;
  }
  // Retry on network-level errors (no response received)
  return error instanceof TypeError;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with exponential-backoff retry for transient failures.
 * Retries up to MAX_RETRIES times on network errors and 5xx responses.
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES,
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);

      // Don't retry client errors — they won't resolve on their own
      if (!isRetryable(null, res.status)) {
        return res;
      }

      // 5xx — retry after backoff
      if (attempt < retries) {
        await sleep(RETRY_DELAY_MS * 2 ** attempt);
        continue;
      }

      return res;
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt >= retries) {
        throw error;
      }
      await sleep(RETRY_DELAY_MS * 2 ** attempt);
    }
  }

  throw lastError;
}

// ─── API Functions ────────────────────────────────────────────

/**
 * Create a Tap Payments charge.
 * Uses the redirect flow — customer is sent to Tap's hosted payment page.
 * Retries automatically on network errors and 5xx responses.
 */
export async function createTapCharge(
  secretKey: string,
  charge: TapChargeRequest
): Promise<TapChargeResponse> {
  const response = await fetchWithRetry(
    `${TAP_API_BASE}/charges`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(charge),
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Tap API error: ${response.status} — ${JSON.stringify(error)}`
    );
  }

  return response.json();
}

/**
 * Validate a Tap charge/refund ID format to prevent injection.
 */
function validateTapId(id: string): boolean {
  // Tap IDs are alphanumeric with underscores, typically prefixed with chg_, ref_, etc.
  return /^[a-zA-Z0-9_]{4,100}$/.test(id);
}

/**
 * Retrieve a Tap charge by its ID.
 * Used to verify payment status on callback/webhook.
 * Retries automatically on network errors and 5xx responses.
 */
export async function retrieveTapCharge(
  secretKey: string,
  chargeId: string
): Promise<TapChargeRetrieveResponse> {
  if (!validateTapId(chargeId)) {
    throw new Error("Invalid charge ID format");
  }

  const response = await fetchWithRetry(
    `${TAP_API_BASE}/charges/${encodeURIComponent(chargeId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Tap API error: ${response.status} — ${JSON.stringify(error)}`
    );
  }

  return response.json();
}

/**
 * Create a refund for a Tap charge.
 * Retries automatically on network errors and 5xx responses.
 */
export async function createTapRefund(
  secretKey: string,
  chargeId: string,
  amount: number,
  currency: string,
  reason: string,
  options?: {
    idempotent?: string;
    postUrl?: string;
    metadata?: Record<string, string>;
    reference?: Record<string, string>;
  },
): Promise<TapRefundResponse> {
  if (!validateTapId(chargeId)) {
    throw new Error("Invalid charge ID format");
  }

  const response = await fetchWithRetry(
    `${TAP_API_BASE}/refunds`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        charge_id: chargeId,
        amount,
        currency,
        description: reason,
        reason: "requested_by_customer",
        ...(options?.postUrl ? { post: { url: options.postUrl } } : {}),
        ...(options?.metadata ? { metadata: options.metadata } : {}),
        ...(options?.idempotent || options?.reference
          ? {
              reference: {
                ...options.reference,
                ...(options.idempotent ? { idempotent: options.idempotent } : {}),
              },
            }
          : {}),
      }),
    },
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Tap Refund error: ${response.status} — ${JSON.stringify(error)}`
    );
  }

  return response.json();
}

/**
 * Map Tap charge status to our internal payment status.
 */
export function mapTapStatus(tapStatus: string): string {
  switch (tapStatus) {
    case "CAPTURED":
      return "PAID";
    case "AUTHORIZED":
      return "AUTHORIZED";
    case "FAILED":
    case "DECLINED":
    case "RESTRICTED":
    case "VOID":
    case "TIMEDOUT":
    case "ABANDONED":
    case "UNKNOWN":
      return "FAILED";
    case "CANCELLED":
      return "CANCELLED";
    case "INITIATED":
    case "IN_PROGRESS":
      return "PENDING";
    default:
      return "PENDING";
  }
}

// ─── Phone Parsing ────────────────────────────────────────────

export interface ParsedPhone {
  country_code: string;
  number: string;
}

/**
 * Parse a Saudi phone number into country code + number.
 *
 * Returns undefined for unrecognized formats instead of a best-guess
 * object, preventing malformed phone numbers from reaching the Tap API.
 *
 * Recognized formats:
 *   +966XXXXXXXXX  →  { country_code: "966", number: "XXXXXXXXX" }
 *   966XXXXXXXXX   →  { country_code: "966", number: "XXXXXXXXX" }
 *   05XXXXXXXX     →  { country_code: "966", number: "5XXXXXXXX" }
 *   5XXXXXXXX      →  { country_code: "966", number: "5XXXXXXXX" }
 */
export function parseSaudiPhone(phone?: string): ParsedPhone | undefined {
  if (!phone) return undefined;

  const cleaned = phone.replace(/[\s\-().]/g, "");

  // +966XXXXXXXXX
  if (/^\+9665\d{8}$/.test(cleaned)) {
    return { country_code: "966", number: cleaned.slice(4) };
  }

  // 966XXXXXXXXX (no plus)
  if (/^9665\d{8}$/.test(cleaned)) {
    return { country_code: "966", number: cleaned.slice(3) };
  }

  // 05XXXXXXXX (local with leading zero)
  if (/^05\d{8}$/.test(cleaned)) {
    return { country_code: "966", number: cleaned.slice(1) };
  }

  // 5XXXXXXXX (local without leading zero)
  if (/^5\d{8}$/.test(cleaned)) {
    return { country_code: "966", number: cleaned };
  }

  // Unrecognized format — return undefined rather than guessing
  return undefined;
}

// ─── Webhook Verification ─────────────────────────────────────

const THREE_DECIMAL_CURRENCIES = new Set(["BHD", "JOD", "KWD", "OMR"]);

function getCurrencyDecimalPlaces(currency: string): number {
  return THREE_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 3 : 2;
}

function stringValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function formatTapAmount(amount: unknown, currency: unknown): string {
  const numericAmount = Number(amount);
  const currencyCode = stringValue(currency);

  if (!Number.isFinite(numericAmount) || !currencyCode) {
    return stringValue(amount);
  }

  return numericAmount.toFixed(getCurrencyDecimalPlaces(currencyCode));
}

export function buildTapWebhookHashString(payload: TapWebhookPayload): string {
  const id = stringValue(payload.id);
  const amount = formatTapAmount(payload.amount, payload.currency);
  const currency = stringValue(payload.currency);
  const gatewayReference = stringValue(payload.reference?.gateway);
  const paymentReference = stringValue(payload.reference?.payment);
  const status = stringValue(payload.status);
  const created = stringValue(payload.transaction?.created ?? payload.created);

  return (
    `x_id${id}` +
    `x_amount${amount}` +
    `x_currency${currency}` +
    `x_gateway_reference${gatewayReference}` +
    `x_payment_reference${paymentReference}` +
    `x_status${status}` +
    `x_created${created}`
  );
}

/**
 * Verify a Tap webhook HMAC signature.
 * Tap sends a `hashstring` header containing an HMAC-SHA256 of selected
 * response fields, signed with the secret API key.
 *
 * Uses Node's built-in crypto.timingSafeEqual for constant-time comparison,
 * consistent with the rest of the codebase (meta.ts, snapchat.ts).
 *
 * Returns true if the signature is valid, false otherwise.
 * If no hashstring header is present, returns false (strict mode).
 */
export function verifyTapWebhookSignature(
  secretKey: string,
  payload: TapWebhookPayload,
  hashString: string | null
): boolean {
  if (!hashString) return false;
  try {
    const hashInput = buildTapWebhookHashString(payload);
    const computed = createHmac("sha256", secretKey)
      .update(hashInput)
      .digest("hex");

    // Use timingSafeEqual (consistent with meta.ts / snapchat.ts)
    // Both buffers must be the same length to avoid a TypeError
    if (computed.length !== hashString.length) return false;
    return timingSafeEqual(
      Buffer.from(computed, "hex"),
      Buffer.from(hashString, "hex"),
    );
  } catch {
    return false;
  }
}
