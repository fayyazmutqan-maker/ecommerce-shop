/**
 * Catalog Sync Service
 *
 * Maps local products → Meta Catalog Items and handles batch sync operations.
 * Supports full sync (all products) and incremental sync (changed products).
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
import { eq, and, inArray, asc, desc } from "drizzle-orm";
import { syncProductsBatch, deleteProductsBatch, formatMetaPrice } from "@/lib/meta";
import type { MetaCatalogItem, MetaCredentials } from "@/lib/meta";
import { syncProductToAllGoogleChannels, removeProductFromGoogleChannels } from "@/lib/google-catalog-sync";
import { syncProductToAllWhatsAppChannels, removeProductFromWhatsAppChannels } from "@/lib/whatsapp-catalog-sync";
import { syncProductToAllTikTokChannels, removeProductFromTikTokChannels } from "@/lib/tiktok-catalog-sync";
import { env } from "@/lib/env";

// ─── Types ───────────────────────────────────────────────────

interface SyncResult {
  totalProducts: number;
  synced: number;
  failed: number;
  errors: string[];
  handles: string[];
}

interface ProductWithRelations {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sku: string | null;
  price: string;
  compareAtPrice: string | null;
  status: string;
  vendor: string | null;
  productType: string | null;
  tags: string | null;
  trackInventory: boolean | null;
  quantity: number | null;
  isDigital: boolean | null;
  weight: number | null;
  weightUnit: string | null;
  countryOfOrigin: string | null;
  customBadge: string | null;
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

// ─── Product → Meta Catalog Item Mapper ──────────────────────

function mapProductToCatalogItem(
  product: ProductWithRelations,
  storeUrl: string,
): MetaCatalogItem[] {
  const primaryImage = product.images.find((img) => img.isPrimary) || product.images[0];
  const additionalImages = product.images
    .filter((img) => img.url !== primaryImage?.url)
    .map((img) => img.url);

  const baseItem: Omit<MetaCatalogItem, "id" | "price" | "inventory" | "size" | "color" | "item_group_id"> = {
    title: product.name,
    description: product.description || product.name,
    availability: getAvailability(product.quantity, product.trackInventory),
    condition: "new",
    link: `${storeUrl}/products/${product.slug}`,
    image_link: primaryImage?.url || `${storeUrl}/placeholder.png`,
    additional_image_link: additionalImages.length > 0 ? additionalImages : undefined,
    brand: product.vendor || undefined,
    google_product_category: product.productType || undefined,
    custom_label_0: product.tags?.split(",")[0]?.trim() || undefined,
  };

  // If product has active variants, create one catalog item per variant
  const activeVariants = product.variants.filter((v) => v.isActive !== false);

  if (activeVariants.length > 0) {
    return activeVariants.map((variant) => ({
      ...baseItem,
      id: variant.sku || `${product.id}_${variant.id}`,
      price: formatMetaPrice(variant.price || product.price),
      sale_price: variant.compareAtPrice
        ? formatMetaPrice(product.price)
        : product.compareAtPrice
          ? formatMetaPrice(product.price)
          : undefined,
      item_group_id: product.id,
      availability: getAvailability(variant.quantity, product.trackInventory),
      inventory: variant.quantity ?? undefined,
      size: variant.option2 || undefined, // Convention: option1=color, option2=size
      color: variant.option1 || undefined,
      image_link: variant.image || baseItem.image_link,
    }));
  }

  // Single product (no variants)
  return [{
    ...baseItem,
    id: product.sku || product.id,
    price: formatMetaPrice(product.price),
    sale_price: product.compareAtPrice
      ? formatMetaPrice(product.price)
      : undefined,
    inventory: product.quantity ?? undefined,
  }];
}

function getAvailability(
  quantity: number | null,
  trackInventory: boolean | null,
): MetaCatalogItem["availability"] {
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
      sku: true, price: true, compareAtPrice: true, status: true,
      vendor: true, productType: true, tags: true,
      trackInventory: true, quantity: true, isDigital: true,
      weight: true, weightUnit: true, countryOfOrigin: true,
      customBadge: true,
    },
  });
}

// ─── Full Catalog Sync ───────────────────────────────────────

export async function syncCatalog(channelId: string): Promise<SyncResult> {
  const channel = await db.query.salesChannels.findFirst({
    where: eq(salesChannels.id, channelId),
  });

  if (!channel) throw new Error("Channel not found");
  if (!channel.externalCatalogId) throw new Error("No catalog configured for this channel");

  let credentials: MetaCredentials;
  try {
    credentials = JSON.parse(channel.credentials || "{}");
  } catch {
    throw new Error("Invalid channel credentials");
  }
  if (!credentials.accessToken) throw new Error("Channel not authorized");

  const storeUrl = env.NEXT_PUBLIC_APP_URL;

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
    handles: [],
  };

  try {
    const publishedProducts = await getPublishedProducts();
    const catalogItems: MetaCatalogItem[] = [];

    for (const product of publishedProducts) {
      const items = mapProductToCatalogItem(product, storeUrl);
      catalogItems.push(...items);
    }

    result.totalProducts = publishedProducts.length;

    // Update sync log with total
    await db.update(channelSyncLogs).set({
      totalItems: publishedProducts.length,
    }).where(eq(channelSyncLogs.id, syncLog.id));

    if (catalogItems.length === 0) {
      await completeSyncLog(syncLog.id, "COMPLETED", result);
      return result;
    }

    // Push to Meta
    const { handles } = await syncProductsBatch(
      channel.externalCatalogId,
      catalogItems,
      credentials.accessToken,
    );
    result.handles = handles;
    result.synced = publishedProducts.length;

    // Upsert channel product records
    for (const product of publishedProducts) {
      const variantIds = product.variants.map((v) => v.sku || v.id);
      await db
        .insert(channelProducts)
        .values({
          channelId,
          productId: product.id,
          externalProductId: product.sku || product.id,
          externalVariantIds: JSON.stringify(variantIds),
          status: "SYNCED",
          lastSyncAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [channelProducts.channelId, channelProducts.productId],
          set: {
            externalProductId: product.sku || product.id,
            externalVariantIds: JSON.stringify(variantIds),
            status: "SYNCED",
            lastSyncAt: new Date(),
            lastError: null,
          },
        });
    }

    // Update channel stats
    await db.update(salesChannels).set({
      lastSyncAt: new Date(),
      lastSyncStatus: "COMPLETED",
      syncedProductCount: publishedProducts.length,
    }).where(eq(salesChannels.id, channelId));

    await completeSyncLog(syncLog.id, "COMPLETED", result);
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

export async function syncProduct(channelId: string, productId: string): Promise<void> {
  const channel = await db.query.salesChannels.findFirst({
    where: eq(salesChannels.id, channelId),
  });

  if (!channel?.externalCatalogId) return;

  let credentials: MetaCredentials;
  try {
    credentials = JSON.parse(channel.credentials || "{}");
  } catch { return; }
  if (!credentials.accessToken) return;

  // Check if autoSync is enabled
  let settings: Record<string, unknown> = {};
  try { settings = JSON.parse(channel.settings || "{}"); } catch { /* ignore */ }
  if (settings.autoSync === false) return;

  const storeUrl = env.NEXT_PUBLIC_APP_URL;
  const publishedProducts = await getPublishedProducts([productId]);

  if (publishedProducts.length === 0) {
    // Product was unpublished or deleted — remove from catalog
    const existing = await db.query.channelProducts.findFirst({
      where: and(
        eq(channelProducts.channelId, channelId),
        eq(channelProducts.productId, productId),
      ),
    });
    if (existing?.externalProductId) {
      try {
        await deleteProductsBatch(
          channel.externalCatalogId,
          [existing.externalProductId],
          credentials.accessToken,
        );
      } catch { /* best effort */ }
      await db.update(channelProducts).set({
        status: "REMOVED",
        lastSyncAt: new Date(),
      }).where(eq(channelProducts.id, existing.id));
    }
    return;
  }

  const product = publishedProducts[0];
  const catalogItems = mapProductToCatalogItem(product, storeUrl);

  try {
    await syncProductsBatch(
      channel.externalCatalogId,
      catalogItems,
      credentials.accessToken,
    );

    const variantIds = product.variants.map((v) => v.sku || v.id);
    await db
      .insert(channelProducts)
      .values({
        channelId,
        productId: product.id,
        externalProductId: product.sku || product.id,
        externalVariantIds: JSON.stringify(variantIds),
        status: "SYNCED",
        lastSyncAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [channelProducts.channelId, channelProducts.productId],
        set: {
          externalProductId: product.sku || product.id,
          externalVariantIds: JSON.stringify(variantIds),
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

// ─── Remove Product from All Channels ────────────────────────

export async function removeProductFromChannels(productId: string): Promise<void> {
  const linked = await db.query.channelProducts.findMany({
    where: eq(channelProducts.productId, productId),
  });

  for (const cp of linked) {
    const channel = await db.query.salesChannels.findFirst({
      where: eq(salesChannels.id, cp.channelId),
    });
    // Only handle Meta channels here; Google handled separately
    if (channel?.platform === "GOOGLE" || !channel?.externalCatalogId || !cp.externalProductId) continue;

    let credentials: MetaCredentials;
    try {
      credentials = JSON.parse(channel.credentials || "{}");
    } catch { continue; }
    if (!credentials.accessToken) continue;

    try {
      // Delete all variant IDs too
      const variantIds: string[] = cp.externalVariantIds
        ? JSON.parse(cp.externalVariantIds)
        : [cp.externalProductId];

      await deleteProductsBatch(
        channel.externalCatalogId,
        variantIds,
        credentials.accessToken,
      );
    } catch { /* best effort */ }
  }

  // Also remove from Google channels
  await removeProductFromGoogleChannels(productId).catch(() => {});

  // Also remove from WhatsApp channels
  await removeProductFromWhatsAppChannels(productId).catch(() => {});

  // Also remove from TikTok channels
  await removeProductFromTikTokChannels(productId).catch(() => {});

  // Clean up the channelProducts records
  await db.delete(channelProducts).where(eq(channelProducts.productId, productId));
}

// ─── Sync All Active Channels ────────────────────────────────

export async function syncProductToAllChannels(productId: string): Promise<void> {
  // Sync to Meta channels
  const activeChannels = await db.query.salesChannels.findMany({
    where: eq(salesChannels.status, "ACTIVE"),
  });

  const metaChannels = activeChannels.filter(
    (ch) => ch.platform === "FACEBOOK" || ch.platform === "INSTAGRAM",
  );

  await Promise.allSettled([
    // Meta channels
    ...metaChannels.map((ch) => syncProduct(ch.id, productId)),
    // Google channels
    syncProductToAllGoogleChannels(productId),
    // WhatsApp channels
    syncProductToAllWhatsAppChannels(productId),
    // TikTok channels
    syncProductToAllTikTokChannels(productId),
  ]);
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
