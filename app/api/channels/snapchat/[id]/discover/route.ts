/**
 * Snapchat Discovery API
 *
 * POST /api/channels/snapchat/[id]/discover — Fetch organizations, ad accounts, catalogs
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { salesChannels } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { eq } from "drizzle-orm";
import {
  getOrganizations,
  getAdAccounts,
  getCatalogs,
  getChannelToken,
} from "@/lib/snapchat";
import type { SnapchatCredentials } from "@/lib/snapchat";

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

  let credentials: SnapchatCredentials;
  try {
    credentials = JSON.parse(channel.credentials || "{}");
  } catch {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  }

  const accessToken = await getChannelToken(id, credentials);
  const organizationId = channel.externalAccountId;

  // Fetch discovery data in parallel where possible
  const [orgsResult, catalogsResult, adAccountsResult] = await Promise.allSettled([
    getOrganizations(accessToken),
    organizationId ? getCatalogs(accessToken, organizationId) : Promise.resolve([]),
    organizationId ? getAdAccounts(accessToken, organizationId) : Promise.resolve([]),
  ]);

  return NextResponse.json({
    organizations: orgsResult.status === "fulfilled" ? orgsResult.value : [],
    catalogs: catalogsResult.status === "fulfilled" ? catalogsResult.value : [],
    adAccounts: adAccountsResult.status === "fulfilled" ? adAccountsResult.value : [],
  });
}
