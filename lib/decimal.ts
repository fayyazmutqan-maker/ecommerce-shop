/**
 * Decimal serialization helpers for Drizzle ORM.
 *
 * Drizzle returns `decimal` columns as strings by default.
 * These helpers convert them to plain numbers so API responses are clean.
 */

/**
 * Recursively converts all decimal string fields in an object tree
 * to plain JavaScript numbers.
 *
 * Uses two heuristics:
 *  1. Known decimal column names (explicit list).
 *  2. Any string that looks like a decimal number (e.g. "12.50") when
 *     the key hints at a monetary/numeric purpose (*price*, *amount*,
 *     *total*, *cost*, *value*, *rate*, *balance*, *min*, *max*, *fee*,
 *     *discount*, *tax*, *shipping*, *subtotal*, *weight*).
 *
 * This dual approach prevents fragile failures when new decimal columns
 * are added without updating DECIMAL_FIELDS.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serializeDecimal<T>(data: T): T {
  if (data === null || data === undefined) return data;

  if (Array.isArray(data)) {
    return data.map(serializeDecimal) as unknown as T;
  }

  if (data instanceof Date) return data as T;

  if (typeof data === "object" && data !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === "string" && shouldSerializeAsNumber(key, value)) {
        result[key] = parseFloat(value) || 0;
      } else {
        result[key] = serializeDecimal(value);
      }
    }
    return result as T;
  }

  return data;
}

/** Explicit decimal column names */
const DECIMAL_FIELDS = new Set([
  "price", "compareAtPrice", "costPrice", "subtotal", "taxAmount",
  "shippingAmount", "discountAmount", "totalAmount", "totalPrice",
  "amount", "value", "minOrderAmount", "maxDiscountAmount",
  "freeShippingMin", "flatShippingRate", "openingBalance",
  "closingBalance", "totalSales", "minOrderAmount", "maxOrderAmount",
  "refundAmount",
]);

/** Pattern matching for key names that typically hold decimal values */
const DECIMAL_KEY_PATTERN = /price|amount|total|cost|value|rate|balance|min|max|fee|discount|tax|shipping|subtotal|weight|refund/i;

/** Valid decimal string pattern: optional negative, digits, optional decimal point + digits */
const DECIMAL_STRING_PATTERN = /^-?\d+(\.\d+)?$/;

function shouldSerializeAsNumber(key: string, value: string): boolean {
  // Explicit match — always convert
  if (DECIMAL_FIELDS.has(key)) return true;

  // Heuristic: key looks monetary/numeric AND value is a valid decimal string
  if (DECIMAL_KEY_PATTERN.test(key) && DECIMAL_STRING_PATTERN.test(value)) {
    return true;
  }

  return false;
}

/**
 * Convert a value to a safe number for arithmetic.
 * Handles string and number inputs (Drizzle returns decimals as strings).
 */
export function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value) || 0;
  return 0;
}
