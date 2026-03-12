/**
 * Snapchat Product Listing API
 *
 * GET /api/channels/snapchat/[id]/products — Get product items from Snapchat catalog
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { salesChannels } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { eq } from "drizzle-orm";
import { getProductItems, getChannelToken } from "@/lib/snapchat";
import type { SnapchatCredentials } from "@/lib/snapchat";

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

  if (!channel || channel.platform !== "SNAPCHAT") {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  if (!channel.externalCatalogId) {
    return NextResponse.json({ error: "No catalog configured" }, { status: 400 });
  }

  let credentials: SnapchatCredentials;
  try {
    credentials = JSON.parse(channel.credentials || "{}");
  } catch {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  }

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 100);
  const cursor = url.searchParams.get("cursor") || undefined;

  const accessToken = await getChannelToken(id, credentials);

  try {
    const result = await getProductItems(
      accessToken,
      channel.externalCatalogId,
      limit,
      cursor,
    );

    return NextResponse.json({
      products: result.products,
      nextCursor: result.nextCursor,
      limit,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch products";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
