import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, verificationTokens } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendPasswordReset } from "@/lib/email";
import { createId } from "@paralleldrive/cuid2";
import { passwordResetLimiter, authLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

const forgotSchema = z.object({
  email: z.string().email(),
});

const resetSchema = z.object({
  token: z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/, "Invalid token format"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
});

// POST — request password reset
export async function POST(req: Request) {
  // Rate-limit password reset requests to prevent email flooding
  const ip = getClientIp(req);
  const rlResponse = await rateLimitResponse(passwordResetLimiter, ip);
  if (rlResponse) {
    audit({ action: "RATE_LIMIT_HIT", ip, resource: "password-reset", success: false });
    return rlResponse;
  }

  try {
    const body = await req.json();
    const parsed = forgotSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { email } = parsed.data;
    const user = await db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });

    // Always return success even if user not found (prevent email enumeration)
    if (!user || !user.password) {
      // Perform a dummy hash to prevent timing side-channel
      await bcrypt.hash("dummy-password-for-timing", 12);
      return NextResponse.json({ message: "If that email exists, a reset link has been sent" });
    }

    // Generate reset token
    const token = createId();
    const hashedToken = hashToken(token);
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Remove any existing tokens for this email
    await db.delete(verificationTokens).where(eq(verificationTokens.identifier, email.toLowerCase()));

    // Store hashed token in DB
    await db.insert(verificationTokens).values({
      identifier: email.toLowerCase(),
      token: hashedToken,
      expires,
    });

    // Send plain token in email (user presents it, we hash and compare)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    await sendPasswordReset({
      email,
      name: user.name || "Customer",
      resetUrl: `${appUrl}/reset-password?token=${token}`,
    });

    return NextResponse.json({ message: "If that email exists, a reset link has been sent" });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}

// PUT — reset password with token
export async function PUT(req: Request) {
  // Rate-limit actual resets to prevent token brute-forcing
  const ip = getClientIp(req);
  const rlResponse = await rateLimitResponse(authLimiter, ip);
  if (rlResponse) {
    audit({ action: "RATE_LIMIT_HIT", ip, resource: "password-reset-put", success: false });
    return rlResponse;
  }

  try {
    const body = await req.json();
    const parsed = resetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { token, password } = parsed.data;

    // Hash the incoming token for lookup
    const hashedToken = hashToken(token);

    // Find and validate token
    const verToken = await db.query.verificationTokens.findFirst({
      where: eq(verificationTokens.token, hashedToken),
    });

    if (!verToken) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }

    if (new Date() > verToken.expires) {
      await db.delete(verificationTokens).where(eq(verificationTokens.token, hashedToken));
      return NextResponse.json({ error: "Reset link has expired" }, { status: 400 });
    }

    // Find user
    const user = await db.query.users.findFirst({
      where: eq(users.email, verToken.identifier),
    });

    if (!user) {
      // Use the same generic error to prevent email enumeration
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }

    // Hash new password and update
    const hashedPassword = await bcrypt.hash(password, 12);
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, user.id));

    // Delete used token
    await db.delete(verificationTokens).where(eq(verificationTokens.token, hashedToken));

    audit({ action: "AUTH_PASSWORD_RESET", email: user.email!, ip, resource: "user", resourceId: user.id, success: true });

    return NextResponse.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
