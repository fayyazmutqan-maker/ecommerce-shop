/**
 * TikTok Shop Catalog Sync Service
 *
 * Maps local products → TikTok Shop products and handles sync operations.
 * Unlike Meta/Google which use catalog batch APIs, TikTok uses individual
 * product create/update API calls with pre-uploaded images.
 *
 * Supports: full sync (all products) and incremental single-product sync.
 *
 * TikTok product docs: https://partner.tiktokshop.com/docv2/page/650aa4b9defece02be6b295b
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
  createProduct,
  updateProduct,
  deactivateProducts,
  uploadImageByUrl,
  getChannelToken,
  formatTikTokPrice,
  toKilograms,
} from "@/lib/tiktok-shop";
import type {
  TikTokCredentials,
  TikTokProductCreatePayload,
  TikTokProductUpdatePayload,
} from "@/lib/tiktok-shop";
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
  weight: number | null;
  weightUnit: string | null;
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

interface TikTokChannelSettings {
  autoSync?: boolean;
  syncInventory?: boolean;
  syncOrders?: boolean;
  defaultCategoryId?: string;
  warehouseId?: string;
  currency?: string;
  region?: string;
}

function parseSettings(raw: string | null): TikTokChannelSettings {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

// ─── Image Upload Helper ─────────────────────────────────────

/**
 * Upload product images to TikTok CDN and return URIs.
 * TikTok requires images to be on their CDN before product creation.
 */
async function uploadProductImages(
  images: { url: string; alt: string | null; isPrimary: boolean | null }[],
  accessToken: string,
  shopId: string,
): Promise<{ uri: string }[]> {
  const uris: { uri: string }[] = [];
  // Upload max 9 images (TikTok limit)
  const toUpload = images.slice(0, 9);

  for (const img of toUpload) {
    try {
      const result = await uploadImageByUrl(accessToken, shopId, img.url);
      uris.push({ uri: result.uri });
    } catch (error) {
      console.warn(`[TikTok] Image upload failed for ${img.url}:`, error);
      // Continue with remaining images
    }
  }

  return uris;
}

// ─── Product → TikTok Payload Mapper ─────────────────────────

/**
 * Map a local product to a TikTok product creation payload.
 */
function mapProductToTikTokPayload(
  product: ProductWithRelations,
  imageUris: { uri: string }[],
  settings: TikTokChannelSettings,
): TikTokProductCreatePayload | null {
  if (imageUris.length === 0) {
    // TikTok requires at least 1 image
    return null;
  }

  const currency = settings.currency || "SAR";
  const warehouseId = settings.warehouseId || "default";
  const categoryId = settings.defaultCategoryId || "";

  if (!categoryId) {
    // TikTok requires a category — product will need manual category assignment
    return null;
  }

  const activeVariants = product.variants.filter((v) => v.isActive !== false);

  // Build SKUs
  const skus: TikTokProductCreatePayload["skus"] = [];

  if (activeVariants.length > 0) {
    for (const variant of activeVariants) {
      const variantPrice = variant.price || product.price;
      const stock = variant.quantity ?? 0;

      skus.push({
        seller_sku: variant.sku || `${product.sku || product.id}_${variant.id}`,
        price: { amount: formatTikTokPrice(variantPrice, currency), currency },
        stock_infos: [{ warehouse_id: warehouseId, available_stock: Math.max(0, stock) }],
        identifier_code: product.barcode
          ? { code: product.barcode, type: 1 }
          : undefined,
      });
    }
  } else {
    // Single SKU product
    const stock = product.quantity ?? 0;
    skus.push({
      seller_sku: product.sku || product.id,
      price: { amount: formatTikTokPrice(product.price, currency), currency },
      stock_infos: [{ warehouse_id: warehouseId, available_stock: Math.max(0, stock) }],
      identifier_code: product.barcode
        ? { code: product.barcode, type: 1 }
        : undefined,
    });
  }

  const payload: TikTokProductCreatePayload = {
    title: product.name.slice(0, 255),
    description: (product.description || product.name).slice(0, 10000),
    category_id: categoryId,
    images: imageUris,
    skus,
    external_product_id: product.id,
  };

  // Add weight if available
  if (product.weight) {
    payload.package_weight = {
      value: toKilograms(product.weight, product.weightUnit),
      unit: "KILOGRAM",
    };
  }

  return payload;
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
      weight: true, weightUnit: true, countryOfOrigin: true,
    },
  });
}

