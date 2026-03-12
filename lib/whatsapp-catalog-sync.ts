/**
 * WhatsApp Catalog Sync Service
 *
 * Maps local products → WhatsApp Commerce Catalog Items and handles sync operations.
 * Supports full sync (all products) and incremental sync (changed products).
 *
 * Uses the Meta Commerce Catalog batch API for efficiency.
 * WhatsApp catalog docs: https://developers.facebook.com/docs/whatsapp/product-catalog
 */

import { db } from "@/lib/db";
import {
  products,
  productImages,
  productVariants,
  salesChannels,
  channelProducts,
  channelSyncLogs,
} from "@/lib/schema";
import { eq, and, inArray, asc } from "drizzle-orm";
import {
  upsertCatalogProducts,
  deleteCatalogProducts,
  formatWhatsAppPrice,
  getAccessToken,
} from "@/lib/whatsapp";
import type { WhatsAppCredentials, WhatsAppCatalogItem } from "@/lib/whatsapp";
import { env } from "@/lib/env";

// ─── Types ───────────────────────────────────────────────────

interface SyncResult {
  totalProducts: number;
  synced: number;
  failed: number;
  errors: string[];
}

interface ProductWithRelations {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  price: string;
  compareAtPrice: string | null;
  status: string;
  vendor: string | null;
  productType: string | null;
  tags: string | null;
  trackInventory: boolean | null;
  quantity: number | null;
  isDigital: boolean | null;
  countryOfOrigin: string | null;
  images: { url: string; alt: string | null; isPrimary: boolean | null; position: number | null }[];
  variants: {
    id: string;
    name: string | null;
    sku: string | null;
    price: string | null;
    compareAtPrice: string | null;
    quantity: number | null;
    option1: string | null;
    option2: string | null;
    option3: string | null;
    image: string | null;
    isActive: boolean | null;
  }[];
}

// ─── Channel Settings ────────────────────────────────────────

interface WhatsAppChannelSettings {
  autoSync?: boolean;
  syncInventory?: boolean;
  currency?: string;
}

