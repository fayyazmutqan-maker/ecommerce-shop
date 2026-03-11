import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import {
  getTranslations,
  saveTranslations,
  deleteAllTranslations,
  TRANSLATABLE_FIELDS,
  type TranslatableEntityType,
} from "@/lib/translations";

const entityTypes: TranslatableEntityType[] = [
  "product",
  "category",
  "page",
  "blogPost",
  "smartCollection",
];

// ─── GET /api/translations?entityType=product&entityId=xxx&locale=ar ───

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entityType") as TranslatableEntityType;
  const entityId = searchParams.get("entityId");
  const locale = searchParams.get("locale") || "ar";

  if (!entityType || !entityTypes.includes(entityType)) {
    return NextResponse.json({ error: "Invalid entityType" }, { status: 400 });
  }
  if (!entityId) {
    return NextResponse.json({ error: "entityId is required" }, { status: 400 });
  }

  const translations = await getTranslations(entityType, entityId, locale);

  // Return all translatable fields for this entity type,
  // with current values (or empty strings if not yet translated)
  const fields = TRANSLATABLE_FIELDS[entityType];
  const result: Record<string, string> = {};
  for (const field of fields) {
    result[field] = translations[field] || "";
  }

  return NextResponse.json({ entityType, entityId, locale, translations: result });
}

// ─── PUT /api/translations ───

const saveSchema = z.object({
  entityType: z.enum(["product", "category", "page", "blogPost", "smartCollection"]),
  entityId: z.string().min(1),
  locale: z.string().min(2).max(5),
  translations: z.record(z.string(), z.string().nullable()),
});

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { entityType, entityId, locale, translations } = parsed.data;

  await saveTranslations(entityType, entityId, locale, translations);

  return NextResponse.json({ success: true });
}

// ─── DELETE /api/translations?entityType=product&entityId=xxx ───

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entityType") as TranslatableEntityType;
  const entityId = searchParams.get("entityId");

  if (!entityType || !entityTypes.includes(entityType)) {
    return NextResponse.json({ error: "Invalid entityType" }, { status: 400 });
  }
  if (!entityId) {
    return NextResponse.json({ error: "entityId is required" }, { status: 400 });
  }

  await deleteAllTranslations(entityType, entityId);

  return NextResponse.json({ success: true });
}
