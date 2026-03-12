/**
 * TikTok Shop Channel Details API
 *
 * GET    /api/channels/tiktok/[id]  — Get channel details + stats
 * PATCH  /api/channels/tiktok/[id]  — Update channel settings
 * DELETE /api/channels/tiktok/[id]  — Disconnect channel
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { salesChannels, channelProducts, channelOrders, channelSyncLogs } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { eq, and, count, desc } from "drizzle-orm";
import { z } from "zod";
import { audit } from "@/lib/audit";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET — Channel details with stats
export async function GET(_req: Request, ctx: RouteContext) {
  const session = await auth();
  const perm = await requirePermission(session, "channels");
  if (!perm.authorized) {
    return NextResponse.json({ error: perm.error }, { status: 401 });
  }

  const { id } = await ctx.params;

  const channel = await db.query.salesChannels.findFirst({
    where: eq(salesChannels.id, id),
  });

  if (!channel || channel.platform !== "TIKTOK") {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  // Fetch stats in parallel
  const [syncedProducts, importedOrders, recentLogs] = await Promise.all([
    db.select({ count: count() }).from(channelProducts).where(eq(channelProducts.channelId, id)),
    db.select({ count: count() }).from(channelOrders).where(eq(channelOrders.channelId, id)),
    db.query.channelSyncLogs.findMany({
      where: eq(channelSyncLogs.channelId, id),
      orderBy: [desc(channelSyncLogs.createdAt)],
      limit: 10,
    }),
  ]);

  let parsedSettings: Record<string, unknown> = {};
  try {
    parsedSettings = JSON.parse(channel.settings || "{}");
  } catch {
    // malformed JSON
  }

  return NextResponse.json({
    ...channel,
    credentials: undefined, // Never expose tokens
    stats: {
      syncedProducts: syncedProducts[0]?.count || 0,
      importedOrders: importedOrders[0]?.count || 0,
    },
    parsedSettings,
    recentLogs,
  });
}

// PATCH — Update channel settings
const updateSchema = z.object({
  name: z.string().min(1).optional(),
  shopId: z.string().optional(),
  status: z.enum(["ACTIVE", "PAUSED"]).optional(),
  settings: z.object({
    autoSync: z.boolean().optional(),
    syncInventory: z.boolean().optional(),
    syncOrders: z.boolean().optional(),
    defaultCategoryId: z.string().optional(),
    warehouseId: z.string().optional(),
  }).optional(),
}).strict();

export async function PATCH(req: Request, ctx: RouteContext) {
  const session = await auth();
  const perm = await requirePermission(session, "channels");
  if (!perm.authorized) {
    return NextResponse.json({ error: perm.error }, { status: 401 });
  }

  const { id } = await ctx.params;

  const channel = await db.query.salesChannels.findFirst({
    where: eq(salesChannels.id, id),
  });

  if (!channel || channel.platform !== "TIKTOK") {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (parsed.data.name) updates.name = parsed.data.name;
  if (parsed.data.shopId) updates.externalAccountId = parsed.data.shopId;
  if (parsed.data.status) updates.status = parsed.data.status;

  if (parsed.data.settings) {
    const existingSettings = JSON.parse(channel.settings || "{}");
    updates.settings = JSON.stringify({ ...existingSettings, ...parsed.data.settings });
  }

  await db.update(salesChannels).set(updates).where(eq(salesChannels.id, id));

  audit({
    action: "ADMIN_ACTION",
    userId: session!.user!.id!,
    resource: "SalesChannel",
    resourceId: id,
    details: { platform: "TIKTOK", action: "update", changes: Object.keys(parsed.data) },
    success: true,
  });

  return NextResponse.json({ success: true });
}

// DELETE — Disconnect channel
export async function DELETE(_req: Request, ctx: RouteContext) {
  const session = await auth();
  const perm = await requirePermission(session, "channels");
  if (!perm.authorized) {
    return NextResponse.json({ error: perm.error }, { status: 401 });
  }

  const { id } = await ctx.params;

  const channel = await db.query.salesChannels.findFirst({
    where: eq(salesChannels.id, id),
  });

  if (!channel || channel.platform !== "TIKTOK") {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  // Cascade delete handles channelProducts, channelOrders, channelSyncLogs
  await db.delete(salesChannels).where(eq(salesChannels.id, id));

  audit({
    action: "CHANNEL_DISCONNECTED",
    userId: session!.user!.id!,
    resource: "SalesChannel",
    resourceId: id,
    details: { platform: "TIKTOK", name: channel.name },
    success: true,
  });

  return NextResponse.json({ success: true });
}
