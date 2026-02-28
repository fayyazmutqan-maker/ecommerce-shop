import type { Metadata } from "next";
import { db } from "@/lib/db";
import { products as productsTable, categories as categoriesTable, productImages, productCategories, productAttributes, productAttributeValues } from "@/lib/schema";
import { eq, desc, asc, and, or, count, sql, ilike, inArray, gte, lte, isNull } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { ProductCardGrid } from "@/components/store/product-card-grid";
import { ProductFilters } from "@/components/store/product-filters";
import { Button } from "@/components/ui/button";
import { SortSelect } from "@/components/store/sort-select";
import Link from "next/link";

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
  let categoryId: string | undefined;
  if (category) {
    const catRecord = await db.query.categories.findFirst({
      where: eq(categoriesTable.slug, category),
      columns: { id: true },
    });
    if (catRecord) {
      categoryId = catRecord.id;
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

  // Fetch products, categories, count, and filter facets in parallel
  const [products, categories, totalResult, filtersRes] = await Promise.all([
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
    db.query.categories.findMany({
      where: and(eq(categoriesTable.isActive, true), isNull(categoriesTable.parentId)),
      orderBy: [asc(categoriesTable.sortOrder)],
    }),
    db.select({ value: count() }).from(productsTable).where(whereCondition),
    // Fetch filter facets
    (async () => {
      const facetConditions: SQL[] = [eq(productsTable.status, "ACTIVE")];
      if (categoryId) {
        const catProductIds = await db
          .select({ id: productCategories.productId })
          .from(productCategories)
          .where(eq(productCategories.categoryId, categoryId));
        if (catProductIds.length > 0) {
          facetConditions.push(inArray(productsTable.id, catProductIds.map((r) => r.id)));
        } else {
          facetConditions.push(sql`false`);
        }
      }
      const facetWhere = and(...facetConditions);

      const matchingProducts = await db
        .select({ id: productsTable.id })
        .from(productsTable)
        .where(facetWhere);
      const productIds = matchingProducts.map((p) => p.id);

      let facets: {
        id: string;
        name: string;
        slug: string;
        type: string;
        group: string | null;
        groupSlug: string | null;
        options: string[];
        values: { value: string; count: number }[];
      }[] = [];

      if (productIds.length > 0) {
        const attributes = await db.query.productAttributes.findMany({
          where: eq(productAttributes.isFilterable, true),
          orderBy: [asc(productAttributes.sortOrder)],
          with: {
            group: { columns: { name: true, slug: true } },
            values: {
              where: inArray(productAttributeValues.productId, productIds),
              columns: { value: true },
            },
          },
        });

        facets = attributes
          .filter((attr) => attr.values.length > 0)
          .map((attr) => {
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
              values: Object.entries(valueCounts).map(([value, cnt]) => ({
                value,
                count: cnt,
              })),
            };
          });
      }

      const priceAgg = await db
        .select({
          minPrice: sql<string>`coalesce(min(${productsTable.price}), '0')`,
          maxPrice: sql<string>`coalesce(max(${productsTable.price}), '1000')`,
        })
        .from(productsTable)
        .where(facetWhere);

      return {
        facets,
        priceRange: {
          min: Number(priceAgg[0].minPrice),
          max: Number(priceAgg[0].maxPrice),
        },
      };
    })(),
  ]);

  const total = Number(totalResult[0].value);

  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-10 lg:py-14">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <Link href="/" className="hover:text-foreground transition-colors">
          Home
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-foreground font-medium">Products</span>
      </nav>

      <div className="flex flex-col lg:flex-row gap-10 lg:gap-12">
        {/* Filter Sidebar (desktop) + Mobile Sheet */}
        <ProductFilters
          facets={filtersRes.facets}
          priceRange={filtersRes.priceRange}
          categories={categories.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
          }))}
          currentCategory={category}
          currentSearch={search}
          activeFilters={attrFilters}
          currentMinPrice={minPrice}
          currentMaxPrice={maxPrice}
        />

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {category
                  ? categories.find((c) => c.slug === category)?.name ||
                    "Products"
                  : featured
                    ? "Featured Products"
                    : "All Products"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                {total} product{total !== 1 ? "s" : ""} found
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Mobile filter trigger is inside ProductFilters */}
              <SortSelect defaultValue={sort} />
            </div>
          </div>

          {products.length === 0 ? (
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
                products={products.map((p) => ({
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
        </div>
      </div>
    </div>
  );
}
