import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  products,
  categories,
  pages,
  blogPosts,
  smartCollections,
  contentTranslations,
} from "@/lib/schema";
import { eq, and, sql, desc, asc, count, inArray } from "drizzle-orm";
import { TRANSLATABLE_FIELDS, type TranslatableEntityType } from "@/lib/translations";

/**
 * GET /api/translations/entities?type=product&locale=ar
 *
 * Returns a list of entities of the given type with their
 * translation completion stats for the given locale.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role as string)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = (searchParams.get("type") || "product") as TranslatableEntityType;
  const locale = searchParams.get("locale") || "ar";

  const totalFields = TRANSLATABLE_FIELDS[type]?.length || 0;

  try {
  // Fetch entities based on type
  let entities: { id: string; label: string; subLabel?: string; status?: string }[] = [];

  switch (type) {
    case "product": {
      const rows = await db
        .select({
          id: products.id,
          name: products.name,
          sku: products.sku,
          status: products.status,
        })
        .from(products)
        .orderBy(desc(products.createdAt))
        .limit(200);
      entities = rows.map((r) => ({
        id: r.id,
        label: r.name,
        subLabel: r.sku || undefined,
        status: r.status,
      }));
      break;
    }
    case "category": {
      const rows = await db
        .select({ id: categories.id, name: categories.name, isActive: categories.isActive })
        .from(categories)
        .orderBy(asc(categories.sortOrder));
      entities = rows.map((r) => ({
        id: r.id,
        label: r.name,
        status: r.isActive ? "ACTIVE" : "INACTIVE",
      }));
      break;
    }
    case "page": {
      const rows = await db
        .select({ id: pages.id, title: pages.title, isPublished: pages.isPublished })
        .from(pages)
        .orderBy(asc(pages.title));
      entities = rows.map((r) => ({
        id: r.id,
        label: r.title,
        status: r.isPublished ? "PUBLISHED" : "DRAFT",
      }));
      break;
    }
    case "blogPost": {
      const rows = await db
        .select({ id: blogPosts.id, title: blogPosts.title, isPublished: blogPosts.isPublished })
        .from(blogPosts)
        .orderBy(desc(blogPosts.createdAt));
      entities = rows.map((r) => ({
        id: r.id,
        label: r.title,
        status: r.isPublished ? "PUBLISHED" : "DRAFT",
      }));
      break;
    }
    case "smartCollection": {
      const rows = await db
        .select({ id: smartCollections.id, name: smartCollections.name, isActive: smartCollections.isActive })
        .from(smartCollections)
        .orderBy(asc(smartCollections.sortOrder));
      entities = rows.map((r) => ({
        id: r.id,
        label: r.name,
        status: r.isActive ? "ACTIVE" : "INACTIVE",
      }));
      break;
    }
  }

  // Get translation counts per entity
  const entityIds = entities.map((e) => e.id);
  let translationCounts = new Map<string, number>();

  if (entityIds.length > 0) {
    const countRows = await db
      .select({
        entityId: contentTranslations.entityId,
        fieldCount: count(),
      })
      .from(contentTranslations)
      .where(
        and(
          eq(contentTranslations.entityType, type),
          eq(contentTranslations.locale, locale),
          inArray(contentTranslations.entityId, entityIds)
        )
      )
      .groupBy(contentTranslations.entityId);

    for (const row of countRows) {
      translationCounts.set(row.entityId, Number(row.fieldCount));
    }
  }

  // Build response
  const result = entities.map((entity) => {
    const translated = translationCounts.get(entity.id) || 0;
    return {
      ...entity,
      translatedFields: translated,
      totalFields,
      progress: totalFields > 0 ? Math.round((translated / totalFields) * 100) : 0,
    };
  });

  // Sort: incomplete first, then fully translated
  result.sort((a, b) => {
    if (a.progress === 100 && b.progress !== 100) return 1;
    if (a.progress !== 100 && b.progress === 100) return -1;
    return 0;
  });

  return NextResponse.json({
    entities: result,
    totalEntities: entities.length,
    fullyTranslated: result.filter((r) => r.progress === 100).length,
    totalFields,
  });
  } catch (error) {
    console.error("[translations/entities] Failed:", error);
    return NextResponse.json(
      { error: "Failed to load translation entities" },
      { status: 500 }
    );
  }
}
