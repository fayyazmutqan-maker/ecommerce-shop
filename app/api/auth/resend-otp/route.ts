import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { users, verificationTokens } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { sendEmailVerificationOTP } from "@/lib/email";
import { authLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { z } from "zod";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Generate a cryptographically secure 6-digit OTP */
function generateOTP(): string {
  const bytes = crypto.randomBytes(4);
  const num = bytes.readUInt32BE(0) % 1000000;
  return num.toString().padStart(6, "0");
}

const resendSchema = z.object({
  email: z.string().email(),
});

/**
 * POST /api/auth/resend-otp — Resend a new OTP verification code
 */
export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rlResponse = await rateLimitResponse(authLimiter, ip);
  if (rlResponse) return rlResponse;

  try {
    const body = await req.json();
    const parsed = resendSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid email address." },
        { status: 400 }
      );
    }

    const email = parsed.data.email.trim().toLowerCase();

    // Find the user — don't reveal whether user exists
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user || user.emailVerified) {
      // Return success to prevent email enumeration
      return NextResponse.json({ message: "If an unverified account exists, a new code has been sent." });
    }

    // Generate new OTP
    const otp = generateOTP();
    const hashedOTP = hashToken(otp);
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete old token and insert new one
    await db.delete(verificationTokens).where(eq(verificationTokens.identifier, `verify:${email}`));
    await db.insert(verificationTokens).values({
      identifier: `verify:${email}`,
      token: hashedOTP,
      expires,
    });

    sendEmailVerificationOTP({
      email,
      name: user.name || "Customer",
      otp,
    }).catch((err) =>
      console.error("Failed to resend verification email:", err)
    );

    audit({ action: "AUTH_OTP_RESEND", email, ip, resource: "otp", success: true });

    return NextResponse.json({ message: "If an unverified account exists, a new code has been sent." });
  } catch (error) {
    console.error("OTP resend error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
