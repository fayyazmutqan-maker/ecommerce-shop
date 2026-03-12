/**
 * Snapchat Catalog Sync Service
 *
 * Maps local products → Snapchat catalog product items and handles batch sync.
 * Snapchat uses a catalog-based approach similar to Meta — products are
 * identified by retailer_id (our SKU/product ID) and batch-upserted.
 *
 * Supports: full sync (all products) and incremental single-product sync.
 *
 * Snapchat Catalogs docs: https://marketingapi.snapchat.com/docs/#catalogs
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
  batchUpsertProducts,
  batchDeleteProducts,
  getChannelToken,
  formatSnapchatPrice,
} from "@/lib/snapchat";
import type {
  SnapchatCredentials,
  SnapchatProductItemPayload,
} from "@/lib/snapchat";
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

interface SnapchatChannelSettings {
  autoSync?: boolean;
  syncInventory?: boolean;
  currency?: string;
}

function parseSettings(raw: string | null): SnapchatChannelSettings {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

// ─── Fetch Published Products ────────────────────────────────

async function getPublishedProducts(
  productIds?: string[],
): Promise<ProductWithRelations[]> {
  const whereClause = productIds
    ? and(eq(products.status, "ACTIVE"), inArray(products.id, productIds))
    : eq(products.status, "ACTIVE");

  const allProducts = await db.query.products.findMany({
    where: whereClause,
    with: {
      images: {
        orderBy: [asc(productImages.position)],
        columns: { url: true, alt: true, isPrimary: true, position: true },
      },
      variants: {
        columns: {
          id: true,
          name: true,
          sku: true,
          price: true,
          compareAtPrice: true,
          quantity: true,
          option1: true,
          option2: true,
          option3: true,
          image: true,
          isActive: true,
        },
      },
    },
  });

  return allProducts as ProductWithRelations[];
}

// ─── Map Product to Snapchat Payload ─────────────────────────

/**
 * Map a local product into Snapchat catalog product item payload(s).
 * For products with variants, creates one item per variant (retailer_id = variant SKU).
 * For products without variants, creates a single item (retailer_id = product SKU/ID).
 */
function mapProductToSnapchatItems(
  product: ProductWithRelations,
  settings: SnapchatChannelSettings,
): SnapchatProductItemPayload[] {
  const storeUrl = env.NEXT_PUBLIC_APP_URL;
  const currency = settings.currency || "SAR";

  // Primary image
  const sortedImages = [...product.images].sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return (a.position ?? 0) - (b.position ?? 0);
  });

  const primaryImageUrl = sortedImages[0]?.url;
  if (!primaryImageUrl) return []; // Must have at least one image

  const additionalImages = sortedImages.slice(1, 10).map((img) => img.url);

  const description = (product.description || product.name).substring(0, 5000);
  const link = `${storeUrl}/products/${product.slug}`;

  const activeVariants = product.variants.filter((v) => v.isActive !== false);

  // Determine availability
  const getAvailability = (qty: number | null, trackInventory: boolean | null): "in stock" | "out of stock" => {
    if (!trackInventory) return "in stock";
    return (qty != null && qty > 0) ? "in stock" : "out of stock";
  };

  if (activeVariants.length > 0) {
    return activeVariants.map((variant) => {
      const variantSku = variant.sku || `${product.sku || product.id}-${variant.id}`;
      const variantPrice = variant.price || product.price;
      const variantComparePrice = variant.compareAtPrice || product.compareAtPrice;

      const item: SnapchatProductItemPayload = {
        retailer_id: variantSku,
        title: variant.name
          ? `${product.name} - ${variant.name}`
          : `${product.name} - ${[variant.option1, variant.option2, variant.option3].filter(Boolean).join(" / ")}`,
        description,
        link: `${link}?variant=${variant.id}`,
        image_url: variant.image || primaryImageUrl,
        price: formatSnapchatPrice(variantPrice, currency),
        availability: getAvailability(variant.quantity, product.trackInventory),
        condition: "new",
      };

      if (variantComparePrice && parseFloat(variantComparePrice) > parseFloat(variantPrice)) {
        item.sale_price = formatSnapchatPrice(variantPrice, currency);
        item.price = formatSnapchatPrice(variantComparePrice, currency);
      }

      if (product.vendor) item.brand = product.vendor;
      if (product.barcode) item.gtin = product.barcode;
      if (product.productType) item.custom_label_0 = product.productType;
      if (additionalImages.length > 0) item.additional_image_urls = additionalImages;

      return item;
    });
  }

  // Single product (no variants)
  const retailerId = product.sku || product.id;
  const item: SnapchatProductItemPayload = {
    retailer_id: retailerId,
    title: product.name,
    description,
    link,
    image_url: primaryImageUrl,
    price: formatSnapchatPrice(product.price, currency),
    availability: getAvailability(product.quantity, product.trackInventory),
    condition: "new",
  };

  if (product.compareAtPrice && parseFloat(product.compareAtPrice) > parseFloat(product.price)) {
    item.sale_price = formatSnapchatPrice(product.price, currency);
    item.price = formatSnapchatPrice(product.compareAtPrice, currency);
  }

  if (product.vendor) item.brand = product.vendor;
  if (product.barcode) item.gtin = product.barcode;
  if (product.productType) item.custom_label_0 = product.productType;
  if (additionalImages.length > 0) item.additional_image_urls = additionalImages;

  return [item];
}

