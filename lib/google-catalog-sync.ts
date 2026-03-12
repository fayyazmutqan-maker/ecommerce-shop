/**
 * Google Catalog Sync Service
 *
 * Maps local products → Google Shopping Product Items and handles sync operations.
 * Supports full sync (all products) and incremental sync (changed products).
 *
 * Uses the Google Content API for Shopping v2.1 batch endpoint for efficiency.
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
  batchProducts,
  deleteProduct,
  getValidToken,
  formatGooglePrice,
  buildGoogleProductId,
} from "@/lib/google-merchant";
import type { GoogleCredentials, GoogleProductItem, GoogleBatchEntry } from "@/lib/google-merchant";
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
  customBadge: string | null;
  hsCode: string | null;
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

// ─── Channel Settings Type ───────────────────────────────────

interface GoogleChannelSettings {
  autoSync?: boolean;
  syncInventory?: boolean;
  contentLanguage?: string;
  targetCountry?: string;
}

function parseSettings(raw: string | null): GoogleChannelSettings {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

// ─── Product → Google Shopping Item Mapper ────────────────────

function mapProductToGoogleItem(
  product: ProductWithRelations,
  storeUrl: string,
  contentLanguage: string,
  targetCountry: string,
): GoogleProductItem[] {
  const primaryImage = product.images.find((img) => img.isPrimary) || product.images[0];
  const additionalImages = product.images
    .filter((img) => img.url !== primaryImage?.url)
    .map((img) => img.url)
    .slice(0, 10); // Google allows max 10 additional images

  const baseItem: Omit<GoogleProductItem, "offerId" | "price" | "availability" | "sizes" | "color" | "itemGroupId" | "salePrice" | "gtin"> = {
    title: product.name.slice(0, 150), // Google max 150 chars
    description: (product.description || product.name).slice(0, 5000), // Google max 5000 chars
    link: `${storeUrl}/products/${product.slug}`,
    imageLink: primaryImage?.url || `${storeUrl}/placeholder.png`,
    additionalImageLinks: additionalImages.length > 0 ? additionalImages : undefined,
    contentLanguage,
    targetCountry,
    channel: "online",
    condition: "new",
    brand: product.vendor || undefined,
    googleProductCategory: product.productType || undefined,
    productTypes: product.productType ? [product.productType] : undefined,
    customLabel0: product.tags?.split(",")[0]?.trim() || undefined,
    customLabel1: product.customBadge || undefined,
    identifierExists: !!(product.barcode || product.vendor),
    weight: product.weight
      ? { value: String(product.weight), unit: product.weightUnit || "kg" }
      : undefined,
  };

  // If product has active variants, create one item per variant
  const activeVariants = product.variants.filter((v) => v.isActive !== false);

  if (activeVariants.length > 0) {
    return activeVariants.map((variant) => {
      const variantId = variant.sku || `${product.id}_${variant.id}`;
      const variantPrice = variant.price || product.price;
      const hasCompareAt = variant.compareAtPrice || product.compareAtPrice;

      return {
        ...baseItem,
        offerId: variantId,
        price: hasCompareAt
          ? formatGooglePrice(hasCompareAt)
          : formatGooglePrice(variantPrice),
        salePrice: hasCompareAt
          ? formatGooglePrice(variantPrice)
          : undefined,
        availability: getAvailability(variant.quantity, product.trackInventory),
        itemGroupId: product.id,
        gtin: product.barcode || undefined,
        color: variant.option1 || undefined,
        sizes: variant.option2 ? [variant.option2] : undefined,
        imageLink: variant.image || baseItem.imageLink,
      };
    });
  }

  // Single product (no variants)
  const hasCompareAt = !!product.compareAtPrice;
  return [{
    ...baseItem,
    offerId: product.sku || product.id,
    price: hasCompareAt
      ? formatGooglePrice(product.compareAtPrice!)
      : formatGooglePrice(product.price),
    salePrice: hasCompareAt
      ? formatGooglePrice(product.price)
      : undefined,
    availability: getAvailability(product.quantity, product.trackInventory),
    gtin: product.barcode || undefined,
  }];
}

function getAvailability(
  quantity: number | null,
  trackInventory: boolean | null,
): GoogleProductItem["availability"] {
  if (!trackInventory) return "in_stock";
  if (quantity === null || quantity > 0) return "in_stock";
  return "out_of_stock";
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
      customBadge: true, hsCode: true,
    },
  });
}

// ─── Full Catalog Sync ───────────────────────────────────────

/**
 * Full catalog sync: pushes all ACTIVE products to Google Merchant Center.
 */
