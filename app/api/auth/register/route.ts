import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "@/lib/db";
import { users, verificationTokens } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { sendEmailVerificationOTP } from "@/lib/email";
import { authLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { isDisposableEmail } from "@/lib/disposable-emails";
import { isValidPhoneNumber } from "libphonenumber-js";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Generate a cryptographically secure 6-digit OTP */
function generateOTP(): string {
  const bytes = crypto.randomBytes(4);
  const num = bytes.readUInt32BE(0) % 1000000;
  return num.toString().padStart(6, "0");
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
  phone: z.string().min(1, "Phone number is required"),
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

    const { name, password, turnstileToken, website, phone } = parsed.data;
    const email = parsed.data.email.trim().toLowerCase();

    // Honeypot check — bots fill hidden fields
    if (website) {
      audit({ action: "AUTH_REGISTER", ip, resource: "honeypot", success: false });
      // Return success to not tip off the bot
      return NextResponse.json({ message: "Account created successfully" }, { status: 201 });
    }

    // Disposable email guard
    if (isDisposableEmail(email)) {
      return NextResponse.json(
        { error: "Temporary or disposable email addresses are not allowed. Please use a permanent email." },
        { status: 400 }
      );
    }

    // Phone number validation
    if (!isValidPhoneNumber(phone)) {
      return NextResponse.json(
        { error: "Invalid phone number. Please enter a valid phone number with country code." },
        { status: 400 }
      );
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
      phone,
      role: "CUSTOMER",
    }).returning();

    // Generate 6-digit OTP for email verification
    const otp = generateOTP();
    const hashedOTP = hashToken(otp);
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.delete(verificationTokens).where(eq(verificationTokens.identifier, `verify:${email}`));
    await db.insert(verificationTokens).values({
      identifier: `verify:${email}`,
      token: hashedOTP,
      expires,
    });

    sendEmailVerificationOTP({
      email,
      name,
      otp,
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
