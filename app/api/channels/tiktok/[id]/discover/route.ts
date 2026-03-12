/**
 * TikTok Shop Discovery API
 *
 * POST /api/channels/tiktok/[id]/discover — Fetch shops, categories, warehouses
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { salesChannels } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { eq } from "drizzle-orm";
import {
  getAuthorizedShops,
  getCategories,
  getWarehouses,
  getChannelToken,
} from "@/lib/tiktok-shop";
import type { TikTokCredentials } from "@/lib/tiktok-shop";

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

  if (!channel || channel.platform !== "TIKTOK") {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  let credentials: TikTokCredentials;
  try {
    credentials = JSON.parse(channel.credentials || "{}");
  } catch {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  }

  const accessToken = await getChannelToken(id, credentials);
  const shopId = channel.externalAccountId;

  // Fetch discovery data in parallel
  const [shops, categories, warehouses] = await Promise.allSettled([
    getAuthorizedShops(accessToken),
    shopId ? getCategories(accessToken, shopId) : Promise.resolve([]),
    shopId ? getWarehouses(accessToken, shopId) : Promise.resolve([]),
  ]);

  return NextResponse.json({
    shops: shops.status === "fulfilled" ? shops.value : [],
    categories: categories.status === "fulfilled" ? categories.value : [],
    warehouses: warehouses.status === "fulfilled" ? warehouses.value : [],
  });
}
