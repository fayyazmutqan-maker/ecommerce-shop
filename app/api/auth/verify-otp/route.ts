import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { users, verificationTokens } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { sendWelcomeEmail } from "@/lib/email";
import { authLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { z } from "zod";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

const verifySchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6).regex(/^\d{6}$/, "OTP must be 6 digits"),
});

/**
 * POST /api/auth/verify-otp — Verify email with 6-digit OTP code
 */
export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rlResponse = await rateLimitResponse(authLimiter, ip);
  if (rlResponse) return rlResponse;

  try {
    const body = await req.json();
    const parsed = verifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid verification code. Please enter a 6-digit code." },
        { status: 400 }
      );
    }

    const email = parsed.data.email.trim().toLowerCase();
    const hashedOTP = hashToken(parsed.data.otp);

    const verToken = await db.query.verificationTokens.findFirst({
      where: eq(verificationTokens.identifier, `verify:${email}`),
    });

    if (!verToken) {
      return NextResponse.json(
        { error: "No verification pending for this email. Please register first." },
        { status: 400 }
      );
    }

    // Timing-safe comparison of hashed OTP
    const expectedBuffer = Buffer.from(verToken.token, "hex");
    const receivedBuffer = Buffer.from(hashedOTP, "hex");

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      audit({ action: "AUTH_OTP_VERIFY", email, ip, resource: "otp", success: false });
      return NextResponse.json(
        { error: "Invalid verification code. Please try again." },
        { status: 400 }
      );
    }

    // Check expiration
    if (new Date() > verToken.expires) {
      await db.delete(verificationTokens).where(eq(verificationTokens.identifier, `verify:${email}`));
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Find the user
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 400 }
      );
    }

    // Mark email as verified
    await db.update(users).set({ emailVerified: new Date() }).where(eq(users.id, user.id));

    // Delete the used token
    await db.delete(verificationTokens).where(eq(verificationTokens.identifier, `verify:${email}`));

    audit({ action: "AUTH_EMAIL_VERIFIED", email, ip, resource: "user", resourceId: user.id, success: true });

    // Send welcome email
    sendWelcomeEmail({ email, name: user.name || "Customer" }).catch((err) =>
      console.error("Failed to send welcome email:", err)
    );

    return NextResponse.json({ message: "Email verified successfully!" });
  } catch (error) {
    console.error("OTP verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