// ─── Full Catalog Sync ───────────────────────────────────────

/**
 * Full catalog sync: pushes all ACTIVE products to TikTok Shop.
 * Creates new products or updates existing ones based on channelProducts tracking.
 */
export async function syncTikTokCatalog(channelId: string): Promise<SyncResult> {
  const channel = await db.query.salesChannels.findFirst({
    where: eq(salesChannels.id, channelId),
  });

  if (!channel) throw new Error("Channel not found");
  if (!channel.externalAccountId) throw new Error("No TikTok Shop configured");

  let credentials: TikTokCredentials;
  try {
    credentials = JSON.parse(channel.credentials || "{}");
  } catch {
    throw new Error("Invalid channel credentials");
  }

  const accessToken = await getChannelToken(channelId, credentials);
  const shopId = channel.externalAccountId;
  const settings = parseSettings(channel.settings);
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

  const allProducts = await getPublishedProducts();
  const errors: string[] = [];
  let synced = 0;
  let failed = 0;

  // Get existing channel product mappings
  const existingMappings = await db.query.channelProducts.findMany({
    where: eq(channelProducts.channelId, channelId),
  });
  const existingMap = new Map(existingMappings.map((m) => [m.productId, m]));

  for (const product of allProducts) {
    try {
      // Upload images first
      const sortedImages = [...product.images].sort((a, b) => {
        if (a.isPrimary && !b.isPrimary) return -1;
        if (!a.isPrimary && b.isPrimary) return 1;
        return (a.position ?? 0) - (b.position ?? 0);
      });

      const imageUris = await uploadProductImages(sortedImages, accessToken, shopId);
      if (imageUris.length === 0) {
        errors.push(`${product.name}: No images uploaded successfully`);
        failed++;
        continue;
      }

      const payload = mapProductToTikTokPayload(product, imageUris, settings);
      if (!payload) {
        errors.push(`${product.name}: Missing required fields (images or category)`);
        failed++;
        continue;
      }

      const existingMapping = existingMap.get(product.id);

      if (existingMapping?.externalProductId) {
        // Update existing product
        const updatePayload: TikTokProductUpdatePayload = {
          ...payload,
          product_id: existingMapping.externalProductId,
        };
        await updateProduct(accessToken, shopId, updatePayload);
      } else {
        // Create new product
        const result = await createProduct(accessToken, shopId, payload);

        // Track mapping
        await db.insert(channelProducts).values({
          channelId,
          productId: product.id,
          externalProductId: result.product_id,
          status: "SYNCED",
          lastSyncAt: new Date(),
        }).onConflictDoUpdate({
          target: [channelProducts.channelId, channelProducts.productId],
          set: {
            externalProductId: result.product_id,
            status: "SYNCED",
            lastSyncAt: new Date(),
          },
        });
      }

      synced++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      errors.push(`${product.name}: ${msg}`);
      failed++;
    }
  }

  // Update sync log
  const isFailed = synced === 0 && failed > 0;
  const isPartial = synced > 0 && failed > 0;

  await db.update(channelSyncLogs)
    .set({
      status: isFailed ? "FAILED" : isPartial ? "PARTIAL" : "SUCCESS",
      totalItems: allProducts.length,
      successCount: synced,
      failureCount: failed,
      errors: errors.length > 0 ? JSON.stringify(errors.slice(0, 50)) : null,
      completedAt: new Date(),
    })
    .where(eq(channelSyncLogs.id, syncLog.id));

  // Update channel sync metadata
  await db.update(salesChannels)
    .set({
      lastSyncAt: new Date(),
      lastSyncStatus: isFailed ? "FAILED" : isPartial ? "PARTIAL" : "SUCCESS",
      lastSyncError: isFailed ? errors[0] || null : null,
      syncedProductCount: synced,
    })
    .where(eq(salesChannels.id, channelId));

  return { totalProducts: allProducts.length, synced, failed, errors };
}

// ─── Single Product Sync ─────────────────────────────────────

/**
 * Incremental sync: push a single product change to all active TikTok channels.
 */
