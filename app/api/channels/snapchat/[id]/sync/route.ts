/**
 * Snapchat Sync API
 *
 * POST /api/channels/snapchat/[id]/sync — Trigger full product catalog sync
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { salesChannels } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { eq } from "drizzle-orm";
import { syncSnapchatCatalog } from "@/lib/snapchat-catalog-sync";
import { audit } from "@/lib/audit";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_req: Request, ctx: RouteContext) {
  const session = await auth();
  const perm = await requirePermission(session, "channels");
  if (!perm.authorized) {
    return NextResponse.json({ error: perm.error }, { status: 401 });
  }

  const { id } = await ctx.params;

  const channel = await db.query.salesChannels.findFirst({
    where: eq(salesChannels.id, id),
  });

  if (!channel || channel.platform !== "SNAPCHAT") {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  if (!channel.externalCatalogId) {
    return NextResponse.json(
      { error: "No catalog configured. Select a catalog in channel settings." },
      { status: 400 },
    );
  }

  try {
    const result = await syncSnapchatCatalog(id);

    audit({
      action: "CHANNEL_SYNC",
      userId: session!.user!.id!,
      resource: "SalesChannel",
      resourceId: id,
      details: {
        platform: "SNAPCHAT",
        totalProducts: result.totalProducts,
        synced: result.synced,
        failed: result.failed,
      },
      success: true,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";

    audit({
      action: "CHANNEL_SYNC",
      userId: session!.user!.id!,
      resource: "SalesChannel",
      resourceId: id,
      details: { platform: "SNAPCHAT", error: message },
      success: false,
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
