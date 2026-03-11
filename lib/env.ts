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
}).superRefine((data, ctx) => {
  if (data.NODE_ENV === "production") {
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

    if (process.env.NODE_ENV === "production") {
      throw new Error("Missing required environment variables");
    }
  }

  return result.success ? result.data : (process.env as unknown as Env);
}

export const env = validateEnv();