export async function syncProductToAllTikTokChannels(productId: string): Promise<void> {
  const channels = await db.query.salesChannels.findMany({
    where: and(
      eq(salesChannels.platform, "TIKTOK"),
      eq(salesChannels.status, "ACTIVE"),
    ),
  });

  if (channels.length === 0) return;

  const [product] = await getPublishedProducts([productId]);

  for (const channel of channels) {
    const settings = parseSettings(channel.settings);
    if (!settings.autoSync) continue;
    if (!channel.externalAccountId) continue;

    try {
      let credentials: TikTokCredentials;
      try {
        credentials = JSON.parse(channel.credentials || "{}");
      } catch {
        continue;
      }

      const accessToken = await getChannelToken(channel.id, credentials);
      const shopId = channel.externalAccountId;

      // Look up existing mapping
      const mapping = await db.query.channelProducts.findFirst({
        where: and(
          eq(channelProducts.channelId, channel.id),
          eq(channelProducts.productId, productId),
        ),
      });

      if (!product || product.status !== "ACTIVE") {
        // Product deleted or deactivated — deactivate on TikTok
        if (mapping?.externalProductId) {
          await deactivateProducts(accessToken, shopId, [mapping.externalProductId]);
          await db.update(channelProducts)
            .set({ status: "REMOVED", lastSyncAt: new Date() })
            .where(eq(channelProducts.id, mapping.id));
        }
        continue;
      }

      // Upload images
      const sortedImages = [...product.images].sort((a, b) => {
        if (a.isPrimary && !b.isPrimary) return -1;
        if (!a.isPrimary && b.isPrimary) return 1;
        return (a.position ?? 0) - (b.position ?? 0);
      });

      const imageUris = await uploadProductImages(sortedImages, accessToken, shopId);
      if (imageUris.length === 0) continue;

      const payload = mapProductToTikTokPayload(product, imageUris, settings);
      if (!payload) continue;

      if (mapping?.externalProductId) {
        // Update existing
        await updateProduct(accessToken, shopId, {
          ...payload,
          product_id: mapping.externalProductId,
        });

        await db.update(channelProducts)
          .set({ status: "SYNCED", lastSyncAt: new Date() })
          .where(eq(channelProducts.id, mapping.id));
      } else {
        // Create new
        const result = await createProduct(accessToken, shopId, payload);

        await db.insert(channelProducts).values({
          channelId: channel.id,
          productId,
          externalProductId: result.product_id,
          status: "SYNCED",
          lastSyncAt: new Date(),
        }).onConflictDoUpdate({
          target: [channelProducts.channelId, channelProducts.productId],
          set: {
            externalProductId: result.product_id,
            status: "SYNCED",
            lastSyncAt: new Date(),
          },
        });
      }
    } catch (error) {
      console.error(`[TikTok] Sync product ${productId} to channel ${channel.id} failed:`, error);
    }
  }
}

// ─── Product Removal ─────────────────────────────────────────

/**
 * Remove a product from all TikTok Shop channels (deactivate on TikTok).
 */
export async function removeProductFromTikTokChannels(productId: string): Promise<void> {
  const mappings = await db.query.channelProducts.findMany({
    where: eq(channelProducts.productId, productId),
    with: {
      channel: {
        columns: { id: true, platform: true, credentials: true, externalAccountId: true, status: true },
      },
    },
  });

  const tiktokMappings = mappings.filter(
    (m) => m.channel.platform === "TIKTOK" && m.externalProductId,
  );

  for (const mapping of tiktokMappings) {
    try {
      let credentials: TikTokCredentials;
      try {
        credentials = JSON.parse(mapping.channel.credentials || "{}");
      } catch {
        continue;
      }

      const accessToken = await getChannelToken(mapping.channel.id, credentials);
      const shopId = mapping.channel.externalAccountId;
      if (!shopId) continue;

      await deactivateProducts(accessToken, shopId, [mapping.externalProductId!]);

      await db.update(channelProducts)
        .set({ status: "REMOVED", lastSyncAt: new Date() })
        .where(eq(channelProducts.id, mapping.id));
    } catch (error) {
      console.error(`[TikTok] Remove product ${productId} from channel ${mapping.channel.id} failed:`, error);
    }
  }
}
