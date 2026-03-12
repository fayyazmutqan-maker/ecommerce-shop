/**
 * Meta OAuth Callback Handler
 *
 * GET /api/channels/meta/callback?code=...&state=channelId:stateToken
 *
 * Exchanges the authorization code for a long-lived token,
 * discovers pages/catalogs, and activates the channel.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { salesChannels } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import {
  exchangeCodeForToken,
  getLongLivedToken,
  getPages,
  getBusinessAccounts,
  getCatalogs,
} from "@/lib/meta";
import { env } from "@/lib/env";
import { audit } from "@/lib/audit";
import type { MetaCredentials } from "@/lib/meta";

const REDIRECT_URI = `${env.NEXT_PUBLIC_APP_URL}/api/channels/meta/callback`;

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
    // 1. Exchange code for short-lived token
    const { accessToken: shortToken } = await exchangeCodeForToken(code, REDIRECT_URI);

    // 2. Exchange for long-lived token (60 days)
    const { accessToken, expiresIn } = await getLongLivedToken(shortToken);
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // 3. Discover pages and business accounts
    const [pages, businesses] = await Promise.all([
      getPages(accessToken),
      getBusinessAccounts(accessToken),
    ]);

    // 4. Discover catalogs if business account found
    let catalogs: { id: string; name: string; product_count: number }[] = [];
    if (businesses.length > 0) {
      catalogs = await getCatalogs(businesses[0].id, accessToken);
    }

    // Store credentials and discovery data
    const credentials: MetaCredentials = { accessToken, expiresAt };

    await db.update(salesChannels).set({
      name: pages[0]?.name ? `${pages[0].name} — Meta Commerce` : "Meta Commerce",
      status: "ACTIVE",
      credentials: JSON.stringify(credentials),
      externalAccountId: businesses[0]?.id || null,
      externalPageId: pages[0]?.id || null,
      externalCatalogId: catalogs[0]?.id || null,
      settings: JSON.stringify({
        autoSync: true,
        syncInventory: true,
        syncOrders: true,
        discoveredPages: pages,
        discoveredBusinesses: businesses,
        discoveredCatalogs: catalogs,
      }),
    }).where(eq(salesChannels.id, channelId));

    audit({
      action: "CHANNEL_CONNECTED",
      userId: session.user.id!,
      resource: "SalesChannel",
      resourceId: channelId,
      details: {
        platform: "FACEBOOK",
        pageId: pages[0]?.id,
        businessId: businesses[0]?.id,
        catalogCount: catalogs.length,
      },
      success: true,
    });

    // Redirect to admin channels page with success
    return NextResponse.redirect(
      new URL(`/admin/channels?connected=${channelId}`, req.url),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    audit({
      action: "CHANNEL_CONNECTED",
      userId: session.user.id!,
      resource: "SalesChannel",
      resourceId: channelId,
      success: false,
      error: message,
    });

    // Clean up the pending channel
    await db.update(salesChannels).set({
      status: "ERROR",
      lastSyncError: message,
    }).where(eq(salesChannels.id, channelId));

    return NextResponse.redirect(
      new URL(`/admin/channels?error=${encodeURIComponent(message)}`, req.url),
    );
  }
}