export async function syncGoogleCatalog(channelId: string): Promise<SyncResult> {
  const channel = await db.query.salesChannels.findFirst({
    where: eq(salesChannels.id, channelId),
  });

  if (!channel) throw new Error("Channel not found");
  if (!channel.externalAccountId) throw new Error("No merchant account configured for this channel");

  let credentials: GoogleCredentials;
  try {
    credentials = JSON.parse(channel.credentials || "{}");
  } catch {
    throw new Error("Invalid channel credentials");
  }
  if (!credentials.accessToken || !credentials.refreshToken) {
    throw new Error("Channel not authorized");
  }

  const settings = parseSettings(channel.settings);
  const storeUrl = env.NEXT_PUBLIC_APP_URL;
  const contentLanguage = settings.contentLanguage || "en";
  const targetCountry = settings.targetCountry || "SA";
  const merchantId = channel.externalAccountId;

  // Ensure token is valid
  const tokenResult = await getValidToken(credentials);
  if (tokenResult.updated) {
    await db.update(salesChannels).set({
      credentials: JSON.stringify(tokenResult.credentials),
    }).where(eq(salesChannels.id, channelId));
  }
  const accessToken = tokenResult.accessToken;

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

    // Map all products to Google items
    const allItems: { productId: string; items: GoogleProductItem[] }[] = [];
    for (const product of publishedProducts) {
      const items = mapProductToGoogleItem(product, storeUrl, contentLanguage, targetCountry);
      allItems.push({ productId: product.id, items });
    }

    // Build batch entries (Google allows up to 10,000 per batch; we use 1000 per batch for reliability)
    const BATCH_SIZE = 1000;
    const allEntries: { entry: GoogleBatchEntry; productId: string }[] = [];
    let batchIdCounter = 0;

    for (const { productId, items } of allItems) {
      for (const item of items) {
        allEntries.push({
          entry: {
            batchId: batchIdCounter++,
            merchantId,
            method: "insert",
            product: item,
          },
          productId,
        });
      }
    }

    // Process in batches
    const failedProducts = new Set<string>();

    for (let i = 0; i < allEntries.length; i += BATCH_SIZE) {
      const batch = allEntries.slice(i, i + BATCH_SIZE);
      const entries = batch.map((b) => b.entry);
      // Build a lookup from batchId → productId for this batch
      const batchIdToProduct = new Map<number, string>();
      for (const b of batch) {
        batchIdToProduct.set(b.entry.batchId, b.productId);
      }

      try {
        const batchResult = await batchProducts(merchantId, entries, accessToken);

        // Track failures via batchId lookup
        for (const entry of batchResult.entries) {
          if (entry.errors && entry.errors.length > 0) {
            const errorMsg = entry.errors.map((e) => e.message).join("; ");
            const productId = batchIdToProduct.get(entry.batchId);
            if (productId) {
              failedProducts.add(productId);
              result.errors.push(`Product ${productId}: ${errorMsg}`);
            }
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Batch request failed";
        result.errors.push(message);
        // Mark all products in this batch as failed
        for (const b of batch) {
          failedProducts.add(b.productId);
        }
      }
    }

    // Count unique products
    const uniqueProductIds = new Set(allItems.map((a) => a.productId));
    result.synced = uniqueProductIds.size - failedProducts.size;
    result.failed = failedProducts.size;

    // Upsert channel product records
    for (const { productId, items } of allItems) {
      const isFailed = failedProducts.has(productId);
      const variantIds = items.map((item) => item.offerId);
      const externalId = buildGoogleProductId(
        items[0].offerId,
        contentLanguage,
        targetCountry,
      );

      await db
        .insert(channelProducts)
        .values({
          channelId,
          productId,
          externalProductId: externalId,
          externalVariantIds: JSON.stringify(variantIds),
          status: isFailed ? "ERROR" : "SYNCED",
          lastSyncAt: new Date(),
          lastError: isFailed ? result.errors.find((e) => e.includes(productId)) || null : null,
        })
        .onConflictDoUpdate({
          target: [channelProducts.channelId, channelProducts.productId],
          set: {
            externalProductId: externalId,
            externalVariantIds: JSON.stringify(variantIds),
            status: isFailed ? "ERROR" : "SYNCED",
            lastSyncAt: new Date(),
            lastError: isFailed ? result.errors.find((e) => e.includes(productId)) || null : null,
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
 * Sync a single product to a specific Google Merchant channel.
 * Called from product change hooks.
 */
export async function syncGoogleProduct(channelId: string, productId: string): Promise<void> {
  const channel = await db.query.salesChannels.findFirst({
    where: eq(salesChannels.id, channelId),
  });

  if (!channel?.externalAccountId) return;

  let credentials: GoogleCredentials;
  try {
    credentials = JSON.parse(channel.credentials || "{}");
  } catch { return; }
  if (!credentials.accessToken || !credentials.refreshToken) return;

  const settings = parseSettings(channel.settings);
  if (settings.autoSync === false) return;

  const storeUrl = env.NEXT_PUBLIC_APP_URL;
  const contentLanguage = settings.contentLanguage || "en";
  const targetCountry = settings.targetCountry || "SA";
  const merchantId = channel.externalAccountId;

  // Ensure token is valid
  let accessToken: string;
  try {
    const tokenResult = await getValidToken(credentials);
    if (tokenResult.updated) {
      await db.update(salesChannels).set({
        credentials: JSON.stringify(tokenResult.credentials),
      }).where(eq(salesChannels.id, channelId));
    }
    accessToken = tokenResult.accessToken;
  } catch (error) {
    console.error(`[Google Sync] Token refresh failed for channel ${channelId}:`, error);
    return;
  }

  const publishedProducts = await getPublishedProducts([productId]);

  if (publishedProducts.length === 0) {
    // Product was unpublished — remove from Google
    const existing = await db.query.channelProducts.findFirst({
      where: and(
        eq(channelProducts.channelId, channelId),
        eq(channelProducts.productId, productId),
      ),
    });
    if (existing?.externalProductId) {
      try {
        // Delete main product and all variants
        const variantIds: string[] = existing.externalVariantIds
          ? JSON.parse(existing.externalVariantIds)
          : [];

        for (const offerId of variantIds) {
          const googleId = buildGoogleProductId(offerId, contentLanguage, targetCountry);
          await deleteProduct(merchantId, googleId, accessToken);
        }
        // Also delete by externalProductId if different
        if (!variantIds.includes(existing.externalProductId)) {
          await deleteProduct(merchantId, existing.externalProductId, accessToken);
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
  const items = mapProductToGoogleItem(product, storeUrl, contentLanguage, targetCountry);

  try {
    // Use batch for efficiency even with a single product
    const entries: GoogleBatchEntry[] = items.map((item, idx) => ({
      batchId: idx,
      merchantId,
      method: "insert" as const,
      product: item,
    }));

    const batchResult = await batchProducts(merchantId, entries, accessToken);

    // Validate batch response for per-entry errors
    const entryErrors: string[] = [];
    for (const entry of batchResult.entries) {
      if (entry.errors && entry.errors.length > 0) {
        entryErrors.push(entry.errors.map((e) => e.message).join("; "));
      }
    }
    if (entryErrors.length > 0) {
      throw new Error(`Batch sync failed: ${entryErrors[0]}`);
    }

    const variantIds = items.map((item) => item.offerId);
    const externalId = buildGoogleProductId(items[0].offerId, contentLanguage, targetCountry);

    await db
      .insert(channelProducts)
      .values({
        channelId,
        productId: product.id,
        externalProductId: externalId,
        externalVariantIds: JSON.stringify(variantIds),
        status: "SYNCED",
        lastSyncAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [channelProducts.channelId, channelProducts.productId],
        set: {
          externalProductId: externalId,
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

// ─── Remove Product from Google Channels ─────────────────────

/**
 * Remove a product from all Google Merchant Center channels.
 * Called when a product is deleted or archived.
 */
export async function removeProductFromGoogleChannels(productId: string): Promise<void> {
  const linked = await db.query.channelProducts.findMany({
    where: eq(channelProducts.productId, productId),
  });

  for (const cp of linked) {
    const channel = await db.query.salesChannels.findFirst({
      where: eq(salesChannels.id, cp.channelId),
    });
    if (!channel?.externalAccountId || channel.platform !== "GOOGLE") continue;
    if (!cp.externalProductId) continue;

    let credentials: GoogleCredentials;
    try {
      credentials = JSON.parse(channel.credentials || "{}");
    } catch { continue; }
    if (!credentials.accessToken || !credentials.refreshToken) continue;

    const settings = parseSettings(channel.settings);
    const contentLanguage = settings.contentLanguage || "en";
    const targetCountry = settings.targetCountry || "SA";

    try {
      const tokenResult = await getValidToken(credentials);
      if (tokenResult.updated) {
        await db.update(salesChannels).set({
          credentials: JSON.stringify(tokenResult.credentials),
        }).where(eq(salesChannels.id, cp.channelId));
      }

      // Delete all variant IDs
      const variantIds: string[] = cp.externalVariantIds
        ? JSON.parse(cp.externalVariantIds)
        : [];

      for (const offerId of variantIds) {
        const googleId = buildGoogleProductId(offerId, contentLanguage, targetCountry);
        await deleteProduct(channel.externalAccountId, googleId, tokenResult.accessToken);
      }
    } catch { /* best effort */ }
  }
}

// ─── Sync to All Active Google Channels ──────────────────────

/**
 * Sync a product to all active Google Merchant Center channels.
 */
export async function syncProductToAllGoogleChannels(productId: string): Promise<void> {
  const activeChannels = await db.query.salesChannels.findMany({
    where: and(
      eq(salesChannels.status, "ACTIVE"),
      eq(salesChannels.platform, "GOOGLE"),
    ),
  });

  await Promise.allSettled(
    activeChannels.map((ch) => syncGoogleProduct(ch.id, productId)),
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
