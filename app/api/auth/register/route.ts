import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "@/lib/db";
import { users, verificationTokens } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { sendEmailVerification } from "@/lib/email";
import { authLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { createId } from "@paralleldrive/cuid2";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address").max(200),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  turnstileToken: z.string().optional(),
  // Honeypot — must be empty (bots auto-fill hidden fields)
  website: z.string().max(0, "Bot detected").optional(),
});

/** Verify Cloudflare Turnstile token server-side */
async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // Skip if not configured

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token, remoteip: ip }),
  });
  const data = await res.json();
  return data.success === true;
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rlResponse = await rateLimitResponse(authLimiter, ip);
  if (rlResponse) {
    audit({ action: "RATE_LIMIT_HIT", ip, resource: "register", success: false });
    return rlResponse;
  }

  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, password, turnstileToken, website } = parsed.data;
    const email = parsed.data.email.trim().toLowerCase();

    // Honeypot check — bots fill hidden fields
    if (website) {
      audit({ action: "AUTH_REGISTER", ip, resource: "honeypot", success: false });
      // Return success to not tip off the bot
      return NextResponse.json({ message: "Account created successfully" }, { status: 201 });
    }

    // Turnstile verification (if configured)
    if (process.env.TURNSTILE_SECRET_KEY) {
      if (!turnstileToken) {
        return NextResponse.json({ error: "Please complete the CAPTCHA" }, { status: 400 });
      }
      const valid = await verifyTurnstile(turnstileToken, ip);
      if (!valid) {
        audit({ action: "AUTH_REGISTER", ip, resource: "turnstile-failed", success: false });
        return NextResponse.json({ error: "CAPTCHA verification failed. Please try again." }, { status: 400 });
      }
    }

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      // Perform a dummy hash to prevent timing side-channel
      // (attacker can't distinguish existing user by response time)
      await bcrypt.hash(password, 12);
      return NextResponse.json(
        { error: "Unable to create account. Please try again or use a different email." },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const [user] = await db.insert(users).values({
      name,
      email,
      password: hashedPassword,
      role: "CUSTOMER",
    }).returning();

    // Generate email verification token
    const verifyToken = createId();
    const hashedToken = hashToken(verifyToken);
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db.delete(verificationTokens).where(eq(verificationTokens.identifier, `verify:${email}`));
    await db.insert(verificationTokens).values({
      identifier: `verify:${email}`,
      token: hashedToken,
      expires,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    sendEmailVerification({
      email,
      name,
      verificationUrl: `${appUrl}/api/auth/verify-email?token=${verifyToken}`,
    }).catch((err) =>
      console.error("Failed to send verification email:", err)
    );

    audit({ action: "AUTH_REGISTER", email, ip, resource: "user", resourceId: user.id, success: true });

    return NextResponse.json(
      { message: "Account created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
