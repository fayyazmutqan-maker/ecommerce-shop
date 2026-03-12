/**
 * Meta Channel Discovery API
 *
 * POST /api/channels/meta/[id]/discover — Fetch available pages, catalogs, IG accounts
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { salesChannels } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { eq } from "drizzle-orm";
import { getPages, getBusinessAccounts, getCatalogs, getInstagramAccounts } from "@/lib/meta";
import type { MetaCredentials } from "@/lib/meta";

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

  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  let credentials: MetaCredentials;
  try {
    credentials = JSON.parse(channel.credentials || "{}");
  } catch {
    return NextResponse.json({ error: "Invalid channel credentials" }, { status: 500 });
  }

  if (!credentials.accessToken) {
    return NextResponse.json({ error: "Channel not yet authorized" }, { status: 400 });
  }

  try {
    const [pages, businesses] = await Promise.all([
      getPages(credentials.accessToken),
      getBusinessAccounts(credentials.accessToken),
    ]);

    // For each business, fetch their catalogs
    const catalogPromises = businesses.map(async (biz) => {
      const catalogs = await getCatalogs(biz.id, credentials.accessToken);
      return { businessId: biz.id, businessName: biz.name, catalogs };
    });
    const businessCatalogs = await Promise.all(catalogPromises);

    // For selected page, fetch Instagram accounts
    const igAccounts: { id: string; name: string; username: string }[] = [];
    const pageId = channel.externalPageId;
    if (pageId) {
      try {
        const igs = await getInstagramAccounts(pageId, credentials.accessToken);
        igAccounts.push(...igs);
      } catch {
        // Page may not have linked IG — not an error
      }
    }

    return NextResponse.json({
      pages,
      businesses: businessCatalogs,
      instagramAccounts: igAccounts,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Discovery failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
