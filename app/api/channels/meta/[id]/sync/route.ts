/**
 * Manual Catalog Sync Trigger
 *
 * POST /api/channels/meta/[id]/sync — Trigger full catalog sync
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { salesChannels } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { eq } from "drizzle-orm";
import { syncCatalog } from "@/lib/catalog-sync";
import { audit } from "@/lib/audit";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, ctx: RouteContext) {
  const session = await auth();
  const perm = await requirePermission(session, "channels");
  if (!perm.authorized) {
    return NextResponse.json({ error: perm.error }, { status: 401 });
  }

  const { id } = await ctx.params;

  const channel = await db.query.salesChannels.findFirst({
    where: eq(salesChannels.id, id),
    columns: { id: true, name: true, externalCatalogId: true, status: true },
  });

  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  if (!channel.externalCatalogId) {
    return NextResponse.json(
      { error: "No catalog configured. Select a catalog in channel settings first." },
      { status: 400 },
    );
  }

  try {
    const result = await syncCatalog(id);

    audit({
      action: "CHANNEL_SYNC",
      userId: session!.user!.id!,
      resource: "SalesChannel",
      resourceId: id,
      details: {
        type: "FULL_SYNC",
        totalProducts: result.totalProducts,
        synced: result.synced,
        failed: result.failed,
      },
      success: result.failed === 0,
      error: result.errors.length > 0 ? result.errors[0] : undefined,
    });

    return NextResponse.json({
      totalProducts: result.totalProducts,
      synced: result.synced,
      failed: result.failed,
      errors: result.errors,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";

    audit({
      action: "CHANNEL_SYNC",
      userId: session!.user!.id!,
      resource: "SalesChannel",
      resourceId: id,
      success: false,
      error: message,
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
