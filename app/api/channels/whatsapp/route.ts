/**
 * WhatsApp Channel Management API
 *
 * GET  /api/channels/whatsapp          — List all WhatsApp channels
 * POST /api/channels/whatsapp          — Connect a new WhatsApp channel
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { salesChannels } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { eq } from "drizzle-orm";
import { getPhoneNumbers, getBusinessProfile } from "@/lib/whatsapp";
import { z } from "zod";
import { audit } from "@/lib/audit";

// GET — List all WhatsApp sales channels
export async function GET() {
  const session = await auth();
  const perm = await requirePermission(session, "channels");
  if (!perm.authorized) {
    return NextResponse.json({ error: perm.error }, { status: 401 });
  }

  const channels = await db.query.salesChannels.findMany({
    where: eq(salesChannels.platform, "WHATSAPP"),
    columns: {
      id: true,
      name: true,
      platform: true,
      status: true,
      externalAccountId: true,
      externalPageId: true,
      externalCatalogId: true,
      settings: true,
      lastSyncAt: true,
      lastSyncStatus: true,
      syncedProductCount: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(channels);
}

// POST — Connect a WhatsApp channel using permanent token
const connectSchema = z.object({
  accessToken: z.string().min(1, "Access token is required"),
  wabaId: z.string().min(1, "WhatsApp Business Account ID is required"),
  phoneNumberId: z.string().min(1, "Phone Number ID is required"),
});

export async function POST(req: Request) {
  const session = await auth();
  const perm = await requirePermission(session, "channels");
  if (!perm.authorized) {
    return NextResponse.json({ error: perm.error }, { status: 401 });
  }

  const body = await req.json();
  const parsed = connectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { accessToken, wabaId, phoneNumberId } = parsed.data;

  // Verify credentials by fetching phone numbers
  let phoneNumbers;
  try {
    phoneNumbers = await getPhoneNumbers(wabaId, accessToken);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Verification failed";
    return NextResponse.json(
      { error: `Invalid credentials: ${message}` },
      { status: 400 },
    );
  }

  const matchedPhone = phoneNumbers.find((p) => p.id === phoneNumberId);
  if (!matchedPhone) {
    return NextResponse.json(
      { error: "Phone Number ID not found in this WhatsApp Business Account" },
      { status: 400 },
    );
  }

  // Fetch business profile for channel name
  let profile;
  try {
    profile = await getBusinessProfile(phoneNumberId, accessToken);
  } catch {
    // Non-blocking — use phone number as fallback
  }

  const channelName = matchedPhone.verified_name
    || profile?.description
    || `WhatsApp ${matchedPhone.display_phone_number}`;

  // Store credentials and activate
  const [channel] = await db.insert(salesChannels).values({
    name: channelName,
    platform: "WHATSAPP",
    status: "ACTIVE",
    credentials: JSON.stringify({
      accessToken,
      phoneNumberId,
      wabaId,
    }),
    externalAccountId: wabaId,
    externalPageId: phoneNumberId,
    settings: JSON.stringify({
      autoSync: true,
      syncInventory: true,
      phoneNumber: matchedPhone.display_phone_number,
      verifiedName: matchedPhone.verified_name,
      qualityRating: matchedPhone.quality_rating,
    }),
  }).returning();

  audit({
    action: "CHANNEL_CONNECTED",
    userId: session!.user!.id!,
    resource: "SalesChannel",
    resourceId: channel.id,
    details: {
      platform: "WHATSAPP",
      wabaId,
      phoneNumberId,
      verifiedName: matchedPhone.verified_name,
    },
    success: true,
  });

  return NextResponse.json({
    id: channel.id,
    name: channel.name,
    platform: channel.platform,
    status: channel.status,
    phoneNumber: matchedPhone.display_phone_number,
    verifiedName: matchedPhone.verified_name,
  });
}
