/**
 * Production-ready rate limiter.
 *
 * Uses @upstash/ratelimit with Redis when UPSTASH_REDIS_REST_URL is configured.
 * Falls back to an in-memory sliding-window limiter for local development ONLY.
 *
 * In production, if Upstash is not configured the app will throw at startup
 * rather than silently falling back to per-instance memory (which is ineffective
 * on serverless where each cold start resets the counters).
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ── Types ──────────────────────────────────────────────────────────

interface RateLimitResult {
  success: boolean;
  remaining: number;
  retryAfterMs: number;
}

interface RateLimiter {
  check(identifier: string): Promise<RateLimitResult>;
}

// ── Upstash Redis detection ────────────────────────────────────────

const hasUpstash = !!(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
);

const isProduction = process.env.NODE_ENV === "production";

// Hard-fail at module load time in production without Redis.
// This is intentional: silent in-memory fallback on serverless means rate
// limiting simply doesn't work — requests that should be blocked aren't.
if (isProduction && !hasUpstash) {
  throw new Error(
    "Rate limiting requires Upstash Redis in production. " +
    "Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN, " +
    "or configure a Redis instance. " +
    "In-memory fallback is not safe for serverless environments."
  );
}

// ── Factory ────────────────────────────────────────────────────────

function createRateLimiter(opts: {
  maxRequests: number;
  windowSeconds: number;
  prefix: string;
}): RateLimiter {
  if (hasUpstash) {
    const redis = Redis.fromEnv();
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(opts.maxRequests, `${opts.windowSeconds} s`),
      prefix: `rl:${opts.prefix}`,
      analytics: true,
    });

    return {
      async check(identifier: string): Promise<RateLimitResult> {
        const result = await limiter.limit(identifier);
        return {
          success: result.success,
          remaining: result.remaining,
          retryAfterMs: result.success ? 0 : Math.max(result.reset - Date.now(), 1000),
        };
      },
    };
  }

  // ── In-memory fallback for local development only ──
  const store = new Map<string, { tokens: number; lastRefill: number }>();

  // Periodic cleanup every 60 s
  if (typeof globalThis !== "undefined") {
    const cleanupKey = `__rl_cleanup_${opts.prefix}`;
    const g = globalThis as Record<string, unknown>;
    if (!g[cleanupKey]) {
      g[cleanupKey] = setInterval(() => {
        const now = Date.now();
        for (const [k, v] of store.entries()) {
          if (now - v.lastRefill > opts.windowSeconds * 1000 * 2) {
            store.delete(k);
          }
        }
      }, 60_000);
    }
  }

  return {
    async check(identifier: string): Promise<RateLimitResult> {
      const now = Date.now();
      const windowMs = opts.windowSeconds * 1000;

      let entry = store.get(identifier);
      if (!entry) {
        entry = { tokens: opts.maxRequests, lastRefill: now };
        store.set(identifier, entry);
      }

      const elapsed = now - entry.lastRefill;
      const refill = Math.floor((elapsed / windowMs) * opts.maxRequests);
      if (refill > 0) {
        entry.tokens = Math.min(opts.maxRequests, entry.tokens + refill);
        entry.lastRefill = now;
      }

      if (entry.tokens > 0) {
        entry.tokens -= 1;
        return { success: true, remaining: entry.tokens, retryAfterMs: 0 };
      }

      const retryAfterMs = Math.ceil(windowMs / opts.maxRequests - elapsed);
      return { success: false, remaining: 0, retryAfterMs: Math.max(retryAfterMs, 1000) };
    },
  };
}

// ── Env-configurable helper ────────────────────────────────────────

/**
 * Read a rate-limit value from an environment variable.
 * Format: "maxRequests/windowSeconds" e.g. "10/60" or just "maxRequests" (uses default window).
 * Falls back to the provided defaults if the env var is missing or invalid.
 */
function envLimit(
  envKey: string,
  defaults: { maxRequests: number; windowSeconds: number },
): { maxRequests: number; windowSeconds: number } {
  const raw = process.env[envKey];
  if (!raw) return defaults;
  const parts = raw.split("/").map(Number);
  if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) {
    return { maxRequests: parts[0], windowSeconds: parts[1] };
  }
  if (parts.length === 1 && parts[0] > 0) {
    return { maxRequests: parts[0], windowSeconds: defaults.windowSeconds };
  }
  return defaults;
}

// ── Pre-configured limiters ────────────────────────────────────────
// All limits are overridable via env vars using the format "maxRequests/windowSeconds"
// e.g. RATE_LIMIT_AUTH=5/60 means 5 requests per 60 seconds