// ─── Full Catalog Sync ───────────────────────────────────────

/**
 * Full sync: push all active products to Snapchat catalog.
 */
export async function syncSnapchatCatalog(channelId: string): Promise<SyncResult> {
  const channel = await db.query.salesChannels.findFirst({
    where: eq(salesChannels.id, channelId),
  });

  if (!channel || channel.platform !== "SNAPCHAT") {
    throw new Error("Snapchat channel not found");
  }

  if (!channel.externalCatalogId) {
    throw new Error("No catalog configured for this channel");
  }

  let credentials: SnapchatCredentials;
  try {
    credentials = JSON.parse(channel.credentials || "{}");
    if (!credentials.accessToken || !credentials.refreshToken || !credentials.expiresAt) {
      throw new Error("Missing required credential fields");
    }
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Invalid channel credentials");
  }

  const settings = parseSettings(channel.settings);
  const catalogId = channel.externalCatalogId;

  // Create sync log
  const [syncLog] = await db.insert(channelSyncLogs).values({
    channelId,
    type: "CATALOG_FULL",
    status: "RUNNING",
    startedAt: new Date(),
  }).returning({ id: channelSyncLogs.id });

  const allProducts = await getPublishedProducts();
  const items: SnapchatProductItemPayload[] = [];
  const retailerIdToProductId = new Map<string, string>();

  for (const product of allProducts) {
    const mapped = mapProductToSnapchatItems(product, settings);
    for (const item of mapped) {
      items.push(item);
      retailerIdToProductId.set(item.retailer_id, product.id);
    }
  }

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  try {
    const accessToken = await getChannelToken(channelId, credentials);

    const result = await batchUpsertProducts(accessToken, catalogId, items);
    synced = result.success_count;
    failed = result.error_count;
    errors.push(...result.errors);

    // Track product mappings
    const uniqueProductIds = [...new Set(retailerIdToProductId.values())];
    for (const productId of uniqueProductIds) {
      const retailerIds = [...retailerIdToProductId.entries()]
        .filter(([, pid]) => pid === productId)
        .map(([rid]) => rid);

      await db.insert(channelProducts).values({
        channelId,
        productId,
        externalProductId: retailerIds[0],
        externalVariantIds: retailerIds.length > 1 ? JSON.stringify(retailerIds) : null,
        status: "SYNCED",
        lastSyncAt: new Date(),
      }).onConflictDoUpdate({
        target: [channelProducts.channelId, channelProducts.productId],
        set: {
          externalProductId: retailerIds[0],
          externalVariantIds: retailerIds.length > 1 ? JSON.stringify(retailerIds) : null,
          status: "SYNCED",
          lastSyncAt: new Date(),
        },
      });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Sync failed";
    errors.push(msg);
    failed = items.length;
  }

  // Update sync log
  const isFailed = synced === 0 && failed > 0;
  const isPartial = synced > 0 && failed > 0;

  await db.update(channelSyncLogs)
    .set({
      status: isFailed ? "FAILED" : isPartial ? "PARTIAL" : "SUCCESS",
      totalItems: items.length,
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
 * Incremental sync: push a single product change to all active Snapchat channels.
 */
export async function syncProductToAllSnapchatChannels(productId: string): Promise<void> {
  const channels = await db.query.salesChannels.findMany({
    where: and(
      eq(salesChannels.platform, "SNAPCHAT"),
      eq(salesChannels.status, "ACTIVE"),
    ),
  });

  if (channels.length === 0) return;

  const [product] = await getPublishedProducts([productId]);

  for (const channel of channels) {
    const settings = parseSettings(channel.settings);
    if (!settings.autoSync) continue;
    if (!channel.externalCatalogId) continue;

    try {
      let credentials: SnapchatCredentials;
      try {
        credentials = JSON.parse(channel.credentials || "{}");
        if (!credentials.accessToken || !credentials.refreshToken || !credentials.expiresAt) {
          continue;
        }
      } catch {
        continue;
      }

      const accessToken = await getChannelToken(channel.id, credentials);
      const catalogId = channel.externalCatalogId;

      // Look up existing mapping
      const mapping = await db.query.channelProducts.findFirst({
        where: and(
          eq(channelProducts.channelId, channel.id),
          eq(channelProducts.productId, productId),
        ),
      });

      if (!product || product.status !== "ACTIVE") {
        // Product deleted or deactivated — remove from Snapchat catalog
        if (mapping?.externalProductId) {
          const retailerIds = mapping.externalVariantIds
            ? JSON.parse(mapping.externalVariantIds)
            : [mapping.externalProductId];
          await batchDeleteProducts(accessToken, catalogId, retailerIds);

          await db.update(channelProducts)
            .set({ status: "REMOVED", lastSyncAt: new Date() })
            .where(eq(channelProducts.id, mapping.id));
        }
        continue;
      }

      // Map product to Snapchat items
      const items = mapProductToSnapchatItems(product, settings);
      if (items.length === 0) continue;

      // Batch upsert
      await batchUpsertProducts(accessToken, catalogId, items);

      const retailerIds = items.map((i) => i.retailer_id);

      // Track mapping
      await db.insert(channelProducts).values({
        channelId: channel.id,
        productId,
        externalProductId: retailerIds[0],
        externalVariantIds: retailerIds.length > 1 ? JSON.stringify(retailerIds) : null,
        status: "SYNCED",
        lastSyncAt: new Date(),
      }).onConflictDoUpdate({
        target: [channelProducts.channelId, channelProducts.productId],
        set: {
          externalProductId: retailerIds[0],
          externalVariantIds: retailerIds.length > 1 ? JSON.stringify(retailerIds) : null,
          status: "SYNCED",
          lastSyncAt: new Date(),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed";
      console.error(`[Snapchat] Sync product ${productId} to channel ${channel.id} failed:`, error);
      await db.insert(channelProducts).values({
        channelId: channel.id,
        productId,
        status: "ERROR",
        lastError: message,
        lastSyncAt: new Date(),
      }).onConflictDoUpdate({
        target: [channelProducts.channelId, channelProducts.productId],
        set: { status: "ERROR", lastError: message, lastSyncAt: new Date() },
      }).catch(() => {});
    }
  }
}

// ─── Product Removal ─────────────────────────────────────────

/**
 * Remove a product from all Snapchat channels (delete from catalogs).
 */
export async function removeProductFromSnapchatChannels(productId: string): Promise<void> {
  const mappings = await db.query.channelProducts.findMany({
    where: eq(channelProducts.productId, productId),
    with: {
      channel: {
        columns: { id: true, platform: true, credentials: true, externalCatalogId: true, status: true },
      },
    },
  });

  const snapchatMappings = mappings.filter(
    (m) => m.channel.platform === "SNAPCHAT" && m.externalProductId,
  );

  for (const mapping of snapchatMappings) {
    try {
      let credentials: SnapchatCredentials;
      try {
        credentials = JSON.parse(mapping.channel.credentials || "{}");
        if (!credentials.accessToken || !credentials.refreshToken || !credentials.expiresAt) {
          continue;
        }
      } catch {
        continue;
      }

      const accessToken = await getChannelToken(mapping.channel.id, credentials);
      const catalogId = mapping.channel.externalCatalogId;
      if (!catalogId) continue;

      const retailerIds = mapping.externalVariantIds
        ? JSON.parse(mapping.externalVariantIds)
        : [mapping.externalProductId!];

      await batchDeleteProducts(accessToken, catalogId, retailerIds);

      await db.update(channelProducts)
        .set({ status: "REMOVED", lastSyncAt: new Date() })
        .where(eq(channelProducts.id, mapping.id));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Removal failed";
      console.error(`[Snapchat] Remove product ${productId} from channel ${mapping.channel.id} failed:`, error);
      await db.update(channelProducts)
        .set({ status: "ERROR", lastError: message, lastSyncAt: new Date() })
        .where(eq(channelProducts.id, mapping.id))
        .catch(() => {});
    }
  }
}
