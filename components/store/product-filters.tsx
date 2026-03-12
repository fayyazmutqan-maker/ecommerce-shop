"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  SlidersHorizontal,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface FilterFacet {
  id: string;
  name: string;
  slug: string;
  type: string;
  group: string | null;
  groupSlug: string | null;
  options: string[];
  values: { value: string; count: number }[];
}

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
}

interface ProductFiltersProps {
  facets: FilterFacet[];
  priceRange: { min: number; max: number };
  categories: CategoryItem[];
  currentCategory?: string;
  currentSearch?: string;
  activeFilters: Record<string, string[]>;
  currentMinPrice?: string;
  currentMaxPrice?: string;
}

function FilterContent({
  facets,
  priceRange,
  categories,
  currentCategory,
  currentSearch,
  activeFilters,
  currentMinPrice,
  currentMaxPrice,
  onFilterChange,
}: ProductFiltersProps & {
  onFilterChange: (key: string, value: string, action: "add" | "remove") => void;
}) {
  const [expandedFacets, setExpandedFacets] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      facets.forEach((f) => (initial[f.slug] = true));
      return initial;
    }
  );
  const [minPrice, setMinPrice] = useState(currentMinPrice || "");
  const [maxPrice, setMaxPrice] = useState(currentMaxPrice || "");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const toggleFacet = (slug: string) => {
    setExpandedFacets((prev) => ({ ...prev, [slug]: !prev[slug] }));
  };

  const applyPriceFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (minPrice) params.set("minPrice", minPrice);
    else params.delete("minPrice");
    if (maxPrice) params.set("maxPrice", maxPrice);
    else params.delete("maxPrice");
    router.push(`${pathname}?${params.toString()}`);
  };

  const totalActiveFilters = Object.values(activeFilters).reduce(
    (sum, arr) => sum + arr.length,
    0
  ) + (currentMinPrice || currentMaxPrice ? 1 : 0);

  const clearAllFilters = () => {
    const params = new URLSearchParams();
    if (currentCategory) params.set("category", currentCategory);
    if (currentSearch) params.set("search", currentSearch);
    router.push(`${pathname}?${params.toString()}`);
    setMinPrice("");
    setMaxPrice("");
  };

  return (
    <div className="space-y-6">
      {/* Active Filters */}
      {totalActiveFilters > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Active Filters
            </p>
            <button
              onClick={clearAllFilters}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(activeFilters).map(([slug, values]) =>
              values.map((v) => (
                <Badge
                  key={`${slug}-${v}`}
                  variant="secondary"
                  className="text-xs gap-1 cursor-pointer hover:bg-destructive/10"
                  onClick={() => onFilterChange(`attr_${slug}`, v, "remove")}
                >
                  {v}
                  <X className="h-3 w-3" />
                </Badge>
              ))
            )}
            {(currentMinPrice || currentMaxPrice) && (
              <Badge
                variant="secondary"
                className="text-xs gap-1 cursor-pointer hover:bg-destructive/10"
                onClick={() => {
                  const params = new URLSearchParams(searchParams.toString());
                  params.delete("minPrice");
                  params.delete("maxPrice");
                  router.push(`${pathname}?${params.toString()}`);
                  setMinPrice("");
                  setMaxPrice("");
                }}
              >
                SAR {currentMinPrice || "0"} - SAR {currentMaxPrice || "∞"}
                <X className="h-3 w-3" />
              </Badge>
            )}
          </div>
          <Separator />
        </div>
      )}

      {/* Search */}
      <div>
        <form>
          {/* Preserve current params */}
          {currentCategory && (
            <input type="hidden" name="category" value={currentCategory} />
          )}
          {Object.entries(activeFilters).map(([slug, values]) => (
            <input
              key={slug}
              type="hidden"
              name={`attr_${slug}`}
              value={values.join(",")}
            />
          ))}
          <Input
            type="search"
            name="search"
            placeholder="Search products..."
            defaultValue={currentSearch}
            className="h-10"
          />
        </form>
      </div>

      {/* Categories */}
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Categories
        </p>
        <Link
          href="/products"
          className={`flex items-center text-sm py-2 px-3 rounded-lg transition-colors ${!currentCategory ? "bg-accent font-semibold text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"}`}
        >
          All Products
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/collections/${cat.slug}`}
            className={`flex items-center text-sm py-2 px-3 rounded-lg transition-colors ${currentCategory === cat.slug ? "bg-accent font-semibold text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"}`}
          >
            {cat.name}
          </Link>
        ))}
      </div>

      {/* Price Range */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Price Range
        </p>
        <div className="flex gap-2 items-center">
          <Input
            type="number"
            placeholder={`${priceRange.min}`}
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="h-9 text-sm"
            min="0"
          />
          <span className="text-muted-foreground text-xs">to</span>
          <Input
            type="number"
            placeholder={`${priceRange.max}`}
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="h-9 text-sm"
            min="0"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs"
          onClick={applyPriceFilter}
        >
          Apply Price
        </Button>
      </div>

      {/* Dynamic Facets */}
      {facets.map((facet) => (
        <div key={facet.id} className="space-y-2">
          <button
            onClick={() => toggleFacet(facet.slug)}
            className="flex items-center justify-between w-full"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {facet.name}
            </p>
            {expandedFacets[facet.slug] ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
          {expandedFacets[facet.slug] && (
            <div className="space-y-0.5">
              {facet.type === "color" ? (
                <div className="flex flex-wrap gap-2 py-1">
                  {facet.values.map((v) => {
                    // Find hex from options "Name:#HEX"
                    const optMatch = facet.options.find(
                      (o) => o.startsWith(v.value + ":")
                    );
                    const hex = optMatch
                      ? optMatch.split(":")[1]
                      : "#888";
                    const isActive = (
                      activeFilters[facet.slug] || []
                    ).includes(v.value);
                    return (
                      <button
                        key={v.value}
                        onClick={() =>
                          onFilterChange(
                            `attr_${facet.slug}`,
                            v.value,
                            isActive ? "remove" : "add"
                          )
                        }
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all border ${
                          isActive
                            ? "border-foreground ring-1 ring-foreground font-medium"
                            : "border-border hover:border-foreground/30"
                        }`}
                        title={`${v.value} (${v.count})`}
                      >
                        <span
                          className="h-3.5 w-3.5 rounded-full border border-border/50"
                          style={{ backgroundColor: hex }}
                        />
                        <span className="hidden sm:inline lg:inline">
                          {v.value}
                        </span>
                        <span className="text-muted-foreground text-[10px]">
                          {v.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                facet.values.map((v) => {
                  const isActive = (
                    activeFilters[facet.slug] || []
                  ).includes(v.value);
                  return (
                    <button
                      key={v.value}
                      onClick={() =>
                        onFilterChange(
                          `attr_${facet.slug}`,
                          v.value,
                          isActive ? "remove" : "add"
                        )
                      }
                      className={`flex items-center justify-between w-full text-sm py-1.5 px-3 rounded-lg transition-colors ${
                        isActive
                          ? "bg-foreground text-background font-medium"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                      }`}
                    >
                      <span>{v.value}</span>
                      <span
                        className={`text-xs ${isActive ? "text-background/70" : "text-muted-foreground/50"}`}
                      >
                        {v.count}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function ProductFilters(props: ProductFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const handleFilterChange = useCallback(
    (key: string, value: string, action: "add" | "remove") => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        const current = params.get(key)?.split(",").filter(Boolean) || [];

        if (action === "add") {
          if (!current.includes(value)) {
            current.push(value);
          }
        } else {
          const idx = current.indexOf(value);
          if (idx > -1) current.splice(idx, 1);
        }

        if (current.length > 0) {
          params.set(key, current.join(","));
        } else {
          params.delete(key);
        }

        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams, startTransition]
  );

  const totalActive =
    Object.values(props.activeFilters).reduce(
      (sum, arr) => sum + arr.length,
      0
    ) + (props.currentMinPrice || props.currentMaxPrice ? 1 : 0);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-60 flex-shrink-0">
        <div className="sticky top-24 space-y-1">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" /> Filters
            {totalActive > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5 min-w-5">
                {totalActive}
              </Badge>
            )}
          </h3>
          <FilterContent {...props} onFilterChange={handleFilterChange} />
        </div>
      </aside>

      {/* Mobile Filter Sheet */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 h-10">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {totalActive > 0 && (
                <Badge
                  variant="secondary"
                  className="text-[10px] h-5 min-w-5"
                >
                  {totalActive}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[min(320px,85vw)] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" /> Filters
              </SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FilterContent {...props} onFilterChange={handleFilterChange} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
