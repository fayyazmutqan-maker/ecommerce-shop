/**
 * Snapchat OAuth Callback Handler
 *
 * GET /api/channels/snapchat/callback?code=...&state=channelId:stateToken
 *
 * Exchanges the authorization code for access + refresh tokens,
 * discovers organizations and catalogs, and activates the channel.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { salesChannels } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import {
  exchangeCode,
  getOrganizations,
  getCatalogs,
  getAdAccounts,
} from "@/lib/snapchat";
import type { SnapchatCredentials } from "@/lib/snapchat";
import { audit } from "@/lib/audit";
import { env } from "@/lib/env";

const REDIRECT_URI = `${env.NEXT_PUBLIC_APP_URL}/api/channels/snapchat/callback`;

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

  if (!channel || channel.platform !== "SNAPCHAT") {
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
    const tokenData = await exchangeCode(code, REDIRECT_URI);

    const credentials: SnapchatCredentials = {
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      expiresAt: new Date(Date.now() + tokenData.expiresIn * 1000).toISOString(),
    };

    // Discover organizations and ad accounts
    let organizations: { id: string; name: string; country?: string }[] = [];
    let catalogs: { id: string; name: string }[] = [];
    try {
      organizations = await getOrganizations(credentials.accessToken);
      if (organizations.length > 0) {
        catalogs = await getCatalogs(credentials.accessToken, organizations[0].id);
      }
    } catch {
      // Non-blocking — user can configure in settings
    }

    const primaryOrg = organizations[0];
    const primaryCatalog = catalogs[0];
    const channelName = primaryOrg?.name || "Snapchat Catalog";

    // Update channel with credentials and activate
    await db.update(salesChannels)
      .set({
        name: channelName,
        status: "ACTIVE",
        credentials: JSON.stringify(credentials),
        externalAccountId: primaryOrg?.id || null,
        externalCatalogId: primaryCatalog?.id || null,
        settings: JSON.stringify({
          autoSync: true,
          syncInventory: true,
          organizations: organizations.map((o) => ({
            id: o.id,
            name: o.name,
            country: o.country,
          })),
          catalogs: catalogs.map((c) => ({ id: c.id, name: c.name })),
        }),
      })
      .where(eq(salesChannels.id, channelId));

    audit({
      action: "CHANNEL_CONNECTED",
      userId: session.user.id!,
      resource: "SalesChannel",
      resourceId: channelId,
      details: {
        platform: "SNAPCHAT",
        organizationId: primaryOrg?.id,
        organizationName: channelName,
        catalogId: primaryCatalog?.id,
        orgCount: organizations.length,
      },
      success: true,
    });

    return NextResponse.redirect(
      new URL("/admin/channels?connected=snapchat", req.url),
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
      details: { platform: "SNAPCHAT", error: message },
      success: false,
    });

    return NextResponse.redirect(
      new URL(`/admin/channels?error=${encodeURIComponent(message)}`, req.url),
    );
  }
}