function parseSettings(raw: string | null): WhatsAppChannelSettings {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

// ─── Product → WhatsApp Catalog Item Mapper ──────────────────

function mapProductToWhatsAppItems(
  product: ProductWithRelations,
  storeUrl: string,
  currency: string,
): WhatsAppCatalogItem[] {
  const primaryImage = product.images.find((img) => img.isPrimary) || product.images[0];
  const imageUrl = primaryImage?.url || `${storeUrl}/placeholder.png`;
  const productLink = `${storeUrl}/products/${product.slug}`;

  // Truncate per WhatsApp limits
  const name = product.name.slice(0, 200);
  const description = (product.description || product.name).slice(0, 5000);

  const baseItem: Pick<WhatsAppCatalogItem, "url" | "image_url" | "brand" | "category" | "condition" | "origin_country"> = {
    url: productLink,
    image_url: imageUrl,
    brand: product.vendor || undefined,
    category: product.productType || undefined,
    condition: "new",
    origin_country: product.countryOfOrigin || undefined,
  };

  // If product has active variants, create one item per variant
  const activeVariants = product.variants.filter((v) => v.isActive !== false);

  if (product.variants.length > 0 && activeVariants.length === 0) {
    return []; // All variants inactive — skip product
  }

  if (activeVariants.length > 0) {
    return activeVariants.map((variant) => {
      const retailerId = variant.sku || `${product.id}_${variant.id}`;
      const variantPrice = variant.price || product.price;
      const hasCompareAt = variant.compareAtPrice || product.compareAtPrice;

      const variantParts = [variant.option1, variant.option2, variant.option3].filter(Boolean);
      const variantName = variantParts.length > 0
        ? `${name} — ${variantParts.join(" / ")}`
        : name;

      return {
        ...baseItem,
        retailer_id: retailerId,
        name: variantName.slice(0, 200),
        description,
        availability: getAvailability(variant.quantity, product.trackInventory),
        price: hasCompareAt
          ? formatWhatsAppPrice(String(variant.compareAtPrice || product.compareAtPrice!), currency)
          : formatWhatsAppPrice(variantPrice, currency),
        currency,
        sale_price: hasCompareAt ? formatWhatsAppPrice(variantPrice, currency) : undefined,
        sale_price_currency: hasCompareAt ? currency : undefined,
        image_url: variant.image || imageUrl,
        content_id: product.id,
      };
    });
  }

  // Single product (no variants)
  const hasCompareAt = !!product.compareAtPrice;
  return [{
    ...baseItem,
    retailer_id: product.sku || product.id,
    name,
    description,
    availability: getAvailability(product.quantity, product.trackInventory),
    price: hasCompareAt
      ? formatWhatsAppPrice(product.compareAtPrice!, currency)
      : formatWhatsAppPrice(product.price, currency),
    currency,
    sale_price: hasCompareAt ? formatWhatsAppPrice(product.price, currency) : undefined,
    sale_price_currency: hasCompareAt ? currency : undefined,
    content_id: product.id,
  }];
}

function getAvailability(
  quantity: number | null,
  trackInventory: boolean | null,
): "in stock" | "out of stock" {
  if (!trackInventory) return "in stock";
  if (quantity === null || quantity > 0) return "in stock";
  return "out of stock";
}

// ─── Fetch Products for Sync ─────────────────────────────────

async function getPublishedProducts(productIds?: string[]): Promise<ProductWithRelations[]> {
  const conditions = [eq(products.status, "ACTIVE")];
  if (productIds && productIds.length > 0) {
    conditions.push(inArray(products.id, productIds));
  }

  return db.query.products.findMany({
    where: and(...conditions),
    with: {
      images: {
        orderBy: [asc(productImages.position)],
        columns: { url: true, alt: true, isPrimary: true, position: true },
      },
      variants: {
        columns: {
          id: true, name: true, sku: true, price: true,
          compareAtPrice: true, quantity: true,
          option1: true, option2: true, option3: true,
          image: true, isActive: true,
        },
      },
    },
    columns: {
      id: true, name: true, slug: true, description: true,
      sku: true, barcode: true, price: true, compareAtPrice: true, status: true,
      vendor: true, productType: true, tags: true,
      trackInventory: true, quantity: true, isDigital: true,
      countryOfOrigin: true,
    },
  });
}

// ─── Full Catalog Sync ───────────────────────────────────────

/**
 * Full catalog sync: pushes all ACTIVE products to WhatsApp Commerce catalog.
 */
export async function syncWhatsAppCatalog(channelId: string): Promise<SyncResult> {
  const channel = await db.query.salesChannels.findFirst({
    where: eq(salesChannels.id, channelId),
  });

  if (!channel) throw new Error("Channel not found");
  if (!channel.externalCatalogId) throw new Error("No catalog configured for this channel");

  let credentials: WhatsAppCredentials;
  try {
    credentials = JSON.parse(channel.credentials || "{}");
  } catch {
    throw new Error("Invalid channel credentials");
  }

  const accessToken = getAccessToken(credentials);
  const catalogId = channel.externalCatalogId;
  const settings = parseSettings(channel.settings);
  const storeUrl = env.NEXT_PUBLIC_APP_URL;
  const currency = settings.currency || "SAR";

  // Create sync log
  const [syncLog] = await db.insert(channelSyncLogs).values({
    channelId,
    type: "FULL_SYNC",
    status: "IN_PROGRESS",
    totalItems: 0,
    successCount: 0,
    failureCount: 0,
    startedAt: new Date(),
  }).returning();

  const result: SyncResult = {
    totalProducts: 0,
    synced: 0,
    failed: 0,
    errors: [],
  };

  try {
    const publishedProducts = await getPublishedProducts();
    result.totalProducts = publishedProducts.length;

    await db.update(channelSyncLogs).set({
      totalItems: publishedProducts.length,
    }).where(eq(channelSyncLogs.id, syncLog.id));

    if (publishedProducts.length === 0) {
      await completeSyncLog(syncLog.id, "COMPLETED", result);
      return result;
    }

    // Map all products to WhatsApp catalog items
    const allMappings: { productId: string; items: WhatsAppCatalogItem[] }[] = [];
    for (const product of publishedProducts) {
      const items = mapProductToWhatsAppItems(product, storeUrl, currency);
      allMappings.push({ productId: product.id, items });
    }

    // Batch upsert in chunks (Meta batch API recommends <= 5000 per request)
    const BATCH_SIZE = 1000;
    const allItems = allMappings.flatMap((m) => m.items);
    const failedRetailerIds = new Set<string>();

    for (let i = 0; i < allItems.length; i += BATCH_SIZE) {
      const batch = allItems.slice(i, i + BATCH_SIZE);
      try {
        await upsertCatalogProducts(catalogId, batch, accessToken);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Batch upsert failed";
        result.errors.push(message);
        for (const item of batch) {
          failedRetailerIds.add(item.retailer_id);
        }
      }
    }

    // Build a map from retailer_id → productId for failure tracking
    const retailerToProduct = new Map<string, string>();
    for (const { productId, items } of allMappings) {
      for (const item of items) {
        retailerToProduct.set(item.retailer_id, productId);
      }
    }

    // Determine which products failed (by any variant failing)
    const failedProducts = new Set<string>();
    for (const rid of failedRetailerIds) {
      const pid = retailerToProduct.get(rid);
      if (pid) failedProducts.add(pid);
    }

    const uniqueProductIds = new Set(allMappings.map((m) => m.productId));
    result.synced = uniqueProductIds.size - failedProducts.size;
    result.failed = failedProducts.size;

    // Upsert channel product records
    for (const { productId, items } of allMappings) {
      const isFailed = failedProducts.has(productId);
      const retailerIds = items.map((item) => item.retailer_id);

      await db
        .insert(channelProducts)
        .values({
          channelId,
          productId,
          externalProductId: retailerIds[0],
          externalVariantIds: JSON.stringify(retailerIds),
          status: isFailed ? "ERROR" : "SYNCED",
          lastSyncAt: new Date(),
          lastError: isFailed ? result.errors[0] || null : null,
        })
        .onConflictDoUpdate({
          target: [channelProducts.channelId, channelProducts.productId],
          set: {
            externalProductId: retailerIds[0],
            externalVariantIds: JSON.stringify(retailerIds),
            status: isFailed ? "ERROR" : "SYNCED",
            lastSyncAt: new Date(),
            lastError: isFailed ? result.errors[0] || null : null,
          },
        });
    }

    // Update channel stats
    await db.update(salesChannels).set({
      lastSyncAt: new Date(),
      lastSyncStatus: result.failed === 0 ? "COMPLETED" : "PARTIAL",
      syncedProductCount: result.synced,
      lastSyncError: result.errors.length > 0 ? result.errors[0] : null,
    }).where(eq(salesChannels.id, channelId));

    await completeSyncLog(syncLog.id, result.failed === 0 ? "COMPLETED" : "PARTIAL", result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    result.errors.push(message);
    result.failed = result.totalProducts;

    await db.update(salesChannels).set({
      lastSyncAt: new Date(),
      lastSyncStatus: "FAILED",
      lastSyncError: message,
    }).where(eq(salesChannels.id, channelId));

    await completeSyncLog(syncLog.id, "FAILED", result);
  }

  return result;
}

// ─── Incremental Sync (Single Product) ──────────────────────

/**
 * Sync a single product to a specific WhatsApp channel.
 * Called from product change hooks.
 */
export async function syncWhatsAppProduct(channelId: string, productId: string): Promise<void> {
  const channel = await db.query.salesChannels.findFirst({
    where: eq(salesChannels.id, channelId),
  });

  if (!channel?.externalCatalogId) return;

  let credentials: WhatsAppCredentials;
  try {
    credentials = JSON.parse(channel.credentials || "{}");
  } catch { return; }

  let accessToken: string;
  try {
    accessToken = getAccessToken(credentials);
  } catch (error) {
    console.error(`[WhatsApp Sync] Token error for channel ${channelId}:`, error);
    return;
  }

  const settings = parseSettings(channel.settings);
  if (settings.autoSync === false) return;

  const storeUrl = env.NEXT_PUBLIC_APP_URL;
  const currency = settings.currency || "SAR";
  const catalogId = channel.externalCatalogId;

  const publishedProducts = await getPublishedProducts([productId]);

  if (publishedProducts.length === 0) {
    // Product was unpublished — remove from catalog
    const existing = await db.query.channelProducts.findFirst({
      where: and(
        eq(channelProducts.channelId, channelId),
        eq(channelProducts.productId, productId),
      ),
    });
    if (existing?.externalVariantIds) {
      try {
        const retailerIds: string[] = JSON.parse(existing.externalVariantIds);
        if (retailerIds.length > 0) {
          await deleteCatalogProducts(catalogId, retailerIds, accessToken);
        }
      } catch { /* best effort */ }
      await db.update(channelProducts).set({
        status: "REMOVED",
        lastSyncAt: new Date(),
      }).where(eq(channelProducts.id, existing.id));
    }
    return;
  }

  const product = publishedProducts[0];
  const items = mapProductToWhatsAppItems(product, storeUrl, currency);

  try {
    await upsertCatalogProducts(catalogId, items, accessToken);

    const retailerIds = items.map((item) => item.retailer_id);

    await db
      .insert(channelProducts)
      .values({
        channelId,
        productId: product.id,
        externalProductId: retailerIds[0],
        externalVariantIds: JSON.stringify(retailerIds),
        status: "SYNCED",
        lastSyncAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [channelProducts.channelId, channelProducts.productId],
        set: {
          externalProductId: retailerIds[0],
          externalVariantIds: JSON.stringify(retailerIds),
          status: "SYNCED",
          lastSyncAt: new Date(),
          lastError: null,
        },
      });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    await db
      .insert(channelProducts)
      .values({
        channelId,
        productId: product.id,
        externalProductId: product.sku || product.id,
        status: "ERROR",
        lastSyncAt: new Date(),
        lastError: message,
      })
      .onConflictDoUpdate({
        target: [channelProducts.channelId, channelProducts.productId],
        set: {
          status: "ERROR",
          lastSyncAt: new Date(),
          lastError: message,
        },
      });
  }
}

// ─── Remove Product from WhatsApp Channels ───────────────────

/**
 * Remove a product from all WhatsApp channels.
 * Called when a product is deleted or archived.
 */
export async function removeProductFromWhatsAppChannels(productId: string): Promise<void> {
  const linked = await db.query.channelProducts.findMany({
    where: eq(channelProducts.productId, productId),
  });

  for (const cp of linked) {
    const channel = await db.query.salesChannels.findFirst({
      where: eq(salesChannels.id, cp.channelId),
    });
    if (!channel?.externalCatalogId || channel.platform !== "WHATSAPP") continue;

    let credentials: WhatsAppCredentials;
    try {
      credentials = JSON.parse(channel.credentials || "{}");
    } catch { continue; }

    let accessToken: string;
    try {
      accessToken = getAccessToken(credentials);
    } catch { continue; }

    try {
      const retailerIds: string[] = cp.externalVariantIds
        ? JSON.parse(cp.externalVariantIds)
        : [];

      if (retailerIds.length > 0) {
        await deleteCatalogProducts(channel.externalCatalogId, retailerIds, accessToken);
      }
    } catch { /* best effort */ }
  }
}

// ─── Sync to All Active WhatsApp Channels ────────────────────

/**
 * Sync a product to all active WhatsApp channels.
 */
export async function syncProductToAllWhatsAppChannels(productId: string): Promise<void> {
  const activeChannels = await db.query.salesChannels.findMany({
    where: and(
      eq(salesChannels.status, "ACTIVE"),
      eq(salesChannels.platform, "WHATSAPP"),
    ),
  });

  await Promise.allSettled(
    activeChannels.map((ch) => syncWhatsAppProduct(ch.id, productId)),
  );
}

// ─── Helper ──────────────────────────────────────────────────

async function completeSyncLog(
  logId: string,
  status: string,
  result: SyncResult,
): Promise<void> {
  await db.update(channelSyncLogs).set({
    status,
    totalItems: result.totalProducts,
    successCount: result.synced,
    failureCount: result.failed,
    errors: result.errors.length > 0 ? JSON.stringify(result.errors) : null,
    completedAt: new Date(),
  }).where(eq(channelSyncLogs.id, logId));
}
