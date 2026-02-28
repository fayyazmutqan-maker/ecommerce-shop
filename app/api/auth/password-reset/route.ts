import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, verificationTokens } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { sendPasswordReset } from "@/lib/email";
import { createId } from "@paralleldrive/cuid2";

const forgotSchema = z.object({
  email: z.string().email(),
});

const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(100),
});

// POST — request password reset
export async function POST(req: Request) {
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
      return NextResponse.json({ message: "If that email exists, a reset link has been sent" });
    }

    // Generate reset token
    const token = createId();
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Remove any existing tokens for this email
    await db.delete(verificationTokens).where(eq(verificationTokens.identifier, email.toLowerCase()));

    // Create new token
    await db.insert(verificationTokens).values({
      identifier: email.toLowerCase(),
      token,
      expires,
    });

    // Send email
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
  try {
    const body = await req.json();
    const parsed = resetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { token, password } = parsed.data;

    // Find and validate token
    const verToken = await db.query.verificationTokens.findFirst({
      where: eq(verificationTokens.token, token),
    });

    if (!verToken) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }

    if (new Date() > verToken.expires) {
      await db.delete(verificationTokens).where(eq(verificationTokens.token, token));
      return NextResponse.json({ error: "Reset link has expired" }, { status: 400 });
    }

    // Find user
    const user = await db.query.users.findFirst({
      where: eq(users.email, verToken.identifier),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Hash new password and update
    const hashedPassword = await bcrypt.hash(password, 12);
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, user.id));

    // Delete used token
    await db.delete(verificationTokens).where(eq(verificationTokens.token, token));

    return NextResponse.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
