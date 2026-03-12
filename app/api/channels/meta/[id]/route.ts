/**
 * Individual Meta Channel API
 *
 * GET    /api/channels/meta/[id] — Get channel details + discovery data
 * PATCH  /api/channels/meta/[id] — Update settings (page, catalog, pixel, sync config)
 * DELETE /api/channels/meta/[id] — Disconnect and remove channel
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { salesChannels, channelProducts, channelOrders, channelSyncLogs } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { eq, count } from "drizzle-orm";
import { getPages, getCatalogs, getBusinessAccounts, getInstagramAccounts, createCatalog } from "@/lib/meta";
import type { MetaCredentials } from "@/lib/meta";
import { z } from "zod";
import { audit } from "@/lib/audit";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, ctx: RouteContext) {
  const session = await auth();
  const perm = await requirePermission(session, "channels");
  if (!perm.authorized) {
    return NextResponse.json({ error: perm.error }, { status: 401 });
  }

  const { id } = await ctx.params;

  const channel = await db.query.salesChannels.findFirst({
    where: eq(salesChannels.id, id),
  });

  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  // Get sync stats
  const [productStats, orderStats, recentLogs] = await Promise.all([
    db.select({ count: count() }).from(channelProducts).where(eq(channelProducts.channelId, id)),
    db.select({ count: count() }).from(channelOrders).where(eq(channelOrders.channelId, id)),
    db.query.channelSyncLogs.findMany({
      where: eq(channelSyncLogs.channelId, id),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      limit: 10,
    }),
  ]);

  // Parse settings for discovery data, but strip credentials from response
  let settings = {};
  try {
    settings = JSON.parse(channel.settings || "{}");
  } catch {
    // ignore
  }

  return NextResponse.json({
    ...channel,
    credentials: undefined, // Never expose tokens
    stats: {
      syncedProducts: productStats[0]?.count || 0,
      importedOrders: orderStats[0]?.count || 0,
    },
    parsedSettings: settings,
    recentLogs,
  });
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  pageId: z.string().optional(),
  catalogId: z.string().optional(),
  pixelId: z.string().optional(),
  createCatalog: z.string().optional(), // If set, create new catalog with this name
  platform: z.enum(["FACEBOOK", "INSTAGRAM"]).optional(),
  settings: z.object({
    autoSync: z.boolean().optional(),
    syncInventory: z.boolean().optional(),
    syncOrders: z.boolean().optional(),
  }).optional(),
  status: z.enum(["ACTIVE", "PAUSED"]).optional(),
}).strict();

export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await auth();
  const perm = await requirePermission(session, "channels");
  if (!perm.authorized) {
    return NextResponse.json({ error: perm.error }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const channel = await db.query.salesChannels.findFirst({
    where: eq(salesChannels.id, id),
  });
  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  let credentials: MetaCredentials;
  try {
    credentials = JSON.parse(channel.credentials || "{}");
  } catch {
    return NextResponse.json({ error: "Channel credentials corrupted" }, { status: 500 });
  }

  const updates: Record<string, unknown> = {};

  if (parsed.data.name) updates.name = parsed.data.name;
  if (parsed.data.platform) updates.platform = parsed.data.platform;
  if (parsed.data.pageId) updates.externalPageId = parsed.data.pageId;
  if (parsed.data.pixelId) updates.pixelId = parsed.data.pixelId;
  if (parsed.data.status) updates.status = parsed.data.status;

  // Create new catalog if requested
  if (parsed.data.createCatalog && channel.externalAccountId && credentials.accessToken) {
    const newCatalogId = await createCatalog(
      channel.externalAccountId,
      parsed.data.createCatalog,
      credentials.accessToken,
    );
    updates.externalCatalogId = newCatalogId;
  } else if (parsed.data.catalogId) {
    updates.externalCatalogId = parsed.data.catalogId;
  }

  // Merge settings
  if (parsed.data.settings) {
    let existingSettings = {};
    try {
      existingSettings = JSON.parse(channel.settings || "{}");
    } catch {
      // ignore
    }
    updates.settings = JSON.stringify({ ...existingSettings, ...parsed.data.settings });
  }

  await db.update(salesChannels).set(updates).where(eq(salesChannels.id, id));

  audit({
    action: "CHANNEL_CONNECTED",
    userId: session!.user!.id!,
    resource: "SalesChannel",
    resourceId: id,
    details: { updates: Object.keys(parsed.data) },
    success: true,
  });

  const updated = await db.query.salesChannels.findFirst({
    where: eq(salesChannels.id, id),
    columns: {
      id: true, name: true, platform: true, status: true,
      externalAccountId: true, externalPageId: true, externalCatalogId: true,
      pixelId: true, settings: true, lastSyncAt: true, lastSyncStatus: true,
      syncedProductCount: true, createdAt: true, updatedAt: true,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, ctx: RouteContext) {
  const session = await auth();
  const perm = await requirePermission(session, "channels");
  if (!perm.authorized) {
    return NextResponse.json({ error: perm.error }, { status: 401 });
  }

  const { id } = await ctx.params;

  const channel = await db.query.salesChannels.findFirst({
    where: eq(salesChannels.id, id),
    columns: { id: true, name: true, platform: true },
  });
  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  // Cascade delete handles channelProducts, channelOrders, channelSyncLogs
  await db.delete(salesChannels).where(eq(salesChannels.id, id));

  audit({
    action: "CHANNEL_DISCONNECTED",
    userId: session!.user!.id!,
    resource: "SalesChannel",
    resourceId: id,
    details: { platform: channel.platform, name: channel.name },
    success: true,
  });

  return NextResponse.json({ message: "Channel disconnected" });
}
