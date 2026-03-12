import type { Metadata } from "next";
import { db } from "@/lib/db";
import { products as productsTable, categories as categoriesTable, productImages, productCategories, productAttributes, productAttributeValues } from "@/lib/schema";
import { eq, desc, asc, and, or, count, sql, ilike, inArray, gte, lte } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { getLocale } from "next-intl/server";
import { applyTranslationsBatch } from "@/lib/translations";
import { ProductCardGrid } from "@/components/store/product-card-grid";
import { Button } from "@/components/ui/button";
import { SortSelect } from "@/components/store/sort-select";
import Link from "next/link";
import { Breadcrumbs } from "@/components/store/breadcrumbs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Products | ShopFlow",
  description:
    "Browse our collection of premium products. Free shipping on orders over SAR 200.",
  openGraph: {
    title: "Products | ShopFlow",
    description:
      "Browse our collection of premium products. Free shipping on orders over SAR 200.",
    type: "website",
  },
};

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : "";
  const sort = typeof params.sort === "string" ? params.sort : "newest";
  const category =
    typeof params.category === "string" ? params.category : undefined;
  const featured = params.featured === "true";
  const onSale = params.onSale === "true";
  const page = Math.max(1, parseInt(typeof params.page === "string" ? params.page : "1") || 1);
  const limit = 24;
  const minPrice = typeof params.minPrice === "string" ? params.minPrice : undefined;
  const maxPrice = typeof params.maxPrice === "string" ? params.maxPrice : undefined;

  // Extract attribute filters (attr_slug=value1,value2)
  const attrFilters: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(params)) {
    if (key.startsWith("attr_") && typeof value === "string" && value) {
      const slug = key.replace("attr_", "");
      attrFilters[slug] = value.split(",").filter(Boolean);
    }
  }

  // Build orderBy
  const orderByClause =
    sort === "price-asc"
      ? [asc(productsTable.price)]
      : sort === "price-desc"
        ? [desc(productsTable.price)]
        : sort === "name"
          ? [asc(productsTable.name)]
          : [desc(productsTable.createdAt)];

  // Build where conditions
  const conditions: SQL[] = [eq(productsTable.status, "ACTIVE")];

  if (search) {
    conditions.push(
      or(
        ilike(productsTable.name, `%${search}%`),
        ilike(productsTable.description, `%${search}%`),
        ilike(productsTable.tags, `%${search}%`),
      )!
    );
  }

  if (featured) {
    conditions.push(eq(productsTable.isFeatured, true));
  }

  if (onSale) {
    conditions.push(sql`${productsTable.compareAtPrice} IS NOT NULL AND ${productsTable.compareAtPrice} > ${productsTable.price}`);
  }

  // Category filter
  if (category) {
    const catRecord = await db.query.categories.findFirst({
      where: eq(categoriesTable.slug, category),
      columns: { id: true },
    });
    if (catRecord) {
      const catProductIds = await db
        .select({ id: productCategories.productId })
        .from(productCategories)
        .where(eq(productCategories.categoryId, catRecord.id));
      if (catProductIds.length > 0) {
        conditions.push(inArray(productsTable.id, catProductIds.map((r) => r.id)));
      } else {
        conditions.push(sql`false`);
      }
    } else {
      conditions.push(sql`false`);
    }
  }

  // Price range
  if (minPrice) {
    conditions.push(gte(productsTable.price, minPrice));
  }
  if (maxPrice) {
    conditions.push(lte(productsTable.price, maxPrice));
  }

  // Apply attribute filters using AND logic
  if (Object.keys(attrFilters).length > 0) {
    const attrConditions = await Promise.all(
      Object.entries(attrFilters).map(async ([slug, values]) => {
        if (values.length === 0) return null;
        const attr = await db.query.productAttributes.findFirst({
          where: eq(productAttributes.slug, slug),
          columns: { id: true },
        });
        if (!attr) return null;
        const matching = await db
          .select({ id: productAttributeValues.productId })
          .from(productAttributeValues)
          .where(
            and(
              eq(productAttributeValues.attributeId, attr.id),
              inArray(productAttributeValues.value, values),
            ),
          );
        if (matching.length === 0) return sql`false`;
        return inArray(productsTable.id, matching.map((r) => r.id));
      }),
    );
    const validConditions = attrConditions.filter((c): c is SQL => c !== null);
    conditions.push(...validConditions);
  }

  const whereCondition = and(...conditions);

  // Fetch products and count in parallel
  const [products, totalResult] = await Promise.all([
    db.query.products.findMany({
      where: whereCondition,
      with: {
        images: { orderBy: [asc(productImages.position)] },
        categories: { with: { category: true } },
      },
      orderBy: orderByClause,
      limit,
      offset: (page - 1) * limit,
    }),
    db.select({ value: count() }).from(productsTable).where(whereCondition),
  ]);

  const total = Number(totalResult[0].value);

  // Apply locale translations
  const locale = await getLocale();
  const tProducts = await applyTranslationsBatch("product", products as Record<string, unknown>[], locale) as typeof products;

  return (
    <>
      <Breadcrumbs items={[{ label: "Products" }]} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {featured ? "Featured Products" : "All Products"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {total} product{total !== 1 ? "s" : ""} found
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SortSelect defaultValue={sort} />
        </div>
      </div>

      {tProducts.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-muted-foreground text-base">
            No products found.
          </p>
          <Button asChild variant="outline" className="mt-6 h-11 px-6">
            <Link href="/products">Clear Filters</Link>
          </Button>
        </div>
      ) : (
        <>
          <ProductCardGrid
            products={tProducts.map((p) => ({
              id: p.id,
              name: p.name,
              slug: p.slug,
              price: Number(p.price),
              compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
              images: p.images.map((i) => i.url),
              category: p.categories[0]?.category?.name || null,
              isNew:
                new Date().getTime() - new Date(p.createdAt).getTime() <
                7 * 24 * 60 * 60 * 1000,
            }))}
          />

          {/* Pagination */}
          {(() => {
            const totalPages = Math.ceil(total / limit);
            if (totalPages <= 1) return null;
            const buildPageUrl = (p: number) => {
              const sp = new URLSearchParams();
              if (search) sp.set("search", search);
              if (sort !== "newest") sp.set("sort", sort);
              if (category) sp.set("category", category);
              if (featured) sp.set("featured", "true");
              if (onSale) sp.set("onSale", "true");
              if (minPrice) sp.set("minPrice", minPrice);
              if (maxPrice) sp.set("maxPrice", maxPrice);
              Object.entries(attrFilters).forEach(([k, v]) => {
                if (v.length) sp.set(`attr_${k}`, v.join(","));
              });
              if (p > 1) sp.set("page", String(p));
              const qs = sp.toString();
              return `/products${qs ? `?${qs}` : ""}`;
            };
            const pages: (number | "...")[] = [];
            for (let i = 1; i <= totalPages; i++) {
              if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
                pages.push(i);
              } else if (pages[pages.length - 1] !== "...") {
                pages.push("...");
              }
            }
            return (
              <nav className="flex items-center justify-center gap-1 mt-12" aria-label="Pagination">
                {page > 1 && (
                  <Button variant="outline" size="sm" className="h-9 px-3" asChild>
                    <Link href={buildPageUrl(page - 1)}>Previous</Link>
                  </Button>
                )}
                {pages.map((p, i) =>
                  p === "..." ? (
                    <span key={`dot-${i}`} className="px-2 text-muted-foreground">…</span>
                  ) : (
                    <Button
                      key={p}
                      variant={p === page ? "default" : "outline"}
                      size="sm"
                      className="h-9 w-9"
                      asChild={p !== page}
                    >
                      {p === page ? <span>{p}</span> : <Link href={buildPageUrl(p)}>{p}</Link>}
                    </Button>
                  )
                )}
                {page < totalPages && (
                  <Button variant="outline" size="sm" className="h-9 px-3" asChild>
                    <Link href={buildPageUrl(page + 1)}>Next</Link>
                  </Button>
                )}
              </nav>
            );
          })()}
        </>
      )}
    </>
  );
}
