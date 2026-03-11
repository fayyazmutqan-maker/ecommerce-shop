import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { users, verificationTokens } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { sendWelcomeEmail } from "@/lib/email";
import { authLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * GET /api/auth/verify-email?token=xxx — Verify a user's email address
 */
export async function GET(req: Request) {
  const ip = getClientIp(req);
  const rlResponse = await rateLimitResponse(authLimiter, ip);
  if (rlResponse) return rlResponse;

  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return redirectWithMessage("invalid");
    }

    const hashedToken = hashToken(token);

    const verToken = await db.query.verificationTokens.findFirst({
      where: eq(verificationTokens.token, hashedToken),
    });

    if (!verToken || !verToken.identifier.startsWith("verify:")) {
      return redirectWithMessage("invalid");
    }

    if (new Date() > verToken.expires) {
      await db.delete(verificationTokens).where(eq(verificationTokens.token, hashedToken));
      return redirectWithMessage("expired");
    }

    const email = verToken.identifier.replace("verify:", "");

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      return redirectWithMessage("invalid");
    }

    // Mark email as verified
    await db.update(users).set({ emailVerified: new Date() }).where(eq(users.id, user.id));

    // Delete the used token
    await db.delete(verificationTokens).where(eq(verificationTokens.token, hashedToken));

    audit({ action: "AUTH_EMAIL_VERIFIED", email, ip, resource: "user", resourceId: user.id, success: true });

    // Send welcome email now that email is verified
    sendWelcomeEmail({ email, name: user.name || "Customer" }).catch((err) =>
      console.error("Failed to send welcome email:", err)
    );

    return redirectWithMessage("success");
  } catch (error) {
    console.error("Email verification error:", error);
    return redirectWithMessage("error");
  }
}

function redirectWithMessage(status: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return NextResponse.redirect(`${appUrl}/login?verified=${status}`);
}
