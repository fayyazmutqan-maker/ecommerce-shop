/**
 * Meta (Facebook/Instagram) Channel Management API
 *
 * GET  /api/channels/meta          — List all Meta channels
 * POST /api/channels/meta          — Create/initiate OAuth connection
 * GET  /api/channels/meta/callback — OAuth callback handler
 * GET  /api/channels/meta/[id]     — Get channel details
 * PATCH /api/channels/meta/[id]    — Update channel settings
 * DELETE /api/channels/meta/[id]   — Disconnect channel
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { salesChannels } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { eq, and, or } from "drizzle-orm";
import { getOAuthUrl, getPages, getBusinessAccounts, getCatalogs, getInstagramAccounts } from "@/lib/meta";
import { env } from "@/lib/env";
import { z } from "zod";
import { audit } from "@/lib/audit";
import crypto from "crypto";

const REDIRECT_URI = `${env.NEXT_PUBLIC_APP_URL}/api/channels/meta/callback`;

// GET — List all Meta sales channels
export async function GET() {
  const session = await auth();
  const perm = await requirePermission(session, "channels");
  if (!perm.authorized) {
    return NextResponse.json({ error: perm.error }, { status: 401 });
  }

  const channels = await db.query.salesChannels.findMany({
    where: or(eq(salesChannels.platform, "FACEBOOK"), eq(salesChannels.platform, "INSTAGRAM")),
    columns: {
      id: true,
      name: true,
      platform: true,
      status: true,
      externalAccountId: true,
      externalPageId: true,
      externalCatalogId: true,
      pixelId: true,
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

// POST — Initiate OAuth flow or create channel with existing token
const createSchema = z.object({
  action: z.enum(["oauth", "setup"]),
  // For "setup" action — when OAuth is already completed
  name: z.string().min(1).optional(),
  platform: z.enum(["FACEBOOK", "INSTAGRAM"]).optional(),
  pageId: z.string().optional(),
  catalogId: z.string().optional(),
  pixelId: z.string().optional(),
  businessId: z.string().optional(),
  settings: z.object({
    autoSync: z.boolean().default(true),
    syncInventory: z.boolean().default(true),
    syncOrders: z.boolean().default(true),
  }).optional(),
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

  const { action } = parsed.data;

  if (action === "oauth") {
    if (!env.META_APP_ID || !env.META_APP_SECRET) {
      return NextResponse.json(
        { error: "Meta App credentials not configured. Set META_APP_ID and META_APP_SECRET." },
        { status: 400 },
      );
    }

    // Generate CSRF state token
    const state = crypto.randomBytes(32).toString("hex");

    // Store state in a temporary channel record so we can verify on callback
    const [channel] = await db.insert(salesChannels).values({
      name: "Meta Commerce (Connecting...)",
      platform: "FACEBOOK",
      status: "DISCONNECTED",
      credentials: JSON.stringify({ oauthState: state }),
    }).returning({ id: salesChannels.id });

    const oauthUrl = getOAuthUrl(REDIRECT_URI, `${channel.id}:${state}`);

    audit({
      action: "CHANNEL_OAUTH_INITIATED",
      userId: session!.user!.id!,
      resource: "SalesChannel",
      resourceId: channel.id,
      success: true,
    });

    return NextResponse.json({ oauthUrl, channelId: channel.id });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
