import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_DATABASE_URL: z.string().optional(),

  // NextAuth
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  AUTH_URL: z.string().url("AUTH_URL must be a valid URL"),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),

  // AWS S3
  AWS_REGION: z.string().min(1, "AWS_REGION is required"),
  AWS_ACCESS_KEY_ID: z.string().min(1, "AWS_ACCESS_KEY_ID is required"),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, "AWS_SECRET_ACCESS_KEY is required"),
  AWS_S3_BUCKET: z.string().min(1, "AWS_S3_BUCKET is required"),

  // App
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url("NEXT_PUBLIC_APP_URL must be a valid URL")
    .default("http://localhost:3000"),

  // Email (Resend) — required for production
  RESEND_API_KEY: z.string().startsWith("re_").optional(),
  EMAIL_FROM: z.string().optional().default("ShopFlow <onboarding@resend.dev>"),

  // Node environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Upstash Redis (rate limiting) — required for production
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

  // Rate limits — format: "maxRequests/windowSeconds" e.g. "10/60"
  RATE_LIMIT_AUTH: z.string().regex(/^\d+(\/\d+)?$/).optional(),
  RATE_LIMIT_CHECKOUT: z.string().regex(/^\d+(\/\d+)?$/).optional(),
  RATE_LIMIT_FORM: z.string().regex(/^\d+(\/\d+)?$/).optional(),
  RATE_LIMIT_SEARCH: z.string().regex(/^\d+(\/\d+)?$/).optional(),
  RATE_LIMIT_COUPON: z.string().regex(/^\d+(\/\d+)?$/).optional(),
  RATE_LIMIT_PAYMENT: z.string().regex(/^\d+(\/\d+)?$/).optional(),
  RATE_LIMIT_PASSWORD_RESET: z.string().regex(/^\d+(\/\d+)?$/).optional(),
  RATE_LIMIT_WEBHOOK: z.string().regex(/^\d+(\/\d+)?$/).optional(),
  RATE_LIMIT_REFUND: z.string().regex(/^\d+(\/\d+)?$/).optional(),
  RATE_LIMIT_ZATCA_RETRY: z.string().regex(/^\d+(\/\d+)?$/).optional(),
  RATE_LIMIT_ZATCA_ONBOARD: z.string().regex(/^\d+(\/\d+)?$/).optional(),
  RATE_LIMIT_DAILY_ORDER: z.string().regex(/^\d+(\/\d+)?$/).optional(),
  RATE_LIMIT_DAILY_REFUND: z.string().regex(/^\d+(\/\d+)?$/).optional(),

  // Cloudflare Turnstile (bot protection)
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),

  // Meta (Facebook / Instagram) Commerce
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
  META_API_VERSION: z.string().default("v21.0"),

  // Google Merchant Center
  GOOGLE_MERCHANT_CENTER_ID: z.string().optional(),
  GOOGLE_MERCHANT_SERVICE_ACCOUNT_KEY: z.string().optional(), // Base64-encoded service account JSON

  // Invoice monitor — anomaly detection thresholds
  MONITOR_SPIKE_THRESHOLD_IP: z.string().regex(/^\d+$/).optional(),
  MONITOR_SPIKE_THRESHOLD_GLOBAL: z.string().regex(/^\d+$/).optional(),
  MONITOR_RAPID_FIRE_MS: z.string().regex(/^\d+$/).optional(),
  MONITOR_RAPID_FIRE_COUNT: z.string().regex(/^\d+$/).optional(),
  MONITOR_ALERT_COOLDOWN_MS: z.string().regex(/^\d+$/).optional(),
  MONITOR_ADMIN_EMAIL: z.string().email().optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  // next build sets NODE_ENV=production but these services aren't needed at build time
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
  if (data.NODE_ENV === "production" && !isBuildPhase) {
    if (!data.RESEND_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "RESEND_API_KEY is required in production",
        path: ["RESEND_API_KEY"],
      });
    }
    if (!data.UPSTASH_REDIS_REST_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "UPSTASH_REDIS_REST_URL is required in production (rate limiting)",
        path: ["UPSTASH_REDIS_REST_URL"],
      });
    }
    if (!data.UPSTASH_REDIS_REST_TOKEN) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "UPSTASH_REDIS_REST_TOKEN is required in production (rate limiting)",
        path: ["UPSTASH_REDIS_REST_TOKEN"],
      });
    }
  }
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const errorMessages = Object.entries(errors)
      .map(([key, msgs]) => `  ${key}: ${msgs?.join(", ")}`)
      .join("\n");

    console.error("❌ Environment variable validation failed:\n" + errorMessages);

    if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
      throw new Error("Missing required environment variables");
    }
  }

  return result.success ? result.data : (process.env as unknown as Env);
}

export const env = validateEnv();
