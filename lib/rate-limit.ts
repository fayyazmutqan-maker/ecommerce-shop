/**
 * Production-ready rate limiter.
 *
 * Uses @upstash/ratelimit with Redis when UPSTASH_REDIS_REST_URL is configured.
 * Falls back to an in-memory sliding-window limiter for local development.
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

  // ── In-memory fallback for local development ──
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

// ── Pre-configured limiters ────────────────────────────────────────

/** Auth endpoints: 7 attempts per 60 s */
export const authLimiter = createRateLimiter({
  maxRequests: 7,
  windowSeconds: 60,
  prefix: "auth",
});

/** Checkout / order creation: 10 per 60 s */
export const checkoutLimiter = createRateLimiter({
  maxRequests: 10,
  windowSeconds: 60,
  prefix: "checkout",
});

/** Newsletter / public form submissions: 5 per 60 s */
export const formLimiter = createRateLimiter({
  maxRequests: 5,
  windowSeconds: 60,
  prefix: "form",
});

/** Search / read-heavy public endpoints: 30 per 60 s */
export const searchLimiter = createRateLimiter({
  maxRequests: 30,
  windowSeconds: 60,
  prefix: "search",
});

/** Coupon validation: 10 per 60 s */
export const couponLimiter = createRateLimiter({
  maxRequests: 10,
  windowSeconds: 60,
  prefix: "coupon",
});

/** Payment charge creation: 5 per 60 s per IP (prevents rapid charge spam) */
export const paymentLimiter = createRateLimiter({
  maxRequests: 5,
  windowSeconds: 60,
  prefix: "payment",
});

/** Password reset: 3 per 300 s per IP (prevents email flooding) */
export const passwordResetLimiter = createRateLimiter({
  maxRequests: 3,
  windowSeconds: 300,
  prefix: "pwreset",
});

/** Webhook: 60 per 60 s (server-to-server from Tap, generous) */
export const webhookLimiter = createRateLimiter({
  maxRequests: 60,
  windowSeconds: 60,
  prefix: "webhook",
});

/**
 * Extract a usable IP from the request for rate-limiting.
 * Falls back to a static key so the limiter always works.
 */
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
