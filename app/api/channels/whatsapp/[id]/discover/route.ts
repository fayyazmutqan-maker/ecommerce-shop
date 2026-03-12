/**
 * WhatsApp Channel Discovery API
 *
 * POST /api/channels/whatsapp/[id]/discover — Fetch catalogs, phone numbers, profile
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { salesChannels } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { eq } from "drizzle-orm";
import {
  getCatalogs,
  getPhoneNumbers,
  getBusinessProfile,
} from "@/lib/whatsapp";
import type { WhatsAppCredentials } from "@/lib/whatsapp";

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

  if (!channel || channel.platform !== "WHATSAPP") {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  let credentials: WhatsAppCredentials;
  try {
    credentials = JSON.parse(channel.credentials || "{}");
  } catch {
    return NextResponse.json({ error: "Invalid channel credentials" }, { status: 500 });
  }

  if (!credentials.accessToken || !credentials.wabaId) {
    return NextResponse.json({ error: "Channel not configured" }, { status: 400 });
  }

  try {
    const { accessToken, wabaId, phoneNumberId } = credentials;

    // Fetch in parallel
    const [catalogs, phoneNumbers, profile] = await Promise.all([
      getCatalogs(wabaId, accessToken).catch(() => []),
      getPhoneNumbers(wabaId, accessToken).catch(() => []),
      getBusinessProfile(phoneNumberId, accessToken).catch(() => null),
    ]);

    return NextResponse.json({
      catalogs,
      phoneNumbers,
      profile,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Discovery failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