/** Auth endpoints — default: 7 per 60 s */
export const authLimiter = createRateLimiter({
  ...envLimit("RATE_LIMIT_AUTH", { maxRequests: 7, windowSeconds: 60 }),
  prefix: "auth",
});

/** Checkout / order creation — default: 10 per 60 s */
export const checkoutLimiter = createRateLimiter({
  ...envLimit("RATE_LIMIT_CHECKOUT", { maxRequests: 10, windowSeconds: 60 }),
  prefix: "checkout",
});

/** Newsletter / public form submissions — default: 5 per 60 s */
export const formLimiter = createRateLimiter({
  ...envLimit("RATE_LIMIT_FORM", { maxRequests: 5, windowSeconds: 60 }),
  prefix: "form",
});

/** Search / read-heavy public endpoints — default: 30 per 60 s */
export const searchLimiter = createRateLimiter({
  ...envLimit("RATE_LIMIT_SEARCH", { maxRequests: 30, windowSeconds: 60 }),
  prefix: "search",
});

/** Coupon validation — default: 10 per 60 s */
export const couponLimiter = createRateLimiter({
  ...envLimit("RATE_LIMIT_COUPON", { maxRequests: 10, windowSeconds: 60 }),
  prefix: "coupon",
});

/** Payment charge creation — default: 5 per 60 s per IP */
export const paymentLimiter = createRateLimiter({
  ...envLimit("RATE_LIMIT_PAYMENT", { maxRequests: 5, windowSeconds: 60 }),
  prefix: "payment",
});

/** Password reset — default: 3 per 300 s per IP */
export const passwordResetLimiter = createRateLimiter({
  ...envLimit("RATE_LIMIT_PASSWORD_RESET", { maxRequests: 3, windowSeconds: 300 }),
  prefix: "pwreset",
});

/** Webhook — default: 60 per 60 s (server-to-server, generous) */
export const webhookLimiter = createRateLimiter({
  ...envLimit("RATE_LIMIT_WEBHOOK", { maxRequests: 60, windowSeconds: 60 }),
  prefix: "webhook",
});

/** Refund creation — default: 5 per 60 s per IP */
export const refundLimiter = createRateLimiter({
  ...envLimit("RATE_LIMIT_REFUND", { maxRequests: 5, windowSeconds: 60 }),
  prefix: "refund",
});

/** ZATCA retry — default: 3 per 60 s per IP */
export const zatcaRetryLimiter = createRateLimiter({
  ...envLimit("RATE_LIMIT_ZATCA_RETRY", { maxRequests: 3, windowSeconds: 60 }),
  prefix: "zatca-retry",
});

/** ZATCA onboarding — default: 3 per 300 s per IP */
export const zatcaOnboardLimiter = createRateLimiter({
  ...envLimit("RATE_LIMIT_ZATCA_ONBOARD", { maxRequests: 3, windowSeconds: 300 }),
  prefix: "zatca-onboard",
});

/** Daily order cap per IP — default: 100 per 24h */
export const dailyOrderLimiter = createRateLimiter({
  ...envLimit("RATE_LIMIT_DAILY_ORDER", { maxRequests: 100, windowSeconds: 86400 }),
  prefix: "daily-order",
});

/** Daily refund cap per admin user — default: 30 per 24h */
export const dailyRefundLimiter = createRateLimiter({
  ...envLimit("RATE_LIMIT_DAILY_REFUND", { maxRequests: 30, windowSeconds: 86400 }),
  prefix: "daily-refund",
});

/**
 * Extract client IP from request headers.
 * IMPORTANT: This relies on X-Forwarded-For being set by a trusted reverse proxy
 * (e.g., Vercel, Cloudflare, nginx). In production, ensure your deployment platform
 * strips/overwrites X-Forwarded-For to prevent IP spoofing by clients.
 * Vercel and Cloudflare do this automatically.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  // Derive a fallback key from available request characteristics
  // to avoid all unknown-IP requests sharing a single bucket
  const ua = req.headers.get("user-agent") || "";
  return `no-ip:${ua.substring(0, 64)}`;
}

/**
 * Helper that checks the limiter and returns a 429 Response if exceeded,
 * or null if the request is allowed.
 */
export async function rateLimitResponse(
  limiter: RateLimiter,
  ip: string,
): Promise<Response | null> {
  const result = await limiter.check(ip);
  if (!result.success) {
    return new Response(
      JSON.stringify({
        error: "Too many requests. Please try again later.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }
  return null;
}
