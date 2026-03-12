/**
 * Individual WhatsApp Channel API
 *
 * GET    /api/channels/whatsapp/[id] — Get channel details + sync stats
 * PATCH  /api/channels/whatsapp/[id] — Update settings (catalog, sync config)
 * DELETE /api/channels/whatsapp/[id] — Disconnect and remove channel
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { salesChannels, channelProducts, channelOrders, channelSyncLogs } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { eq, count } from "drizzle-orm";
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

  if (!channel || channel.platform !== "WHATSAPP") {
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
  catalogId: z.string().optional(),
  settings: z.object({
    autoSync: z.boolean().optional(),
    syncInventory: z.boolean().optional(),
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
  if (!channel || channel.platform !== "WHATSAPP") {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};

  if (parsed.data.name) updates.name = parsed.data.name;
  if (parsed.data.catalogId) updates.externalCatalogId = parsed.data.catalogId;
  if (parsed.data.status) updates.status = parsed.data.status;

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
    action: "SETTINGS_UPDATE",
    userId: session!.user!.id!,
    resource: "SalesChannel",
    resourceId: id,
    details: { platform: "WHATSAPP", updates: Object.keys(parsed.data) },
    success: true,
  });

  const updated = await db.query.salesChannels.findFirst({
    where: eq(salesChannels.id, id),
    columns: {
      id: true, name: true, platform: true, status: true,
      externalAccountId: true, externalPageId: true, externalCatalogId: true,
      settings: true, lastSyncAt: true, lastSyncStatus: true,
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
  if (!channel || channel.platform !== "WHATSAPP") {
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
