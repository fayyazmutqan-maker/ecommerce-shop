import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import {
  categories,
  products,
  productCategories,
  productAttributes,
  productAttributeValues,
  productImages,
} from "@/lib/schema";
import {
  eq,
  and,
  or,
  asc,
  desc,
  ilike,
  inArray,
  gte,
  lte,
  count,
  min,
  max,
  isNull,
} from "drizzle-orm";
import { ProductCardGrid } from "@/components/store/product-card-grid";
import { ProductFilters } from "@/components/store/product-filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SortSelect } from "@/components/store/sort-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;

  const search = typeof sp.search === "string" ? sp.search : "";
  const sort = typeof sp.sort === "string" ? sp.sort : "newest";
  const page = Math.max(1, parseInt(typeof sp.page === "string" ? sp.page : "1") || 1);
  const limit = 24;
  const minPrice = typeof sp.minPrice === "string" ? sp.minPrice : undefined;
  const maxPrice = typeof sp.maxPrice === "string" ? sp.maxPrice : undefined;

  // Extract attribute filters (attr_slug=value1,value2)
  const attrFilters: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(sp)) {
    if (key.startsWith("attr_") && typeof value === "string" && value) {
      const attrSlug = key.replace("attr_", "");
      attrFilters[attrSlug] = value.split(",").filter(Boolean);
    }
  }

  const category = await db.query.categories.findFirst({
    where: eq(categories.slug, slug),
    with: {
      children: {
        where: eq(categories.isActive, true),
        orderBy: [asc(categories.sortOrder)],
      },
    },
  });

  if (!category || !category.isActive) {
    notFound();
  }

  // Get product IDs in this category (subquery for relation filter)
  const catProductRows = await db
    .select({ id: productCategories.productId })
    .from(productCategories)
    .where(eq(productCategories.categoryId, category.id));
  let matchingIds = catProductRows.map((r) => r.id);

  // Attribute filtering (AND logic — sequential narrowing)
  if (Object.keys(attrFilters).length > 0 && matchingIds.length > 0) {
    for (const [attrSlug, values] of Object.entries(attrFilters)) {
      const attr = await db.query.productAttributes.findFirst({
        where: eq(productAttributes.slug, attrSlug),
        columns: { id: true },
      });
      if (!attr) continue;
      const matching = await db
        .select({ id: productAttributeValues.productId })
        .from(productAttributeValues)
        .where(
          and(
            eq(productAttributeValues.attributeId, attr.id),
            inArray(productAttributeValues.value, values),
            inArray(productAttributeValues.productId, matchingIds)
          )
        );
      matchingIds = matching.map((r) => r.id);
      if (matchingIds.length === 0) break;
    }
  }

  const noProducts = matchingIds.length === 0;

  // Build WHERE conditions (and() filters out undefined values)
  const whereCondition = and(
    eq(products.status, "ACTIVE"),
    noProducts ? undefined : inArray(products.id, matchingIds),
    search
      ? or(
          ilike(products.name, `%${search}%`),
          ilike(products.description, `%${search}%`),
          ilike(products.tags, `%${search}%`)
        )
      : undefined,
    minPrice ? gte(products.price, minPrice) : undefined,
    maxPrice ? lte(products.price, maxPrice) : undefined
  );

  // Order by
  const orderByClause =
    sort === "price-asc"
      ? [asc(products.price)]
      : sort === "price-desc"
        ? [desc(products.price)]
        : sort === "name"
          ? [asc(products.name)]
          : [desc(products.createdAt)];

  // Fetch all sibling categories for the sidebar
  const allCategories = await db.query.categories.findMany({
    where: and(eq(categories.isActive, true), isNull(categories.parentId)),
    orderBy: [asc(categories.sortOrder)],
  });

  // Fetch products, count, and filter facets in parallel
  const [productsList, total, filtersData] = await Promise.all([
    noProducts
      ? []
      : db.query.products.findMany({
          where: whereCondition,
          with: {
            images: { orderBy: [asc(productImages.position)] },
            categories: { with: { category: true } },
          },
          orderBy: orderByClause,
          limit,
          offset: (page - 1) * limit,
        }),
    noProducts
      ? 0
      : db
          .select({ value: count() })
          .from(products)
          .where(whereCondition)
          .then((r) => r[0].value),
    // Fetch filter facets scoped to this category
    (async () => {
      if (catProductRows.length === 0) {
        return { facets: [], priceRange: { min: 0, max: 1000 } };
      }

      const catIds = catProductRows.map((r) => r.id);

      // Get ACTIVE product IDs in this category (for facets)
      const activeRows = await db
        .select({ id: products.id })
        .from(products)
        .where(
          and(eq(products.status, "ACTIVE"), inArray(products.id, catIds))
        );
      const activeProductIds = activeRows.map((r) => r.id);

      if (activeProductIds.length === 0) {
        return { facets: [], priceRange: { min: 0, max: 1000 } };
      }

      const attributes = await db.query.productAttributes.findMany({
        where: eq(productAttributes.isFilterable, true),
        orderBy: [asc(productAttributes.sortOrder)],
        with: {
          group: { columns: { name: true, slug: true } },
          values: {
            where: inArray(
              productAttributeValues.productId,
              activeProductIds
            ),
            columns: { value: true },
          },
        },
      });

      const facets = attributes
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

      const [priceAgg] = await db
        .select({
          minPrice: min(products.price),
          maxPrice: max(products.price),
        })
        .from(products)
        .where(
          and(
            eq(products.status, "ACTIVE"),
            inArray(products.id, activeProductIds)
          )
        );

      return {
        facets,
        priceRange: {
          min: Number(priceAgg.minPrice) || 0,
          max: Number(priceAgg.maxPrice) || 1000,
        },
      };
    })(),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <Link href="/" className="hover:text-foreground transition-colors">
          Home
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <Link
          href="/collections"
          className="hover:text-foreground transition-colors"
        >
          Collections
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-foreground font-medium">{category.name}</span>
      </nav>

      {/* Header */}
      <div className="mb-10">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">
          Collection
        </p>
        <h1 className="text-3xl lg:text-4xl font-bold">{category.name}</h1>
        {category.description && (
          <p className="text-muted-foreground mt-3 max-w-2xl text-[15px] leading-relaxed">
            {category.description}
          </p>
        )}
      </div>

      {/* Subcategories */}
      {category.children.length > 0 && (
        <div className="flex flex-wrap gap-2.5 mb-10">
          {category.children.map((child) => (
            <Link key={child.id} href={`/collections/${child.slug}`}>
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-accent px-4 py-2 text-sm font-medium transition-colors"
              >
                {child.name}
              </Badge>
            </Link>
          ))}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-10 lg:gap-12">
        {/* Filters */}
        <ProductFilters
          facets={filtersData.facets}
          priceRange={filtersData.priceRange}
          categories={allCategories.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
          }))}
          currentCategory={slug}
          currentSearch={search}
          activeFilters={attrFilters}
          currentMinPrice={minPrice}
          currentMaxPrice={maxPrice}
        />

        {/* Products */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <p className="text-sm text-muted-foreground">
              {total} product{total !== 1 ? "s" : ""} found
            </p>
            <div className="flex items-center gap-3">
              <SortSelect defaultValue={sort} />
            </div>
          </div>

          {productsList.length > 0 ? (
            <>
              <ProductCardGrid
                products={productsList.map((p) => ({
                  id: p.id,
                  name: p.name,
                  slug: p.slug,
                  price: Number(p.price),
                  compareAtPrice: p.compareAtPrice
                    ? Number(p.compareAtPrice)
                    : null,
                  images: p.images.map((i) => i.url),
                  category: category.name,
                  isNew:
                    new Date().getTime() - new Date(p.createdAt).getTime() <
                    7 * 24 * 60 * 60 * 1000,
                }))}
              />

              {/* Pagination */}
              {(() => {
                const totalPages = Math.ceil(Number(total) / limit);
                if (totalPages <= 1) return null;
                const buildPageUrl = (p: number) => {
                  const params = new URLSearchParams();
                  if (search) params.set("search", search);
                  if (sort !== "newest") params.set("sort", sort);
                  if (minPrice) params.set("minPrice", minPrice);
                  if (maxPrice) params.set("maxPrice", maxPrice);
                  Object.entries(attrFilters).forEach(([k, v]) => {
                    if (v.length) params.set(`attr_${k}`, v.join(","));
                  });
                  if (p > 1) params.set("page", String(p));
                  const qs = params.toString();
                  return `/collections/${slug}${qs ? `?${qs}` : ""}`;
                };
                const pgs: (number | "...")[] = [];
                for (let i = 1; i <= totalPages; i++) {
                  if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
                    pgs.push(i);
                  } else if (pgs[pgs.length - 1] !== "...") {
                    pgs.push("...");
                  }
                }
                return (
                  <nav className="flex items-center justify-center gap-1 mt-12" aria-label="Pagination">
                    {page > 1 && (
                      <Button variant="outline" size="sm" className="h-9 px-3" asChild>
                        <Link href={buildPageUrl(page - 1)}>Previous</Link>
                      </Button>
                    )}
                    {pgs.map((p, i) =>
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
          ) : (
            <div className="text-center py-28">
              <p className="text-muted-foreground font-medium">
                No products found matching your filters.
              </p>
              <Button
                asChild
                variant="outline"
                className="mt-6 h-11 px-6"
              >
                <Link href={`/collections/${slug}`}>Clear Filters</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
