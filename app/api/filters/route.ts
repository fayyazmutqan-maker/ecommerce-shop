import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, productAttributes, productAttributeValues, productCategories, categories } from "@/lib/schema";
import { eq, and, sql, asc, inArray } from "drizzle-orm";

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

    return NextResponse.json({
      facets,
      priceRange: {
        min: priceAgg?.minPrice ? parseFloat(priceAgg.minPrice) : 0,
        max: priceAgg?.maxPrice ? parseFloat(priceAgg.maxPrice) : 1000,
      },
    });
  } catch (error) {
    console.error("Filters GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch filters" },
      { status: 500 }
    );
  }
}
