/**
 * Content Translation Helpers
 *
 * Provides server-side utilities for reading and writing
 * translations of dynamic database content (products, categories,
 * pages, blog posts, smart collections).
 *
 * The default locale ("en") content lives in the main table columns.
 * Only non-default locales (e.g. "ar") are stored in ContentTranslation rows.
 */

import { db } from "./db";
import { contentTranslations } from "./schema";
import { eq, and, inArray } from "drizzle-orm";

// Must match i18n/request.ts
export const DEFAULT_LOCALE = "en";

export type TranslatableEntityType =
  | "product"
  | "category"
  | "page"
  | "blogPost"
  | "smartCollection";

// Fields that can be translated per entity type
export const TRANSLATABLE_FIELDS: Record<TranslatableEntityType, string[]> = {
  product: [
    "name",
    "description",
    "shortDescription",
    "seoTitle",
    "seoDescription",
    "customBadge",
    "warrantyInfo",
    "estimatedDelivery",
  ],
  category: ["name", "description"],
  page: ["title", "content", "seoTitle", "seoDescription"],
  blogPost: ["title", "content", "excerpt", "seoTitle", "seoDescription"],
  smartCollection: ["name", "description", "seoTitle", "seoDescription"],
};

/**
 * Field labels for the admin UI
 */
export const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  title: "Title",
  description: "Description",
  shortDescription: "Short Description",
  content: "Content",
  excerpt: "Excerpt",
  seoTitle: "SEO Title",
  seoDescription: "SEO Description",
  customBadge: "Custom Badge",
  warrantyInfo: "Warranty Info",
  estimatedDelivery: "Estimated Delivery",
};

// ─── READ ────────────────────────────────────────────────────

/**
 * Get all translations for a single entity, keyed by field name.
 * Returns only the requested locale.
 *
 * Example:
 *   getTranslations("product", "clx123", "ar")
 *   => { name: "حذاء رياضي", description: "وصف المنتج" }
 */
export async function getTranslations(
  entityType: TranslatableEntityType,
  entityId: string,
  locale: string
): Promise<Record<string, string>> {
  if (locale === DEFAULT_LOCALE) return {};

  const rows = await db
    .select({ field: contentTranslations.field, value: contentTranslations.value })
    .from(contentTranslations)
    .where(
      and(
        eq(contentTranslations.entityType, entityType),
        eq(contentTranslations.entityId, entityId),
        eq(contentTranslations.locale, locale)
      )
    );

  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.field] = row.value;
  }
  return map;
}

/**
 * Get translations for multiple entities at once (batch).
 * Returns a Map<entityId, Record<field, translatedValue>>.
 *
 * Usage on listing pages to avoid N+1 queries.
 */
export async function getTranslationsBatch(
  entityType: TranslatableEntityType,
  entityIds: string[],
  locale: string
): Promise<Map<string, Record<string, string>>> {
  const result = new Map<string, Record<string, string>>();
  if (locale === DEFAULT_LOCALE || entityIds.length === 0) return result;

  const rows = await db
    .select({
      entityId: contentTranslations.entityId,
      field: contentTranslations.field,
      value: contentTranslations.value,
    })
    .from(contentTranslations)
    .where(
      and(
        eq(contentTranslations.entityType, entityType),
        inArray(contentTranslations.entityId, entityIds),
        eq(contentTranslations.locale, locale)
      )
    );

  for (const row of rows) {
    if (!result.has(row.entityId)) {
      result.set(row.entityId, {});
    }
    result.get(row.entityId)![row.field] = row.value;
  }

  return result;
}

/**
 * Apply translations to an entity object. Returns a new object
 * with translated fields overriding the original values.
 *
 * Usage:
 *   const product = await db.query.products.findFirst(...)
 *   const translated = await applyTranslations("product", product, locale)
 *   // translated.name is now in Arabic (if locale === "ar")
 */
export async function applyTranslations<T extends Record<string, unknown>>(
  entityType: TranslatableEntityType,
  entity: T,
  locale: string
): Promise<T> {
  if (locale === DEFAULT_LOCALE || !entity) return entity;

  const id = entity.id as string;
  if (!id) return entity;

  const translations = await getTranslations(entityType, id, locale);
  if (Object.keys(translations).length === 0) return entity;

  return { ...entity, ...translations };
}

/**
 * Apply batch translations to an array of entities.
 */
export async function applyTranslationsBatch<T extends Record<string, unknown>>(
  entityType: TranslatableEntityType,
  entities: T[],
  locale: string
): Promise<T[]> {
  if (locale === DEFAULT_LOCALE || entities.length === 0) return entities;

  const ids = entities.map((e) => e.id as string).filter(Boolean);
  const translationsMap = await getTranslationsBatch(entityType, ids, locale);

  return entities.map((entity) => {
    const id = entity.id as string;
    const translations = translationsMap.get(id);
    if (!translations) return entity;
    return { ...entity, ...translations };
  });
}

// ─── WRITE ───────────────────────────────────────────────────

/**
 * Save translations for an entity. Upserts each field.
 *
 * @param translations - Record<fieldName, translatedValue>
 *   Empty/null values will be deleted (removing the translation → fallback to default locale).
 */
export async function saveTranslations(
  entityType: TranslatableEntityType,
  entityId: string,
  locale: string,
  translations: Record<string, string | null | undefined>
): Promise<void> {
  if (locale === DEFAULT_LOCALE) return;

  const allowedFields = TRANSLATABLE_FIELDS[entityType] || [];

  for (const [field, value] of Object.entries(translations)) {
    if (!allowedFields.includes(field)) continue;

    if (!value || value.trim() === "") {
      // Delete translation → falls back to default locale
      await db
        .delete(contentTranslations)
        .where(
          and(
            eq(contentTranslations.entityType, entityType),
            eq(contentTranslations.entityId, entityId),
            eq(contentTranslations.locale, locale),
            eq(contentTranslations.field, field)
          )
        );
    } else {
      // Upsert
      await db
        .insert(contentTranslations)
        .values({
          entityType,
          entityId,
          locale,
          field,
          value: value.trim(),
        })
        .onConflictDoUpdate({
          target: [
            contentTranslations.entityType,
            contentTranslations.entityId,
            contentTranslations.locale,
            contentTranslations.field,
          ],
          set: {
            value: value.trim(),
            updatedAt: new Date(),
          },
        });
    }
  }
}

/**
 * Delete all translations for an entity (call when entity is deleted).
 */
export async function deleteAllTranslations(
  entityType: TranslatableEntityType,
  entityId: string
): Promise<void> {
  await db
    .delete(contentTranslations)
    .where(
      and(
        eq(contentTranslations.entityType, entityType),
        eq(contentTranslations.entityId, entityId)
      )
    );
}
