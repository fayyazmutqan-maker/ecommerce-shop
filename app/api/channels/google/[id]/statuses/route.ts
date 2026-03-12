/**
 * Google Merchant Product Statuses API
 *
 * GET /api/channels/google/[id]/statuses — Get product approval statuses
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { salesChannels } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { eq } from "drizzle-orm";
import { listProductStatuses, getValidToken } from "@/lib/google-merchant";
import type { GoogleCredentials } from "@/lib/google-merchant";

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

  if (!channel.externalAccountId) {
    return NextResponse.json({ error: "No merchant account configured" }, { status: 400 });
  }

  let credentials: GoogleCredentials;
  try {
    credentials = JSON.parse(channel.credentials || "{}");
  } catch {
    return NextResponse.json({ error: "Invalid channel credentials" }, { status: 500 });
  }

  try {
    const tokenResult = await getValidToken(credentials);
    if (tokenResult.updated) {
      await db.update(salesChannels).set({
        credentials: JSON.stringify(tokenResult.credentials),
      }).where(eq(salesChannels.id, id));
    }

    const url = new URL(req.url);
    const pageToken = url.searchParams.get("pageToken") || undefined;
    const maxResults = Math.min(parseInt(url.searchParams.get("maxResults") || "50"), 250);

    const { statuses, nextPageToken } = await listProductStatuses(
      channel.externalAccountId,
      tokenResult.accessToken,
      maxResults,
      pageToken,
    );

    return NextResponse.json({ statuses, nextPageToken });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch statuses";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
