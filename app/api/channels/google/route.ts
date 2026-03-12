/**
 * Google Merchant Center Channel Management API
 *
 * GET  /api/channels/google          — List all Google channels
 * POST /api/channels/google          — Initiate OAuth connection
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { salesChannels } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { eq } from "drizzle-orm";
import { getGoogleOAuthUrl } from "@/lib/google-merchant";
import { env } from "@/lib/env";
import { z } from "zod";
import { audit } from "@/lib/audit";
import crypto from "crypto";

const REDIRECT_URI = `${env.NEXT_PUBLIC_APP_URL}/api/channels/google/callback`;

// GET — List all Google sales channels
export async function GET() {
  const session = await auth();
  const perm = await requirePermission(session, "channels");
  if (!perm.authorized) {
    return NextResponse.json({ error: perm.error }, { status: 401 });
  }

  const channels = await db.query.salesChannels.findMany({
    where: eq(salesChannels.platform, "GOOGLE"),
    columns: {
      id: true,
      name: true,
      platform: true,
      status: true,
      externalAccountId: true,
      externalPageId: true,
      externalCatalogId: true,
      settings: true,
      lastSyncAt: true,
      lastSyncStatus: true,
      syncedProductCount: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(channels);
}

// POST — Initiate OAuth flow
const createSchema = z.object({
  action: z.enum(["oauth"]),
});

export async function POST(req: Request) {
  const session = await auth();
  const perm = await requirePermission(session, "channels");
  if (!perm.authorized) {
    return NextResponse.json({ error: perm.error }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." },
      { status: 400 },
    );
  }

  // Generate CSRF state token
  const state = crypto.randomBytes(32).toString("hex");

  // Store state in a temporary channel record
  const [channel] = await db.insert(salesChannels).values({
    name: "Google Merchant Center (Connecting...)",
    platform: "GOOGLE",
    status: "DISCONNECTED",
    credentials: JSON.stringify({ oauthState: state }),
  }).returning({ id: salesChannels.id });

  const oauthUrl = getGoogleOAuthUrl(REDIRECT_URI, `${channel.id}:${state}`);

  audit({
    action: "CHANNEL_OAUTH_INITIATED",
    userId: session!.user!.id!,
    resource: "SalesChannel",
    resourceId: channel.id,
    details: { platform: "GOOGLE" },
    success: true,
  });

  return NextResponse.json({ oauthUrl, channelId: channel.id });
}
