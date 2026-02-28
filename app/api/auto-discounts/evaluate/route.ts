import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { toNumber } from "@/lib/decimal";
import { eq, desc, inArray } from "drizzle-orm";
import { autoDiscounts, productCategories } from "@/lib/schema";

interface CartItem {
  productId: string;
  variantId?: string | null;
  name: string;
  price: number;
  quantity: number;
  categoryIds?: string[];
}

interface AppliedDiscount {
  id: string;
  name: string;
  type: string;
  discountType: string;
  discountValue: number;
  savedAmount: number;
  description: string;
}

/**
 * POST /api/auto-discounts/evaluate — Evaluate which auto discounts apply to a cart
 */
export async function POST(req: Request) {
  try {
    const { items, orderAmount } = await req.json() as { items: CartItem[]; orderAmount: number };

    if (!items || items.length === 0) {
      return NextResponse.json({ discounts: [], totalSaved: 0 });
    }

    const session = await auth();
    const userId = session?.user?.id || null;
    const now = new Date();

    // Fetch all active auto discounts
    const allDiscounts = await db.query.autoDiscounts.findMany({
      where: eq(autoDiscounts.status, "ACTIVE"),
      orderBy: desc(autoDiscounts.priority),
    });

    // Filter out expired ones and those past start date
    const activeDiscounts = allDiscounts.filter((d) => {
      if (d.startsAt && d.startsAt > now) return false;
      if (d.expiresAt && d.expiresAt < now) return false;
      if (d.maxUsesTotal && d.usedCount >= d.maxUsesTotal) return false;
      return true;
    });

    // Get product category mappings for the cart items
    const productIds = items.map((i) => i.productId);
    const productCats = await db.select({
      productId: productCategories.productId,
      categoryId: productCategories.categoryId,
    }).from(productCategories).where(inArray(productCategories.productId, productIds));

    const productCategoryMap = new Map<string, string[]>();
    for (const pc of productCats) {
      const existing = productCategoryMap.get(pc.productId) || [];
      existing.push(pc.categoryId);
      productCategoryMap.set(pc.productId, existing);
    }

    // Enrich items with category info
    const enrichedItems = items.map((item) => ({
      ...item,
      categoryIds: productCategoryMap.get(item.productId) || [],
    }));

    const appliedDiscounts: AppliedDiscount[] = [];
    let totalSaved = 0;
    let nonCombinableApplied = false;

    for (const discount of activeDiscounts) {
      // Skip if non-combinable discount already applied and this one doesn't combine
      if (nonCombinableApplied && !discount.combinesWith) continue;

      // Check customer restriction
      if (discount.customerIds) {
        const customerIds = JSON.parse(discount.customerIds) as string[];
        if (customerIds.length > 0 && (!userId || !customerIds.includes(userId))) continue;
      }

      let applies = false;
      let savedAmount = 0;
      let description = "";

      const buyProductIds = discount.buyProductIds ? JSON.parse(discount.buyProductIds) as string[] : [];
      const buyCategoryIds = discount.buyCategoryIds ? JSON.parse(discount.buyCategoryIds) as string[] : [];

      // Get qualifying items (items that match the buy conditions)
      const qualifyingItems = enrichedItems.filter((item) => {
        if (buyProductIds.length > 0) return buyProductIds.includes(item.productId);
        if (buyCategoryIds.length > 0) return item.categoryIds.some((c) => buyCategoryIds.includes(c));
        return true; // No product/category restriction = all items qualify
      });

      const totalQualifyingQty = qualifyingItems.reduce((s, i) => s + i.quantity, 0);
      const totalQualifyingAmount = qualifyingItems.reduce((s, i) => s + i.price * i.quantity, 0);

      switch (discount.type) {
        case "BOGO": {
          // Buy One Get One: buy minQuantity, get getQuantity free of same/specified products
          const minQty = discount.minQuantity || 2;
          if (totalQualifyingQty >= minQty) {
            const freeQty = discount.getQuantity || 1;
            // Get cheapest qualifying items as free
            const prices = qualifyingItems
              .flatMap((i) => Array(i.quantity).fill(i.price))
              .sort((a: number, b: number) => a - b);
            const actualFreeQty = Math.min(freeQty, Math.floor(totalQualifyingQty / minQty) * freeQty);
            savedAmount = prices.slice(0, actualFreeQty).reduce((s: number, p: number) => s + p, 0);
            applies = savedAmount > 0;
            description = `Buy ${minQty}, get ${freeQty} free`;
          }
          break;
        }

        case "BUY_X_GET_Y": {
          // Buy X items from buy list, get Y items free/discounted from get list
          const minQty = discount.minQuantity || 1;
          if (totalQualifyingQty >= minQty) {
            const getProductIds = discount.getProductIds ? JSON.parse(discount.getProductIds) as string[] : [];
            const getCategoryIds = discount.getCategoryIds ? JSON.parse(discount.getCategoryIds) as string[] : [];
            const getQty = discount.getQuantity || 1;

            // Find reward items in cart
            const rewardItems = enrichedItems.filter((item) => {
              if (getProductIds.length > 0) return getProductIds.includes(item.productId);
              if (getCategoryIds.length > 0) return item.categoryIds.some((c) => getCategoryIds.includes(c));
              return true;
            });

            if (rewardItems.length > 0) {
              const rewardPrices = rewardItems
                .flatMap((i) => Array(i.quantity).fill(i.price))
                .sort((a: number, b: number) => a - b);
              const actualGetQty = Math.min(getQty, rewardPrices.length);

              if (discount.discountType === "FREE_ITEM") {
                savedAmount = rewardPrices.slice(0, actualGetQty).reduce((s: number, p: number) => s + p, 0);
              } else if (discount.discountType === "PERCENTAGE") {
                const itemsTotal = rewardPrices.slice(0, actualGetQty).reduce((s: number, p: number) => s + p, 0);
                savedAmount = itemsTotal * (toNumber(discount.discountValue) / 100);
              } else {
                savedAmount = Math.min(toNumber(discount.discountValue) * actualGetQty, rewardPrices.slice(0, actualGetQty).reduce((s: number, p: number) => s + p, 0));
              }
              applies = savedAmount > 0;
              description = `Buy ${minQty}, get ${getQty} at ${discount.discountType === "FREE_ITEM" ? "free" : discount.discountType === "PERCENTAGE" ? `${toNumber(discount.discountValue)}% off` : `SAR ${toNumber(discount.discountValue)} off`}`;
            }
          }
          break;
        }

        case "SPEND_X_GET_Y": {
          // Spend X amount, get Y% or fixed amount off
          const minAmount = toNumber(discount.minOrderAmount) || 0;
          if (orderAmount >= minAmount) {
            if (discount.discountType === "PERCENTAGE") {
              savedAmount = orderAmount * (toNumber(discount.discountValue) / 100);
            } else if (discount.discountType === "FIXED_AMOUNT") {
              savedAmount = Math.min(toNumber(discount.discountValue), orderAmount);
            } else if (discount.discountType === "FREE_ITEM" && discount.getProductIds) {
              const getProductIds = JSON.parse(discount.getProductIds) as string[];
              const rewardInCart = enrichedItems.filter((i) => getProductIds.includes(i.productId));
              savedAmount = rewardInCart.reduce((s, i) => s + i.price * Math.min(i.quantity, discount.getQuantity || 1), 0);
            }
            applies = savedAmount > 0;
            description = `Spend SAR ${minAmount}+, get ${discount.discountType === "PERCENTAGE" ? `${toNumber(discount.discountValue)}% off` : discount.discountType === "FIXED_AMOUNT" ? `SAR ${toNumber(discount.discountValue)} off` : "free item"}`;
          }
          break;
        }

        case "PERCENTAGE_OFF": {
          // Simple percentage off qualifying items
          const minQty = discount.minQuantity || 0;
          const minAmount = toNumber(discount.minOrderAmount) || 0;
          if (totalQualifyingQty >= minQty && totalQualifyingAmount >= minAmount) {
            savedAmount = totalQualifyingAmount * (toNumber(discount.discountValue) / 100);
            applies = savedAmount > 0;
            description = `${toNumber(discount.discountValue)}% off${buyProductIds.length > 0 || buyCategoryIds.length > 0 ? " select items" : " everything"}`;
          }
          break;
        }

        case "FIXED_OFF": {
          // Fixed amount off
          const minAmount = toNumber(discount.minOrderAmount) || 0;
          if (orderAmount >= minAmount) {
            savedAmount = Math.min(toNumber(discount.discountValue), orderAmount);
            applies = savedAmount > 0;
            description = `SAR ${toNumber(discount.discountValue)} off orders over SAR ${minAmount}`;
          }
          break;
        }
      }

      if (applies && savedAmount > 0) {
        appliedDiscounts.push({
          id: discount.id,
          name: discount.name,
          type: discount.type,
          discountType: discount.discountType,
          discountValue: toNumber(discount.discountValue),
          savedAmount: Math.round(savedAmount * 100) / 100,
          description,
        });
        totalSaved += savedAmount;

        if (!discount.combinesWith) {
          nonCombinableApplied = true;
        }
      }
    }

    return NextResponse.json({
      discounts: appliedDiscounts,
      totalSaved: Math.round(totalSaved * 100) / 100,
    });
  } catch (error) {
    console.error("Evaluate auto discounts error:", error);
    return NextResponse.json({ error: "Failed to evaluate discounts" }, { status: 500 });
  }
}
