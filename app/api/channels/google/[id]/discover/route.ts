/**
 * Google Channel Discovery API
 *
 * POST /api/channels/google/[id]/discover — Fetch merchant accounts & product statuses
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { salesChannels } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { eq } from "drizzle-orm";
import {
  listMerchantAccounts,
  listProductStatuses,
  getValidToken,
} from "@/lib/google-merchant";
import type { GoogleCredentials } from "@/lib/google-merchant";

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

  let credentials: GoogleCredentials;
  try {
    credentials = JSON.parse(channel.credentials || "{}");
  } catch {
    return NextResponse.json({ error: "Invalid channel credentials" }, { status: 500 });
  }

  if (!credentials.accessToken || !credentials.refreshToken) {
    return NextResponse.json({ error: "Channel not yet authorized" }, { status: 400 });
  }

  try {
    // Ensure token is valid
    const tokenResult = await getValidToken(credentials);
    if (tokenResult.updated) {
      await db.update(salesChannels).set({
        credentials: JSON.stringify(tokenResult.credentials),
      }).where(eq(salesChannels.id, id));
    }

    const accessToken = tokenResult.accessToken;

    // Discover merchant accounts
    const accounts = await listMerchantAccounts(accessToken);

    // If we have a merchant ID, fetch product statuses summary
    let productStatusSummary: { approved: number; disapproved: number; pending: number } | null = null;
    const merchantId = channel.externalAccountId;
    if (merchantId) {
      try {
        const { statuses } = await listProductStatuses(merchantId, accessToken, 250);
        let approved = 0, disapproved = 0, pending = 0;
        for (const status of statuses) {
          const dest = status.destinationStatuses?.[0];
          if (dest?.status === "approved") approved++;
          else if (dest?.status === "disapproved") disapproved++;
          else pending++;
        }
        productStatusSummary = { approved, disapproved, pending };
      } catch {
        // Statuses not available — not a blocking error
      }
    }

    return NextResponse.json({
      accounts,
      productStatusSummary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Discovery failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
