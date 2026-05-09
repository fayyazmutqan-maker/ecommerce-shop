/**
 * Tap Payments Integration Library
 * Supports: mada, Visa, Mastercard, Apple Pay, STC Pay
 * Docs: https://developers.tap.company/reference
 */

import { createHmac } from "crypto";

const TAP_API_BASE = "https://api.tap.company/v2";

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

/**
 * Create a Tap Payments charge.
 * Uses the redirect flow — customer is sent to Tap's hosted payment page.
 */
export async function createTapCharge(
  secretKey: string,
  charge: TapChargeRequest
): Promise<TapChargeResponse> {
  const response = await fetch(`${TAP_API_BASE}/charges`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(charge),
  });

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
 */
export async function retrieveTapCharge(
  secretKey: string,
  chargeId: string
): Promise<TapChargeRetrieveResponse> {
  if (!validateTapId(chargeId)) {
    throw new Error("Invalid charge ID format");
  }

  const response = await fetch(`${TAP_API_BASE}/charges/${encodeURIComponent(chargeId)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      Accept: "application/json",
    },
  });

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

  const response = await fetch(`${TAP_API_BASE}/refunds`, {
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
  });

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

/**
 * Parse a Saudi phone number into country code + number.
 */
export function parseSaudiPhone(phone?: string): { country_code: string; number: string } | undefined {
  if (!phone) return undefined;
  const cleaned = phone.replace(/\s|-/g, "");
  if (cleaned.startsWith("+966")) {
    return { country_code: "966", number: cleaned.slice(4) };
  }
  if (cleaned.startsWith("966")) {
    return { country_code: "966", number: cleaned.slice(3) };
  }
  if (cleaned.startsWith("05") || cleaned.startsWith("5")) {
    const num = cleaned.startsWith("0") ? cleaned.slice(1) : cleaned;
    return { country_code: "966", number: num };
  }
  return { country_code: "966", number: cleaned };
}

/**
 * Verify a Tap webhook HMAC signature.
 * Tap sends a `hashstring` header containing an HMAC-SHA256 of the payload
 * signed with the secret API key.
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
    // Constant-time comparison to prevent timing attacks
    if (computed.length !== hashString.length) return false;
    let result = 0;
    for (let i = 0; i < computed.length; i++) {
      result |= computed.charCodeAt(i) ^ hashString.charCodeAt(i);
    }
    return result === 0;
  } catch {
    return false;
  }
}
