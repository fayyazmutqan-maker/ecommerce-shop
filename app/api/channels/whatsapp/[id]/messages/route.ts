/**
 * WhatsApp Messaging API
 *
 * POST /api/channels/whatsapp/[id]/messages — Send messages to WhatsApp users
 *
 * Supports: text messages, single product, product list, order status template
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { salesChannels } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { requirePermission } from "@/lib/permissions";
import { eq } from "drizzle-orm";
import {
  sendTextMessage,
  sendProductMessage,
  sendProductListMessage,
  sendOrderStatusMessage,
} from "@/lib/whatsapp";
import type { WhatsAppCredentials } from "@/lib/whatsapp";
import { z } from "zod";
import { audit } from "@/lib/audit";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const textSchema = z.object({
  type: z.literal("text"),
  to: z.string().min(1),
  text: z.string().min(1).max(4096),
});

const productSchema = z.object({
  type: z.literal("product"),
  to: z.string().min(1),
  productRetailerId: z.string().min(1),
  bodyText: z.string().optional(),
  footerText: z.string().optional(),
});

const productListSchema = z.object({
  type: z.literal("product_list"),
  to: z.string().min(1),
  headerText: z.string().min(1),
  bodyText: z.string().min(1),
  footerText: z.string().optional(),
  sections: z.array(z.object({
    title: z.string().min(1),
    product_items: z.array(z.object({ product_retailer_id: z.string() })),
  })).min(1),
});

const templateSchema = z.object({
  type: z.literal("template"),
  to: z.string().min(1),
  templateName: z.string().min(1),
  languageCode: z.string().min(2).max(5),
  parameters: z.array(z.object({ type: z.literal("text"), text: z.string() })),
});

const messageSchema = z.discriminatedUnion("type", [
  textSchema,
  productSchema,
  productListSchema,
  templateSchema,
]);

export async function POST(req: Request, ctx: RouteContext) {
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

  if (!credentials.accessToken || !credentials.phoneNumberId) {
    return NextResponse.json({ error: "Channel not configured" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { phoneNumberId, accessToken } = credentials;
  const catalogId = channel.externalCatalogId;

  try {
    let result;

    switch (parsed.data.type) {
      case "text":
        result = await sendTextMessage(
          phoneNumberId, parsed.data.to, parsed.data.text, accessToken,
        );
        break;

      case "product":
        if (!catalogId) {
          return NextResponse.json({ error: "No catalog configured for this channel" }, { status: 400 });
        }
        result = await sendProductMessage(
          phoneNumberId, parsed.data.to, catalogId,
          parsed.data.productRetailerId, accessToken,
          parsed.data.bodyText, parsed.data.footerText,
        );
        break;

      case "product_list":
        if (!catalogId) {
          return NextResponse.json({ error: "No catalog configured for this channel" }, { status: 400 });
        }
        result = await sendProductListMessage(
          phoneNumberId, parsed.data.to, catalogId,
          parsed.data.sections, accessToken,
          parsed.data.headerText, parsed.data.bodyText, parsed.data.footerText,
        );
        break;

      case "template":
        result = await sendOrderStatusMessage(
          phoneNumberId, parsed.data.to,
          parsed.data.templateName, parsed.data.languageCode,
          parsed.data.parameters, accessToken,
        );
        break;
    }

    audit({
      action: "ADMIN_ACTION",
      userId: session!.user!.id!,
      resource: "SalesChannel",
      resourceId: id,
      details: {
        platform: "WHATSAPP",
        messageType: parsed.data.type,
        to: parsed.data.to,
      },
      success: true,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Message failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
