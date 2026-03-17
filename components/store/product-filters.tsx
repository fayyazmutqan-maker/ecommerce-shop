"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  Star,
  Sparkles,
  Tag,
  Package,
  Flame,
  RotateCcw,
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
  children?: CategoryItem[];
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
  vendors?: { name: string; count: number }[];
  productTypes?: { name: string; count: number }[];
  tags?: { name: string; count: number }[];
  quickCounts?: { inStock: number; onSale: number; featured: number; newArrivals: number };
  ratingCounts?: Record<string, number>;
  totalProducts?: number;
}

// ─── Quick Filter Toggles ────────────────────────────────────

function QuickToggle({
  label,
  icon,
  count,
  checked,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  count?: number;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 w-full text-sm py-2 px-3 rounded-lg transition-colors ${
        checked
          ? "bg-foreground text-background font-medium"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      }`}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {count !== undefined && count > 0 && (
        <span className={`text-xs ${checked ? "text-background/70" : "text-muted-foreground/50"}`}>
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Collapsible Section ─────────────────────────────────────

function FilterSection({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <button onClick={onToggle} className="flex items-center justify-between w-full">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </p>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>
      {expanded && children}
    </div>
  );
}

// ─── Rating Stars ────────────────────────────────────────────

function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3 w-3 ${s <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </span>
  );
}

// ─── Main Filter Content ─────────────────────────────────────

function FilterContent({
  facets,
  priceRange,
  categories,
  currentCategory,
  currentSearch,
  activeFilters,
  currentMinPrice,
  currentMaxPrice,
  vendors = [],
  productTypes = [],
  tags = [],
  quickCounts,
  ratingCounts = {},
  totalProducts,
  onFilterChange,
}: ProductFiltersProps & {
  onFilterChange: (key: string, value: string, action: "add" | "remove") => void;
}) {
  const t = useTranslations("filters");
  const tCommon = useTranslations("common");
  const [sections, setSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {
      quickFilters: true,
      categories: true,
      price: true,
      rating: false,
      vendors: false,
      productTypes: false,
      tags: false,
    };
    facets.forEach((f) => (initial[`facet_${f.slug}`] = true));
    return initial;
  });

  const [minPrice, setMinPrice] = useState(currentMinPrice || "");
  const [maxPrice, setMaxPrice] = useState(currentMaxPrice || "");
  const [tagSearch, setTagSearch] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const toggle = (key: string) => setSections((p) => ({ ...p, [key]: !p[key] }));

  // ── URL helpers ──

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete("page"); // reset pagination on filter change
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const toggleParam = useCallback(
    (key: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (params.get(key) === "true") params.delete(key);
      else params.set(key, "true");
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const isParamTrue = (key: string) => searchParams.get(key) === "true";

  const applyPriceFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (minPrice) params.set("minPrice", minPrice);
    else params.delete("minPrice");
    if (maxPrice) params.set("maxPrice", maxPrice);
    else params.delete("maxPrice");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  // ── Active filter count ──

  const attrCount = Object.values(activeFilters).reduce((s, a) => s + a.length, 0);
  const priceActive = currentMinPrice || currentMaxPrice ? 1 : 0;
  const quickActive =
    (isParamTrue("inStock") ? 1 : 0) +
    (isParamTrue("onSale") ? 1 : 0) +
    (isParamTrue("featured") ? 1 : 0) +
    (isParamTrue("newArrivals") ? 1 : 0);
  const ratingActive = searchParams.get("minRating") ? 1 : 0;
  const vendorActive = searchParams.get("vendor") ? searchParams.get("vendor")!.split(",").length : 0;
  const typeActive = searchParams.get("productType") ? searchParams.get("productType")!.split(",").length : 0;
  const tagActive = searchParams.get("tags") ? searchParams.get("tags")!.split(",").length : 0;

  const totalActiveFilters = attrCount + priceActive + quickActive + ratingActive + vendorActive + typeActive + tagActive;

  const clearAllFilters = () => {
    // Keep only the pathname (clears all filters)
    router.push(pathname);
    setMinPrice("");
    setMaxPrice("");
  };

  // ── Multi-value helpers ──

  const toggleMultiParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const current = params.get(key)?.split(",").filter(Boolean) || [];
      const idx = current.indexOf(value);
      if (idx > -1) current.splice(idx, 1);
      else current.push(value);
      if (current.length > 0) params.set(key, current.join(","));
      else params.delete(key);
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const isMultiActive = (key: string, value: string) =>
    (searchParams.get(key)?.split(",") || []).includes(value);

  // filter lists
  const filteredVendors = vendorSearch
    ? vendors.filter((v) => v.name.toLowerCase().includes(vendorSearch.toLowerCase()))
    : vendors;
  const filteredTags = tagSearch
    ? tags.filter((t) => t.name.toLowerCase().includes(tagSearch.toLowerCase()))
    : tags;

  return (
    <div className="space-y-5">
      {/* ── Clear All Button ── */}
      {totalActiveFilters > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t("activeFilters", { count: totalActiveFilters })}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={clearAllFilters}
            >
              <RotateCcw className="h-3 w-3" />
              {t("clearAll")}
            </Button>
          </div>

          {/* Active filter badges */}
          <div className="flex flex-wrap gap-1.5">
            {isParamTrue("inStock") && (
              <Badge variant="secondary" className="text-xs gap-1 cursor-pointer hover:bg-destructive/10" onClick={() => toggleParam("inStock")}>
                {t("inStock")} <X className="h-3 w-3" />
              </Badge>
            )}
            {isParamTrue("onSale") && (
              <Badge variant="secondary" className="text-xs gap-1 cursor-pointer hover:bg-destructive/10" onClick={() => toggleParam("onSale")}>
                {t("onSale")} <X className="h-3 w-3" />
              </Badge>
            )}
            {isParamTrue("featured") && (
              <Badge variant="secondary" className="text-xs gap-1 cursor-pointer hover:bg-destructive/10" onClick={() => toggleParam("featured")}>
                {t("featured")} <X className="h-3 w-3" />
              </Badge>
            )}
            {isParamTrue("newArrivals") && (
              <Badge variant="secondary" className="text-xs gap-1 cursor-pointer hover:bg-destructive/10" onClick={() => toggleParam("newArrivals")}>
                {t("newArrivals")} <X className="h-3 w-3" />
              </Badge>
            )}
            {searchParams.get("minRating") && (
              <Badge variant="secondary" className="text-xs gap-1 cursor-pointer hover:bg-destructive/10" onClick={() => setParam("minRating", null)}>
                {searchParams.get("minRating")}★+ <X className="h-3 w-3" />
              </Badge>
            )}
            {searchParams.get("vendor")?.split(",").map((v) => (
              <Badge key={`v-${v}`} variant="secondary" className="text-xs gap-1 cursor-pointer hover:bg-destructive/10" onClick={() => toggleMultiParam("vendor", v)}>
                {v} <X className="h-3 w-3" />
              </Badge>
            ))}
            {searchParams.get("productType")?.split(",").map((t) => (
              <Badge key={`pt-${t}`} variant="secondary" className="text-xs gap-1 cursor-pointer hover:bg-destructive/10" onClick={() => toggleMultiParam("productType", t)}>
                {t} <X className="h-3 w-3" />
              </Badge>
            ))}
            {searchParams.get("tags")?.split(",").map((t) => (
              <Badge key={`tag-${t}`} variant="secondary" className="text-xs gap-1 cursor-pointer hover:bg-destructive/10" onClick={() => toggleMultiParam("tags", t)}>
                #{t} <X className="h-3 w-3" />
              </Badge>
            ))}
            {Object.entries(activeFilters).map(([slug, values]) =>
              values.map((v) => (
                <Badge
                  key={`${slug}-${v}`}
                  variant="secondary"
                  className="text-xs gap-1 cursor-pointer hover:bg-destructive/10"
                  onClick={() => onFilterChange(`attr_${slug}`, v, "remove")}
                >
                  {v} <X className="h-3 w-3" />
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
                {t("priceRangeBadge", { min: currentMinPrice || "0", max: currentMaxPrice || "\u221E" })} <X className="h-3 w-3" />
              </Badge>
            )}
          </div>
          <Separator />
        </div>
      )}

      {/* ── Search ── */}
      <div>
        <form>
          {Object.entries(activeFilters).map(([slug, values]) => (
            <input key={slug} type="hidden" name={`attr_${slug}`} value={values.join(",")} />
          ))}
          {/* Preserve all current params except search */}
          {Array.from(searchParams.entries())
            .filter(([k]) => k !== "search" && !k.startsWith("attr_"))
            .map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
          <Input
            type="search"
            name="search"
            placeholder={t("searchProducts")}
            defaultValue={currentSearch}
            className="h-10"
          />
        </form>
      </div>

      {/* ── Quick Filters ── */}
      <FilterSection title={t("quickFilters")} expanded={sections.quickFilters} onToggle={() => toggle("quickFilters")}>
        <div className="space-y-0.5">
          <QuickToggle
            label={t("inStock")}
            icon={<Package className="h-3.5 w-3.5" />}
            count={quickCounts?.inStock}
            checked={isParamTrue("inStock")}
            onChange={() => toggleParam("inStock")}
          />
          <QuickToggle
            label={t("onSale")}
            icon={<Flame className="h-3.5 w-3.5" />}
            count={quickCounts?.onSale}
            checked={isParamTrue("onSale")}
            onChange={() => toggleParam("onSale")}
          />
          <QuickToggle
            label={t("featured")}
            icon={<Sparkles className="h-3.5 w-3.5" />}
            count={quickCounts?.featured}
            checked={isParamTrue("featured")}
            onChange={() => toggleParam("featured")}
          />
          <QuickToggle
            label={t("newArrivals")}
            icon={<Tag className="h-3.5 w-3.5" />}
            count={quickCounts?.newArrivals}
            checked={isParamTrue("newArrivals")}
            onChange={() => toggleParam("newArrivals")}
          />
        </div>
      </FilterSection>

      {/* ── Categories (hierarchical) ── */}
      <FilterSection title={t("categories")} expanded={sections.categories} onToggle={() => toggle("categories")}>
        <div className="space-y-0.5">
          <Link
            href="/products"
            className={`flex items-center text-sm py-2 px-3 rounded-lg transition-colors ${!currentCategory ? "bg-accent font-semibold text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"}`}
          >
            {t("allProducts")}
            {totalProducts !== undefined && (
              <span className="ml-auto text-xs text-muted-foreground/50">{totalProducts}</span>
            )}
          </Link>
          {categories.map((cat) => (
            <div key={cat.id}>
              <Link
                href={`/collections/${cat.slug}`}
                className={`flex items-center text-sm py-2 px-3 rounded-lg transition-colors ${currentCategory === cat.slug ? "bg-accent font-semibold text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"}`}
              >
                {cat.name}
              </Link>
              {/* Subcategories */}
              {cat.children && cat.children.length > 0 && (
                <div className="ml-4 border-l border-border/50 pl-2 space-y-0.5">
                  {cat.children.map((child) => (
                    <Link
                      key={child.id}
                      href={`/collections/${child.slug}`}
                      className={`flex items-center text-[13px] py-1.5 px-3 rounded-lg transition-colors ${currentCategory === child.slug ? "bg-accent font-semibold text-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"}`}
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </FilterSection>

      {/* ── Price Range ── */}
      <FilterSection title={t("priceRange")} expanded={sections.price} onToggle={() => toggle("price")}>
        <div className="space-y-3">
          <div className="flex gap-2 items-center">
            <Input
              type="number"
              placeholder={`${priceRange.min}`}
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="h-9 text-sm"
              min="0"
            />
            <span className="text-muted-foreground text-xs">{t("to")}</span>
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
            {t("applyPrice")}
          </Button>
        </div>
      </FilterSection>

      {/* ── Rating ── */}
      <FilterSection title={t("rating")} expanded={sections.rating} onToggle={() => toggle("rating")}>
        <div className="space-y-0.5">
          {[4, 3, 2, 1].map((r) => {
            const cnt = ratingCounts[String(r)] || 0;
            const isActive = searchParams.get("minRating") === String(r);
            return (
              <button
                key={r}
                onClick={() => setParam("minRating", isActive ? null : String(r))}
                className={`flex items-center gap-2 w-full text-sm py-1.5 px-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-foreground text-background font-medium"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                }`}
              >
                <RatingStars rating={r} />
                <span className="text-xs">{t("andUp")}</span>
                <span className={`ml-auto text-xs ${isActive ? "text-background/70" : "text-muted-foreground/50"}`}>
                  {cnt}
                </span>
              </button>
            );
          })}
        </div>
      </FilterSection>

      {/* ── Vendors ── */}
      {vendors.length > 0 && (
        <FilterSection title="Brand / Vendor" expanded={sections.vendors} onToggle={() => toggle("vendors")}>
          <div className="space-y-2">
            {vendors.length > 5 && (
              <Input
                type="search"
                placeholder={t("searchVendors")}
                value={vendorSearch}
                onChange={(e) => setVendorSearch(e.target.value)}
                className="h-8 text-xs"
              />
            )}
            <div className="space-y-0.5 max-h-48 overflow-y-auto">
              {filteredVendors.map((v) => {
                const active = isMultiActive("vendor", v.name);
                return (
                  <button
                    key={v.name}
                    onClick={() => toggleMultiParam("vendor", v.name)}
                    className={`flex items-center justify-between w-full text-sm py-1.5 px-3 rounded-lg transition-colors ${
                      active
                        ? "bg-foreground text-background font-medium"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    }`}
                  >
                    <span>{v.name}</span>
                    <span className={`text-xs ${active ? "text-background/70" : "text-muted-foreground/50"}`}>
                      {v.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </FilterSection>
      )}

      {/* ── Product Types ── */}
      {productTypes.length > 0 && (
        <FilterSection title="Product Type" expanded={sections.productTypes} onToggle={() => toggle("productTypes")}>
          <div className="space-y-0.5 max-h-48 overflow-y-auto">
            {productTypes.map((t) => {
              const active = isMultiActive("productType", t.name);
              return (
                <button
                  key={t.name}
                  onClick={() => toggleMultiParam("productType", t.name)}
                  className={`flex items-center justify-between w-full text-sm py-1.5 px-3 rounded-lg transition-colors ${
                    active
                      ? "bg-foreground text-background font-medium"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  }`}
                >
                  <span>{t.name}</span>
                  <span className={`text-xs ${active ? "text-background/70" : "text-muted-foreground/50"}`}>
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>
        </FilterSection>
      )}

      {/* ── Dynamic Facets (Attributes) ── */}
      {facets.map((facet) => (
        <FilterSection
          key={facet.id}
          title={facet.name}
          expanded={sections[`facet_${facet.slug}`] ?? true}
          onToggle={() => toggle(`facet_${facet.slug}`)}
        >
          {facet.type === "color" ? (
            <div className="flex flex-wrap gap-2 py-1">
              {facet.values.map((v) => {
                const optMatch = facet.options.find((o) => o.startsWith(v.value + ":"));
                const hex = optMatch ? optMatch.split(":")[1] : "#888";
                const isActive = (activeFilters[facet.slug] || []).includes(v.value);
                return (
                  <button
                    key={v.value}
                    onClick={() => onFilterChange(`attr_${facet.slug}`, v.value, isActive ? "remove" : "add")}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all border ${
                      isActive
                        ? "border-foreground ring-1 ring-foreground font-medium"
                        : "border-border hover:border-foreground/30"
                    }`}
                    title={`${v.value} (${v.count})`}
                  >
                    <span className="h-3.5 w-3.5 rounded-full border border-border/50" style={{ backgroundColor: hex }} />
                    <span className="hidden sm:inline lg:inline">{v.value}</span>
                    <span className="text-muted-foreground text-[10px]">{v.count}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-0.5">
              {facet.values.map((v) => {
                const isActive = (activeFilters[facet.slug] || []).includes(v.value);
                return (
                  <button
                    key={v.value}
                    onClick={() => onFilterChange(`attr_${facet.slug}`, v.value, isActive ? "remove" : "add")}
                    className={`flex items-center justify-between w-full text-sm py-1.5 px-3 rounded-lg transition-colors ${
                      isActive
                        ? "bg-foreground text-background font-medium"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    }`}
                  >
                    <span>{v.value}</span>
                    <span className={`text-xs ${isActive ? "text-background/70" : "text-muted-foreground/50"}`}>
                      {v.count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </FilterSection>
      ))}

      {/* ── Tags ── */}
      {tags.length > 0 && (
        <FilterSection title="Tags" expanded={sections.tags} onToggle={() => toggle("tags")}>
          <div className="space-y-2">
            {tags.length > 8 && (
              <Input
                type="search"
                placeholder={t("searchTags")}
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                className="h-8 text-xs"
              />
            )}
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
              {filteredTags.map((t) => {
                const active = isMultiActive("tags", t.name);
                return (
                  <Badge
                    key={t.name}
                    variant={active ? "default" : "outline"}
                    className={`cursor-pointer text-xs transition-colors ${
                      active ? "" : "hover:bg-accent"
                    }`}
                    onClick={() => toggleMultiParam("tags", t.name)}
                  >
                    #{t.name}
                    <span className="ml-1 text-[10px] opacity-60">{t.count}</span>
                  </Badge>
                );
              })}
            </div>
          </div>
        </FilterSection>
      )}
    </div>
  );
}

// ─── Exported Component ──────────────────────────────────────

export function ProductFilters(props: ProductFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const t = useTranslations("filters");

  const handleFilterChange = useCallback(
    (key: string, value: string, action: "add" | "remove") => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        const current = params.get(key)?.split(",").filter(Boolean) || [];

        if (action === "add") {
          if (!current.includes(value)) current.push(value);
        } else {
          const idx = current.indexOf(value);
          if (idx > -1) current.splice(idx, 1);
        }

        if (current.length > 0) params.set(key, current.join(","));
        else params.delete(key);

        params.delete("page");
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams, startTransition],
  );

  const attrCount = Object.values(props.activeFilters).reduce((s, a) => s + a.length, 0);
  const totalActive =
    attrCount +
    (props.currentMinPrice || props.currentMaxPrice ? 1 : 0) +
    (searchParams.get("inStock") === "true" ? 1 : 0) +
    (searchParams.get("onSale") === "true" ? 1 : 0) +
    (searchParams.get("featured") === "true" ? 1 : 0) +
    (searchParams.get("newArrivals") === "true" ? 1 : 0) +
    (searchParams.get("minRating") ? 1 : 0) +
    (searchParams.get("vendor") ? searchParams.get("vendor")!.split(",").length : 0) +
    (searchParams.get("productType") ? searchParams.get("productType")!.split(",").length : 0) +
    (searchParams.get("tags") ? searchParams.get("tags")!.split(",").length : 0);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 space-y-1 pb-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" /> {t("filtersTitle")}
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
              {t("filtersTitle")}
              {totalActive > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5 min-w-5">
                  {totalActive}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[min(340px,90vw)] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" /> {t("filtersTitle")}
                {totalActive > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-5 min-w-5">
                    {totalActive}
                  </Badge>
                )}
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
