import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, productAttributes, productAttributeValues, productCategories, categories } from "@/lib/schema";
import { eq, and, sql, asc, inArray, isNull, gt, gte, isNotNull } from "drizzle-orm";
import { getLocale } from "next-intl/server";
import { applyTranslationsBatch } from "@/lib/translations";

// GET filterable attributes with counts for active products
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    // Get all product IDs matching filter
    let productIds: string[];

    if (category) {
      const rows = await db
        .select({ id: products.id })
        .from(products)
        .innerJoin(productCategories, eq(productCategories.productId, products.id))
        .innerJoin(categories, eq(categories.id, productCategories.categoryId))
        .where(and(eq(products.status, "ACTIVE"), eq(categories.slug, category)));
      productIds = rows.map((r) => r.id);
    } else {
      const rows = await db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.status, "ACTIVE"));
      productIds = rows.map((r) => r.id);
    }

    // Get filterable attributes with values that exist in matching products
    const attrs = await db.query.productAttributes.findMany({
      where: eq(productAttributes.isFilterable, true),
      orderBy: asc(productAttributes.sortOrder),
      with: {
        group: { columns: { name: true, slug: true } },
        values: true,
      },
    });

    // Filter attribute values to only those belonging to matching products
    const attrsFiltered = attrs.map((attr) => ({
      ...attr,
      values: attr.values.filter((v) => productIds.includes(v.productId)),
    }));

    // Build facets - only include attributes that have values in matching products
    const facets = attrsFiltered
      .filter((attr) => attr.values.length > 0)
      .map((attr) => {
        // Count unique values
        const valueCounts: Record<string, number> = {};
        attr.values.forEach((v) => {
          valueCounts[v.value] = (valueCounts[v.value] || 0) + 1;
        });

        return {
          id: attr.id,
          name: attr.name,
          slug: attr.slug,
          type: attr.type,
          group: attr.group?.name || null,
          groupSlug: attr.group?.slug || null,
          options: attr.options ? JSON.parse(attr.options) : [],
          values: Object.entries(valueCounts).map(([value, count]) => ({
            value,
            count,
          })),
        };
      });

    // Get price range for matching products
    const priceConditions = [eq(products.status, "ACTIVE")];
    if (productIds.length > 0) {
      priceConditions.push(inArray(products.id, productIds));
    }

    const [priceAgg] = await db
      .select({
        minPrice: sql<string>`min(${products.price})`,
        maxPrice: sql<string>`max(${products.price})`,
      })
      .from(products)
      .where(and(...priceConditions));

    // Collect extra filter metadata from matching products
    const matchingProducts = productIds.length > 0
      ? await db
          .select({
            vendor: products.vendor,
            productType: products.productType,
            tags: products.tags,
            quantity: products.quantity,
            trackInventory: products.trackInventory,
            compareAtPrice: products.compareAtPrice,
            price: products.price,
            isFeatured: products.isFeatured,
            averageRating: products.averageRating,
            createdAt: products.createdAt,
          })
          .from(products)
          .where(and(eq(products.status, "ACTIVE"), inArray(products.id, productIds)))
      : [];

    // Build vendor counts
    const vendorCounts: Record<string, number> = {};
    matchingProducts.forEach((p) => {
      if (p.vendor) vendorCounts[p.vendor] = (vendorCounts[p.vendor] || 0) + 1;
    });
    const vendors = Object.entries(vendorCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Build product type counts
    const typeCounts: Record<string, number> = {};
    matchingProducts.forEach((p) => {
      if (p.productType) typeCounts[p.productType] = (typeCounts[p.productType] || 0) + 1;
    });
    const productTypes = Object.entries(typeCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Build tag counts
    const tagCounts: Record<string, number> = {};
    matchingProducts.forEach((p) => {
      if (p.tags) {
        p.tags.split(",").map((t) => t.trim()).filter(Boolean).forEach((tag) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });
    const tags = Object.entries(tagCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Quick filter counts
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const quickCounts = {
      inStock: matchingProducts.filter((p) => !p.trackInventory || (p.quantity ?? 0) > 0).length,
      onSale: matchingProducts.filter((p) => p.compareAtPrice && Number(p.compareAtPrice) > Number(p.price)).length,
      featured: matchingProducts.filter((p) => p.isFeatured).length,
      newArrivals: matchingProducts.filter((p) => new Date(p.createdAt) >= thirtyDaysAgo).length,
    };

    // Rating distribution
    const ratingCounts: Record<string, number> = { "4": 0, "3": 0, "2": 0, "1": 0 };
    matchingProducts.forEach((p) => {
      const r = p.averageRating ?? 0;
      if (r >= 4) ratingCounts["4"]++;
      if (r >= 3) ratingCounts["3"]++;
      if (r >= 2) ratingCounts["2"]++;
      if (r >= 1) ratingCounts["1"]++;
    });

    // Fetch categories with children for hierarchical tree
    const allCategories = await db.query.categories.findMany({
      where: and(eq(categories.isActive, true), isNull(categories.parentId)),
      orderBy: [asc(categories.sortOrder)],
      with: {
        children: {
          where: eq(categories.isActive, true),
          orderBy: [asc(categories.sortOrder)],
        },
      },
    });
    const locale = await getLocale();
    const tCategories = await applyTranslationsBatch("category", allCategories as Record<string, unknown>[], locale) as typeof allCategories;

    return NextResponse.json({
      facets,
      priceRange: {
        min: priceAgg?.minPrice ? parseFloat(priceAgg.minPrice) : 0,
        max: priceAgg?.maxPrice ? parseFloat(priceAgg.maxPrice) : 1000,
      },
      categories: tCategories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        children: (c.children ?? []).map((ch) => ({ id: ch.id, name: ch.name, slug: ch.slug })),
      })),
      vendors,
      productTypes,
      tags,
      quickCounts,
      ratingCounts,
      totalProducts: matchingProducts.length,
    });
  } catch (error) {
    console.error("Filters GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch filters" },
      { status: 500 }
    );
  }
}
