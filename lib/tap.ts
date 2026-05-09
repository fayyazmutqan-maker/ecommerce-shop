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

export interface TapChargeRequest {
  amount: number;
  currency: string;
  description: string;
  reference: {
    order: string;
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
  reason: string
): Promise<{ id: string; status: string }> {
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

/**
 * Verify a Tap webhook HMAC signature.
 * Tap sends a `hashstring` header containing an HMAC-SHA256 of the payload
 * signed with the secret API key.
 *
 * Uses Node's built-in crypto.timingSafeEqual for constant-time comparison,
 * consistent with the rest of the codebase (meta.ts, snapchat.ts).
 *
 * Returns true if the signature is valid, false otherwise.
 * If no hashstring header is present, returns false (strict mode).
 */
export function verifyTapWebhookSignature(
  secretKey: string,
  rawBody: string,
  hashString: string | null
): boolean {
  if (!hashString) return false;
  try {
    const computed = createHmac("sha256", secretKey)
      .update(rawBody)
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
