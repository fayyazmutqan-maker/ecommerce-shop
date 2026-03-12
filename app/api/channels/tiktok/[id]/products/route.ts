/**
 * TikTok Shop Product Statuses API
 *
 * GET /api/channels/tiktok/[id]/products — Get product listing status from TikTok
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { salesChannels } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { eq } from "drizzle-orm";
import { searchProducts, getChannelToken } from "@/lib/tiktok-shop";
import type { TikTokCredentials } from "@/lib/tiktok-shop";

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

  if (!channel || channel.platform !== "TIKTOK") {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  if (!channel.externalAccountId) {
    return NextResponse.json({ error: "No shop configured" }, { status: 400 });
  }

  let credentials: TikTokCredentials;
  try {
    credentials = JSON.parse(channel.credentials || "{}");
  } catch {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  }

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const pageSize = Math.min(parseInt(url.searchParams.get("pageSize") || "20", 10), 50);
  const statusFilter = url.searchParams.get("status");

  const accessToken = await getChannelToken(id, credentials);

  try {
    const result = await searchProducts(
      accessToken,
      channel.externalAccountId,
      pageSize,
      page,
      statusFilter ? parseInt(statusFilter, 10) : undefined,
    );

    return NextResponse.json({
      products: result.products,
      total: result.total,
      page,
      pageSize,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch products";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
