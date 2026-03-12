/**
 * Google OAuth Callback Handler
 *
 * GET /api/channels/google/callback?code=...&state=channelId:stateToken
 *
 * Exchanges the authorization code for access + refresh tokens,
 * discovers merchant accounts, and activates the channel.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { salesChannels } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import {
  exchangeGoogleCode,
  listMerchantAccounts,
} from "@/lib/google-merchant";
import { env } from "@/lib/env";
import { audit } from "@/lib/audit";
import type { GoogleCredentials } from "@/lib/google-merchant";

const REDIRECT_URI = `${env.NEXT_PUBLIC_APP_URL}/api/channels/google/callback`;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  // Handle OAuth denial
  if (error) {
    return NextResponse.redirect(
      new URL(`/admin/channels?error=${encodeURIComponent(error)}`, req.url),
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/admin/channels?error=missing_params", req.url),
    );
  }

  // Parse state: "channelId:stateToken"
  const colonIdx = state.indexOf(":");
  if (colonIdx === -1) {
    return NextResponse.redirect(
      new URL("/admin/channels?error=invalid_state", req.url),
    );
  }

  const channelId = state.substring(0, colonIdx);
  const stateToken = state.substring(colonIdx + 1);

  // Validate state against stored channel
  const channel = await db.query.salesChannels.findFirst({
    where: eq(salesChannels.id, channelId),
  });

  if (!channel) {
    return NextResponse.redirect(
      new URL("/admin/channels?error=channel_not_found", req.url),
    );
  }

  let storedState: string | undefined;
  try {
    const creds = JSON.parse(channel.credentials || "{}");
    storedState = creds.oauthState;
  } catch {
    // ignore parse error
  }

  if (!storedState || storedState !== stateToken) {
    return NextResponse.redirect(
      new URL("/admin/channels?error=state_mismatch", req.url),
    );
  }

  try {
    // 1. Exchange code for tokens
    const { accessToken, refreshToken, expiresIn } = await exchangeGoogleCode(code, REDIRECT_URI);
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // 2. Discover merchant accounts
    const accounts = await listMerchantAccounts(accessToken);

    // Store credentials and activate
    const credentials: GoogleCredentials = { accessToken, refreshToken, expiresAt };

    const merchantId = accounts[0]?.id || env.GOOGLE_MERCHANT_CENTER_ID || null;

    await db.update(salesChannels).set({
      name: accounts[0]?.name
        ? `${accounts[0].name} — Google Merchant`
        : "Google Merchant Center",
      status: "ACTIVE",
      credentials: JSON.stringify(credentials),
      externalAccountId: merchantId,
      settings: JSON.stringify({
        autoSync: true,
        syncInventory: true,
        contentLanguage: "en",
        targetCountry: "SA",
        accounts: accounts.map((a) => ({ id: a.id, name: a.name, websiteUrl: a.websiteUrl })),
      }),
    }).where(eq(salesChannels.id, channelId));

    audit({
      action: "CHANNEL_CONNECTED",
      userId: session.user.id!,
      resource: "SalesChannel",
      resourceId: channelId,
      details: { platform: "GOOGLE", merchantId, accountCount: accounts.length },
      success: true,
    });

    return NextResponse.redirect(
      new URL(`/admin/channels?success=google_connected&channelId=${channelId}`, req.url),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Google OAuth callback error:", message);

    audit({
      action: "CHANNEL_CONNECTED",
      userId: session.user.id!,
      resource: "SalesChannel",
      resourceId: channelId,
      success: false,
      error: message,
    });

    // Clean up the temporary channel on failure
    await db.delete(salesChannels).where(eq(salesChannels.id, channelId));

    return NextResponse.redirect(
      new URL(`/admin/channels?error=${encodeURIComponent("Google connection failed: " + message)}`, req.url),
    );
  }
}
