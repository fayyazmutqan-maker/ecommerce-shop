/**
 * TikTok Shop OAuth Callback Handler
 *
 * GET /api/channels/tiktok/callback?code=...&state=channelId:stateToken
 *
 * Exchanges the authorization code for access + refresh tokens,
 * discovers authorized shops, and activates the channel.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { salesChannels } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { exchangeCode, getAuthorizedShops } from "@/lib/tiktok-shop";
import type { TikTokCredentials } from "@/lib/tiktok-shop";
import { audit } from "@/lib/audit";

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

  // Look up the pending channel
  const channel = await db.query.salesChannels.findFirst({
    where: eq(salesChannels.id, channelId),
  });

  if (!channel || channel.platform !== "TIKTOK") {
    return NextResponse.redirect(
      new URL("/admin/channels?error=channel_not_found", req.url),
    );
  }

  // Verify CSRF state token
  let storedState: string | undefined;
  try {
    const creds = JSON.parse(channel.credentials || "{}");
    storedState = creds.oauthState;
  } catch {
    // Invalid JSON
  }

  if (!storedState || storedState !== stateToken) {
    // Clean up the orphaned channel
    await db.delete(salesChannels).where(eq(salesChannels.id, channelId));
    return NextResponse.redirect(
      new URL("/admin/channels?error=invalid_state_token", req.url),
    );
  }

  try {
    // Exchange code for tokens
    const tokenData = await exchangeCode(code);

    const credentials: TikTokCredentials = {
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      expiresAt: new Date(Date.now() + tokenData.expiresIn * 1000).toISOString(),
      openId: tokenData.openId,
    };

    // Discover authorized shops
    let shops: { id: string; name: string; region: string }[] = [];
    try {
      shops = await getAuthorizedShops(credentials.accessToken);
    } catch {
      // Non-blocking — user can select shop later in settings
    }

    const primaryShop = shops[0];
    const channelName = tokenData.sellerName
      || primaryShop?.name
      || "TikTok Shop";

    // Update channel with credentials and activate
    await db.update(salesChannels)
      .set({
        name: channelName,
        status: "ACTIVE",
        credentials: JSON.stringify(credentials),
        externalAccountId: primaryShop?.id || null,
        settings: JSON.stringify({
          autoSync: true,
          syncInventory: true,
          syncOrders: true,
          region: primaryShop?.region || null,
          shops: shops.map((s) => ({ id: s.id, name: s.name, region: s.region })),
        }),
      })
      .where(eq(salesChannels.id, channelId));

    audit({
      action: "CHANNEL_CONNECTED",
      userId: session.user.id!,
      resource: "SalesChannel",
      resourceId: channelId,
      details: {
        platform: "TIKTOK",
        shopId: primaryShop?.id,
        shopName: channelName,
        shopCount: shops.length,
      },
      success: true,
    });

    return NextResponse.redirect(
      new URL("/admin/channels?connected=tiktok", req.url),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    // Clean up the failed channel
    await db.delete(salesChannels).where(eq(salesChannels.id, channelId));

    audit({
      action: "CHANNEL_CONNECTED",
      userId: session.user.id!,
      resource: "SalesChannel",
      resourceId: channelId,
      details: { platform: "TIKTOK", error: message },
      success: false,
    });

    return NextResponse.redirect(
      new URL(`/admin/channels?error=${encodeURIComponent(message)}`, req.url),
    );
  }
}
