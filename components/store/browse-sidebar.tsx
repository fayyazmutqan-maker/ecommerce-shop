"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition, Suspense } from "react";
import { ProductFilters } from "./product-filters";
import { Skeleton } from "@/components/ui/skeleton";

interface FilterData {
  facets: {
    id: string;
    name: string;
    slug: string;
    type: string;
    group: string | null;
    groupSlug: string | null;
    options: string[];
    values: { value: string; count: number }[];
  }[];
  priceRange: { min: number; max: number };
  categories: { id: string; name: string; slug: string }[];
}

function BrowseSidebarInner({
  initialCategories,
}: {
  initialCategories: { id: string; name: string; slug: string }[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filterData, setFilterData] = useState<FilterData | null>(null);
  const [isPending, startTransition] = useTransition();

  // Derive current category from URL
  const currentCategory = pathname.startsWith("/collections/")
    ? pathname.split("/collections/")[1]?.split("/")[0] || undefined
    : typeof searchParams.get("category") === "string"
      ? searchParams.get("category")!
      : undefined;

  // Derive active attribute filters from URL
  const activeFilters: Record<string, string[]> = {};
  searchParams.forEach((value, key) => {
    if (key.startsWith("attr_") && value) {
      activeFilters[key.replace("attr_", "")] = value.split(",").filter(Boolean);
    }
  });

  const currentSearch = searchParams.get("search") || undefined;
  const currentMinPrice = searchParams.get("minPrice") || undefined;
  const currentMaxPrice = searchParams.get("maxPrice") || undefined;

  // Fetch filter data when category changes
  useEffect(() => {
    const controller = new AbortController();
    const categoryParam = currentCategory ? `?category=${encodeURIComponent(currentCategory)}` : "";

    startTransition(() => {
      fetch(`/api/filters${categoryParam}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data: FilterData) => {
          setFilterData(data);
        })
        .catch((err) => {
          if (err.name !== "AbortError") console.error("Failed to fetch filters:", err);
        });
    });

    return () => controller.abort();
  }, [currentCategory]);

  const categories = filterData?.categories ?? initialCategories;
  const facets = filterData?.facets ?? [];
  const priceRange = filterData?.priceRange ?? { min: 0, max: 1000 };

  return (
    <ProductFilters
      facets={facets}
      priceRange={priceRange}
      categories={categories}
      currentCategory={currentCategory}
      currentSearch={currentSearch}
      activeFilters={activeFilters}
      currentMinPrice={currentMinPrice}
      currentMaxPrice={currentMaxPrice}
    />
  );
}

function SidebarSkeleton() {
  return (
    <aside className="hidden lg:block w-60 shrink-0">
      <div className="sticky top-24 space-y-6">
        <Skeleton className="h-5 w-20" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-5 w-24" />
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 flex-1" />
        </div>
      </div>
    </aside>
  );
}

export function BrowseSidebar({
  initialCategories,
}: {
  initialCategories: { id: string; name: string; slug: string }[];
}) {
  return (
    <Suspense fallback={<SidebarSkeleton />}>
      <BrowseSidebarInner initialCategories={initialCategories} />
    </Suspense>
  );
}
