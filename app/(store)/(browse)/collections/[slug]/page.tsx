import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
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
  gt,
  count,
  sql,
} from "drizzle-orm";
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { applyTranslations, applyTranslationsBatch } from "@/lib/translations";
import { ProductCardGrid } from "@/components/store/product-card-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SortSelect } from "@/components/store/sort-select";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await db.query.categories.findFirst({
    where: eq(categories.slug, slug),
  });

  if (!category) {
    return { title: "Collection Not Found" };
  }

  const title = category.name;
  const description = category.description || `Browse ${category.name} collection`;

  return {
    title,
    description,
    alternates: {
      canonical: `/collections/${slug}`,
    },
    openGraph: {
      title,
      description,
      type: "website",
      images: category.image ? [{ url: category.image }] : undefined,
    },
  };
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
  const featured = sp.featured === "true";
  const onSale = sp.onSale === "true";
  const inStock = sp.inStock === "true";
  const newArrivals = sp.newArrivals === "true";
  const minRating = typeof sp.minRating === "string" ? parseInt(sp.minRating) || undefined : undefined;
  const vendorFilter = typeof sp.vendor === "string" ? sp.vendor.split(",").filter(Boolean) : [];
  const productTypeFilter = typeof sp.productType === "string" ? sp.productType.split(",").filter(Boolean) : [];
  const tagFilter = typeof sp.tags === "string" ? sp.tags.split(",").filter(Boolean) : [];

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

  // Build WHERE conditions
  const conditions = [
    eq(products.status, "ACTIVE"),
    noProducts ? sql`false` : inArray(products.id, matchingIds),
  ];

  if (search) {
    conditions.push(
      or(
        ilike(products.name, `%${search}%`),
        ilike(products.description, `%${search}%`),
        ilike(products.tags, `%${search}%`)
      )!
    );
  }

  if (minPrice) conditions.push(gte(products.price, minPrice));
  if (maxPrice) conditions.push(lte(products.price, maxPrice));

  if (featured) conditions.push(eq(products.isFeatured, true));

  if (onSale) {
    conditions.push(sql`${products.compareAtPrice} IS NOT NULL AND ${products.compareAtPrice} > ${products.price}`);
  }

  if (inStock) {
    conditions.push(
      or(
        gt(products.quantity, 0),
        eq(products.trackInventory, false),
      )!
    );
  }

  if (newArrivals) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    conditions.push(gte(products.createdAt, thirtyDaysAgo));
  }

  if (minRating) {
    conditions.push(gte(products.averageRating, minRating));
  }

  if (vendorFilter.length > 0) {
    conditions.push(inArray(products.vendor, vendorFilter));
  }

  if (productTypeFilter.length > 0) {
    conditions.push(inArray(products.productType, productTypeFilter));
  }

  if (tagFilter.length > 0) {
    const tagConditions = tagFilter.map((t) => ilike(products.tags, `%${t}%`));
    conditions.push(or(...tagConditions)!);
  }

  const whereCondition = and(...conditions);

  // Order by
  const orderByClause =
    sort === "price-asc"
      ? [asc(products.price)]
      : sort === "price-desc"
        ? [desc(products.price)]
        : sort === "name"
          ? [asc(products.name)]
          : [desc(products.createdAt)];

  // Fetch products and count in parallel
  const [productsList, total] = await Promise.all([
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
  ]);

  // Apply locale translations
  const locale = await getLocale();
  const tCategory = await applyTranslations("category", category as Record<string, unknown>, locale) as typeof category;
  const tProductsList = await applyTranslationsBatch("product", productsList as Record<string, unknown>[], locale) as typeof productsList;

  return (
    <>
      <Breadcrumbs items={[
        { label: "Collections", href: "/collections" },
        { label: tCategory.name },
      ]} />

      {/* Header */}
      <div className="mb-10">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">
          Collection
        </p>
        <h1 className="text-3xl lg:text-4xl font-bold">{tCategory.name}</h1>
        {tCategory.description && (
          <p className="text-muted-foreground mt-3 max-w-2xl text-[15px] leading-relaxed">
            {tCategory.description}
          </p>
        )}
      </div>

      {/* Subcategories */}
      {tCategory.children.length > 0 && (
        <div className="flex flex-wrap gap-2.5 mb-10">
          {tCategory.children.map((child) => (
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

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <p className="text-sm text-muted-foreground">
          {total} product{total !== 1 ? "s" : ""} found
        </p>
        <div className="flex items-center gap-3">
          <SortSelect defaultValue={sort} />
        </div>
      </div>

      {tProductsList.length > 0 ? (
        <>
          <ProductCardGrid
            products={tProductsList.map((p) => ({
              id: p.id,
              name: p.name,
              slug: p.slug,
              price: Number(p.price),
              compareAtPrice: p.compareAtPrice
                ? Number(p.compareAtPrice)
                : null,
              images: p.images.map((i) => i.url),
              category: tCategory.name,
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
              if (featured) params.set("featured", "true");
              if (onSale) params.set("onSale", "true");
              if (inStock) params.set("inStock", "true");
              if (newArrivals) params.set("newArrivals", "true");
              if (minRating) params.set("minRating", String(minRating));
              if (vendorFilter.length) params.set("vendor", vendorFilter.join(","));
              if (productTypeFilter.length) params.set("productType", productTypeFilter.join(","));
              if (tagFilter.length) params.set("tags", tagFilter.join(","));
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
    </>
  );
}
