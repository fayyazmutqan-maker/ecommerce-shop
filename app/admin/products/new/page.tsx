"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  Loader2,
  Save,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
  Package,
  Tag,
  Gift,
  ShieldCheck,
  Truck,
  Search,
  Globe2,
  Info,
  Layers,
  Sparkles,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { ImageUpload } from "@/components/ui/image-upload";
import { useTranslations } from "next-intl";

// ─── Types ────────────────────────────────────────
interface ProductGroup {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  attributes: ProductAttributeDef[];
}

interface ProductAttributeDef {
  id: string;
  name: string;
  slug: string;
  type: string;
  isFilterable: boolean;
  isRequired: boolean;
  sortOrder: number;
  options: string[];
}

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  children?: CategoryItem[];
}

interface VariantOption {
  name: string;
  type: "color" | "size" | "text";
  values: string[];
  colorValues?: Record<string, string>;
}

interface GeneratedVariant {
  id: string;
  options: Record<string, string>;
  sku: string;
  price: string;
  compareAtPrice: string;
  costPrice: string;
  quantity: string;
  barcode: string;
  weight: string;
  image: string;
  isActive: boolean;
}

interface BundleItem {
  productId: string;
  productName: string;
  quantity: number;
  discount: number;
}

interface ProductSearchResult {
  id: string;
  name: string;
  price: number;
}

// ─── Helpers ──────────────────────────────────────
function cartesianProduct(options: VariantOption[]): Record<string, string>[] {
  if (options.length === 0) return [];
  const filtered = options.filter((o) => o.name && o.values.length > 0);
  if (filtered.length === 0) return [];

  return filtered.reduce<Record<string, string>[]>((acc, option) => {
    if (acc.length === 0)
      return option.values.map((v) => ({ [option.name]: v }));
    return acc.flatMap((combo) =>
      option.values.map((v) => ({ ...combo, [option.name]: v }))
    );
  }, []);
}

const CUSTOM_BADGES = [
  "New",
  "Sale",
  "Hot",
  "Bestseller",
  "Limited Edition",
  "Trending",
  "Exclusive",
  "Clearance",
  "Pre-Order",
  "Coming Soon",
];

const COUNTRIES_ORIGIN = [
  "Saudi Arabia",
  "United Arab Emirates",
  "China",
  "India",
  "Turkey",
  "Egypt",
  "USA",
  "UK",
  "Germany",
  "France",
  "Italy",
  "Japan",
  "South Korea",
  "Bangladesh",
  "Vietnam",
  "Pakistan",
  "Indonesia",
  "Thailand",
  "Malaysia",
  "Brazil",
];

// ─── Component ────────────────────────────────────
export default function NewProductPage() {
  const router = useRouter();
  const t = useTranslations("admin.newProduct");
  const [isLoading, setIsLoading] = useState(false);

  // Basic toggles
  const [isFeatured, setIsFeatured] = useState(false);
  const [isDigital, setIsDigital] = useState(false);
  const [isGiftCard, setIsGiftCard] = useState(false);
  const [trackInventory, setTrackInventory] = useState(true);
  const [taxable, setTaxable] = useState(true);
  const [requiresShipping, setRequiresShipping] = useState(true);
  const [continueSellingWhenOOS, setContinueSellingWhenOOS] = useState(false);
  const [images, setImages] = useState<string[]>([]);

  // Product groups & attributes
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [attributeValues, setAttributeValues] = useState<
    Record<string, string[]>
  >({});

  // Categories
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Variant options (Shopify-style)
  const [hasVariants, setHasVariants] = useState(false);
  const [variantOptions, setVariantOptions] = useState<VariantOption[]>([]);
  const [generatedVariants, setGeneratedVariants] = useState<
    GeneratedVariant[]
  >([]);

  // Pricing extras
  const [price, setPrice] = useState("");
  const [compareAtPrice, setCompareAtPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [scheduleSale, setScheduleSale] = useState(false);
  const [salePriceFrom, setSalePriceFrom] = useState("");
  const [salePriceTo, setSalePriceTo] = useState("");

  // Custom badge
  const [customBadge, setCustomBadge] = useState("");

  // Scheduling
  const [schedulePublish, setSchedulePublish] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");

  // Organization extras
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  // Bundle
  const [isBundle, setIsBundle] = useState(false);
  const [bundleItems, setBundleItems] = useState<BundleItem[]>([]);
  const [bundleSearch, setBundleSearch] = useState("");
  const [bundleSearchResults, setBundleSearchResults] = useState<
    { id: string; name: string; price: number }[]
  >([]);

  // Section collapse
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    info: true,
    media: true,
    pricing: true,
    attributes: true,
    variants: true,
    inventory: true,
    shipping: true,
    seo: true,
    bundle: false,
  });

  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  // ─── Data Loading ─────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch("/api/product-groups").then((r) => { if (!r.ok) throw new Error(); return r.json(); }),
      fetch("/api/categories").then((r) => { if (!r.ok) throw new Error(); return r.json(); }),
    ])
      .then(([groupsData, catsData]) => {
        setGroups(groupsData);
        setCategories(catsData);
      })
      .catch(() => toast.error(t("loadFailed")));
  }, [t]);

  // Bundle search
  useEffect(() => {
    if (!bundleSearch || bundleSearch.length < 2) {
      setBundleSearchResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      fetch(
        `/api/products?search=${encodeURIComponent(bundleSearch)}&admin=true`
      )
        .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
        .then((data) => {
          const products: ProductSearchResult[] = Array.isArray(data) ? data : data.products || [];
          setBundleSearchResults(
            products.slice(0, 8).map((p) => ({
              id: p.id,
              name: p.name,
              price: p.price,
            }))
          );
        })
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timeout);
  }, [bundleSearch]);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  // ─── Attribute Handlers ───────────────────────────
  const handleGroupChange = useCallback((groupId: string) => {
    setSelectedGroupId(groupId);
    setAttributeValues({});
  }, []);

  const setAttrValue = (attrId: string, value: string) =>
    setAttributeValues((prev) => ({ ...prev, [attrId]: [value] }));

  const toggleAttrMultiValue = (attrId: string, value: string) =>
    setAttributeValues((prev) => {
      const current = prev[attrId] || [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [attrId]: next };
    });

  const setAttrTextValue = (attrId: string, value: string) =>
    setAttributeValues((prev) => ({ ...prev, [attrId]: [value] }));

  // ─── Category Toggle ──────────────────────────────
  const toggleCategory = (catId: string) =>
    setSelectedCategories((prev) =>
      prev.includes(catId)
        ? prev.filter((id) => id !== catId)
        : [...prev, catId]
    );

  // ─── Tag Management ───────────────────────────────
  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setTagInput("");
  };

  const removeTag = (tag: string) =>
    setTags((prev) => prev.filter((t) => t !== tag));

  // ─── Variant Option Management ────────────────────
  const addVariantOption = () => {
    if (variantOptions.length >= 3) return;
    setVariantOptions((prev) => [...prev, { name: "", type: "text", values: [], colorValues: {} }]);
  };

  const updateOptionName = (index: number, name: string) =>
    setVariantOptions((prev) =>
      prev.map((o, i) => {
        if (i !== index) return o;
        const normalized = name.toLowerCase();
        const type = normalized === "color" ? "color" : normalized === "size" ? "size" : o.type;
        return { ...o, name, type };
      })
    );

  const updateOptionType = (index: number, type: VariantOption["type"]) =>
    setVariantOptions((prev) =>
      prev.map((o, i) => (i === index ? { ...o, type } : o))
    );

  const updateOptionColor = (optionIndex: number, value: string, colorHex: string) =>
    setVariantOptions((prev) =>
      prev.map((option, index) =>
        index === optionIndex
          ? { ...option, colorValues: { ...(option.colorValues || {}), [value]: colorHex } }
          : option
      )
    );

  const addOptionValue = (index: number, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setVariantOptions((prev) =>
      prev.map((o, i) =>
        i === index && !o.values.includes(trimmed)
          ? { ...o, values: [...o.values, trimmed] }
          : o
      )
    );
  };

  const removeOptionValue = (optIndex: number, valIndex: number) =>
    setVariantOptions((prev) =>
      prev.map((o, i) =>
        i === optIndex
          ? { ...o, values: o.values.filter((_, vi) => vi !== valIndex) }
          : o
      )
    );

  const removeVariantOption = (index: number) =>
    setVariantOptions((prev) => prev.filter((_, i) => i !== index));

  // Auto-generate variants when options change
  useEffect(() => {
    if (!hasVariants) return;
    const combos = cartesianProduct(variantOptions);
    setGeneratedVariants((prev) =>
      combos.map((optionSet) => {
        const key = Object.values(optionSet).join(" / ");
        const existing = prev.find(
          (v) => Object.values(v.options).join(" / ") === key
        );
        return (
          existing || {
            id: crypto.randomUUID(),
            options: optionSet,
            sku: "",
            price: price || "",
            compareAtPrice: "",
            costPrice: "",
            quantity: "0",
            barcode: "",
            weight: "",
            image: "",
            isActive: true,
          }
        );
      })
    );
  }, [variantOptions, hasVariants, price]);

  const updateGeneratedVariant = (
    id: string,
    field: keyof GeneratedVariant,
    value: string | boolean
  ) =>
    setGeneratedVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );

  // Apply price to all variants
  const applyPriceToAll = () =>
    setGeneratedVariants((prev) =>
      prev.map((v) => ({
        ...v,
        price: price || v.price,
        costPrice: costPrice || v.costPrice,
      }))
    );

  // ─── Profit Calculation ───────────────────────────
  const profitInfo = useMemo(() => {
    const p = parseFloat(price) || 0;
    const c = parseFloat(costPrice) || 0;
    if (p === 0) return null;
    const profit = p - c;
    const margin = c > 0 ? ((profit / p) * 100).toFixed(1) : "—";
    return { profit: profit.toFixed(2), margin };
  }, [price, costPrice]);

  // ─── Bundle Handlers ──────────────────────────────
  const addBundleItem = (product: {
    id: string;
    name: string;
    price: number;
  }) => {
    if (bundleItems.some((b) => b.productId === product.id)) return;
    setBundleItems((prev) => [
      ...prev,
      {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        discount: 0,
      },
    ]);
    setBundleSearch("");
    setBundleSearchResults([]);
  };

  const updateBundleItem = (index: number, field: keyof BundleItem, value: string | number) =>
    setBundleItems((prev) =>
      prev.map((b, i) => (i === index ? { ...b, [field]: value } : b))
    );

  const removeBundleItem = (index: number) =>
    setBundleItems((prev) => prev.filter((_, i) => i !== index));

  // ─── Submit ───────────────────────────────────────
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      shortDescription: formData.get("shortDescription") as string,
      sku: formData.get("sku") as string,
      barcode: formData.get("barcode") as string,
      price: parseFloat(price) || 0,
      compareAtPrice: compareAtPrice ? parseFloat(compareAtPrice) : null,
      costPrice: costPrice ? parseFloat(costPrice) : null,
      quantity: parseInt(formData.get("quantity") as string) || 0,
      lowStockThreshold:
        parseInt(formData.get("lowStockThreshold") as string) || 5,
      weight: formData.get("weight")
        ? parseFloat(formData.get("weight") as string)
        : null,
      length: formData.get("length")
        ? parseFloat(formData.get("length") as string)
        : null,
      width: formData.get("width")
        ? parseFloat(formData.get("width") as string)
        : null,
      height: formData.get("height")
        ? parseFloat(formData.get("height") as string)
        : null,
      dimensionUnit: formData.get("dimensionUnit") || "cm",
      status: formData.get("status") as string,
      productType: formData.get("productType") as string,
      productGroupId: selectedGroupId || undefined,
      vendor: formData.get("vendor") as string,
      tags: tags.join(", "),
      seoTitle: formData.get("seoTitle") as string,
      seoDescription: formData.get("seoDescription") as string,
      isFeatured,
      isDigital,
      isGiftCard,
      trackInventory,
      taxable,
      requiresShipping: !isDigital && requiresShipping,
      continueSellingWhenOOS,
      images,
      categoryIds: selectedCategories,
      customBadge: customBadge || null,
      warrantyInfo: (formData.get("warrantyInfo") as string) || null,
      estimatedDelivery: (formData.get("estimatedDelivery") as string) || null,
      hsCode: (formData.get("hsCode") as string) || null,
      countryOfOrigin: (formData.get("countryOfOrigin") as string) || null,
      minOrderQty: parseInt(formData.get("minOrderQty") as string) || 1,
      maxOrderQty: formData.get("maxOrderQty")
        ? parseInt(formData.get("maxOrderQty") as string)
        : null,
      scheduledAt:
        schedulePublish && scheduledAt
          ? new Date(scheduledAt).toISOString()
          : null,
      salePriceFrom:
        scheduleSale && salePriceFrom
          ? new Date(salePriceFrom).toISOString()
          : null,
      salePriceTo:
        scheduleSale && salePriceTo
          ? new Date(salePriceTo).toISOString()
          : null,
      attributes: Object.entries(attributeValues)
        .filter(([, values]) => values.length > 0)
        .map(([attributeId, values]) => ({ attributeId, values })),
      bundleItems: isBundle
        ? bundleItems.map((b) => ({
            childId: b.productId,
            quantity: b.quantity,
            discount: b.discount,
          }))
        : undefined,
    };

      if (hasVariants && generatedVariants.length > 0) {
        data.variantOptions = variantOptions.map((option, index) => ({
          name: option.name,
          type: option.type,
          position: index + 1,
          values: option.values.map((value) => ({
            value,
            colorHex: option.type === "color" ? option.colorValues?.[value] : undefined,
          })),
        }));
        data.variants = generatedVariants
          .filter((v) => v.isActive)
        .map((v) => ({
          name: Object.values(v.options).join(" / "),
          sku: v.sku || undefined,
          barcode: v.barcode || undefined,
          price: parseFloat(v.price) || (data.price as number),
          compareAtPrice: v.compareAtPrice
            ? parseFloat(v.compareAtPrice)
            : null,
          costPrice: v.costPrice ? parseFloat(v.costPrice) : null,
          quantity: parseInt(v.quantity) || 0,
          weight: v.weight ? parseFloat(v.weight) : null,
          image: v.image || null,
          option1: Object.values(v.options)[0] || undefined,
          option2: Object.values(v.options)[1] || undefined,
          option3: Object.values(v.options)[2] || undefined,
        }));
    }

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create product");
      }

      toast.success(t("createSuccess"));
      router.push("/admin/products");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("createFailed")
      );
    } finally {
      setIsLoading(false);
    }
  }

  // ─── Attribute Field Renderer ─────────────────────
  function renderAttributeField(attr: ProductAttributeDef) {
    const currentValues = attributeValues[attr.id] || [];

    if (attr.type === "text") {
      return (
        <div key={attr.id} className="space-y-2">
          <Label className="text-sm">
            {attr.name}
            {attr.isRequired && (
              <span className="text-destructive ml-1">*</span>
            )}
          </Label>
          <Input
            value={currentValues[0] || ""}
            onChange={(e) => setAttrTextValue(attr.id, e.target.value)}
            placeholder={`Enter ${attr.name.toLowerCase()}`}
          />
        </div>
      );
    }

    if (attr.type === "select") {
      return (
        <div key={attr.id} className="space-y-2">
          <Label className="text-sm">
            {attr.name}
            {attr.isRequired && (
              <span className="text-destructive ml-1">*</span>
            )}
          </Label>
          <Select
            value={currentValues[0] || ""}
            onValueChange={(v) => setAttrValue(attr.id, v)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${attr.name.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {attr.options.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (attr.type === "multi-select") {
      return (
        <div key={attr.id} className="space-y-2">
          <Label className="text-sm">
            {attr.name}
            {attr.isRequired && (
              <span className="text-destructive ml-1">*</span>
            )}
          </Label>
          <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-background max-h-40 overflow-y-auto">
            {attr.options.map((opt) => (
              <label
                key={opt}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors border ${
                  currentValues.includes(opt)
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background hover:bg-accent border-border"
                }`}
              >
                <Checkbox
                  checked={currentValues.includes(opt)}
                  onCheckedChange={() => toggleAttrMultiValue(attr.id, opt)}
                  className="sr-only"
                />
                {opt}
              </label>
            ))}
          </div>
          {currentValues.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {currentValues.length} selected
            </p>
          )}
        </div>
      );
    }

    if (attr.type === "color") {
      return (
        <div key={attr.id} className="space-y-2">
          <Label className="text-sm">
            {attr.name}
            {attr.isRequired && (
              <span className="text-destructive ml-1">*</span>
            )}
          </Label>
          <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-background">
            {attr.options.map((opt) => {
              const [colorName, hex] = opt.includes(":")
                ? opt.split(":")
                : [opt, "#888"];
              const isSelected = currentValues.includes(colorName);
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => toggleAttrMultiValue(attr.id, colorName)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all border ${
                    isSelected
                      ? "ring-2 ring-foreground border-foreground"
                      : "border-border hover:border-foreground/30"
                  }`}
                >
                  <span
                    className="h-4 w-4 rounded-full border border-border flex-shrink-0"
                    style={{ backgroundColor: hex }}
                  />
                  {colorName}
                </button>
              );
            })}
          </div>
          {currentValues.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {currentValues.map((v) => (
                <Badge key={v} variant="secondary" className="text-xs">
                  {v}
                </Badge>
              ))}
            </div>
          )}
        </div>
      );
    }

    return null;
  }

  // ─── Render ───────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs gap-1">
            <Info className="h-3 w-3" /> {t("allPricesIn")}
          </Badge>
        </div>
      </div>

      <form onSubmit={onSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* ═══════════════ LEFT COLUMN (2/3) ═══════════════ */}
          <div className="lg:col-span-2 space-y-6">
            {/* ── Product Information ── */}
            <Card>
              <Collapsible
                open={openSections.info}
                onOpenChange={() => toggleSection("info")}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-accent/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <CardTitle>{t("productInformation")}</CardTitle>
                      </div>
                      {openSections.info ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                    <CardDescription>
                      {t("productInfoDesc")}
                    </CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">{t("productName")}</Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder={t("productNamePlaceholder")}
                        required
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shortDescription">
                        {t("shortDescription")}
                      </Label>
                      <Input
                        id="shortDescription"
                        name="shortDescription"
                        placeholder={t("shortDescPlaceholder")}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">{t("fullDescription")}</Label>
                      <Textarea
                        id="description"
                        name="description"
                        placeholder={t("fullDescPlaceholder")}
                        rows={8}
                      />
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* ── Media ── */}
            <Card>
              <Collapsible
                open={openSections.media}
                onOpenChange={() => toggleSection("media")}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-accent/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-muted-foreground" />
                        <CardTitle>{t("media")}</CardTitle>
                      </div>
                      {openSections.media ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                    <CardDescription>
                      {t("mediaDesc")}
                    </CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent>
                    <ImageUpload
                      value={images}
                      onChange={setImages}
                      folder="products"
                      maxImages={10}
                      disabled={isLoading}
                    />
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* ── Pricing & Profit ── */}
            <Card>
              <Collapsible
                open={openSections.pricing}
                onOpenChange={() => toggleSection("pricing")}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-accent/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <CardTitle>{t("pricing")}</CardTitle>
                      </div>
                      {openSections.pricing ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                    <CardDescription>
                      {t("pricingDesc")}
                    </CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="price">{t("price")}</Label>
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          required
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="compareAtPrice">
                          {t("compareAtPrice")}
                        </Label>
                        <Input
                          id="compareAtPrice"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={compareAtPrice}
                          onChange={(e) => setCompareAtPrice(e.target.value)}
                          className="h-11"
                        />
                        {parseFloat(compareAtPrice) > 0 &&
                          parseFloat(price) > 0 &&
                          parseFloat(compareAtPrice) > parseFloat(price) && (
                            <p className="text-xs text-green-600 font-medium">
                              →{" "}
                              {Math.round(
                                ((parseFloat(compareAtPrice) -
                                  parseFloat(price)) /
                                  parseFloat(compareAtPrice)) *
                                  100
                              )}
                              % discount
                            </p>
                          )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="costPrice">{t("costPrice")}</Label>
                        <Input
                          id="costPrice"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={costPrice}
                          onChange={(e) => setCostPrice(e.target.value)}
                          className="h-11"
                        />
                      </div>
                    </div>

                    {/* Profit Display */}
                    {profitInfo && (
                      <div className="flex items-center gap-6 p-3 bg-accent/50 rounded-lg text-sm">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{t("profit")}:</span>
                          <span
                            className={`font-bold ${parseFloat(profitInfo.profit) >= 0 ? "text-green-600" : "text-destructive"}`}
                          >
                            SAR {profitInfo.profit}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t("margin")}:</span>{" "}
                          <span className="font-bold">
                            {profitInfo.margin}
                            {profitInfo.margin !== "—" && "%"}
                          </span>
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* Tax & Order Qty */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="taxable"
                          checked={taxable}
                          onCheckedChange={setTaxable}
                        />
                        <Label htmlFor="taxable">
                          {t("chargeVAT")}
                        </Label>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="minOrderQty">{t("minOrderQty")}</Label>
                        <Input
                          id="minOrderQty"
                          name="minOrderQty"
                          type="number"
                          min="1"
                          defaultValue="1"
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxOrderQty">{t("maxOrderQty")}</Label>
                        <Input
                          id="maxOrderQty"
                          name="maxOrderQty"
                          type="number"
                          min="1"
                          placeholder={t("noLimit")}
                          className="h-11"
                        />
                      </div>
                    </div>

                    {/* Sale Schedule */}
                    <Separator />
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={scheduleSale}
                        onCheckedChange={setScheduleSale}
                      />
                      <Label>{t("scheduleSale")}</Label>
                    </div>
                    {scheduleSale && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>{t("saleStarts")}</Label>
                          <Input
                            type="datetime-local"
                            value={salePriceFrom}
                            onChange={(e) => setSalePriceFrom(e.target.value)}
                            className="h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t("saleEnds")}</Label>
                          <Input
                            type="datetime-local"
                            value={salePriceTo}
                            onChange={(e) => setSalePriceTo(e.target.value)}
                            className="h-11"
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* ── Product Type & Attributes ── */}
            <Card>
              <Collapsible
                open={openSections.attributes}
                onOpenChange={() => toggleSection("attributes")}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-accent/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-muted-foreground" />
                        <CardTitle>{t("productTypeAttributes")}</CardTitle>
                      </div>
                      {openSections.attributes ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                    <CardDescription>
                      {t("productTypeAttrDesc")}
                    </CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <Label>{t("productGroup")}</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                        {groups.map((g) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => handleGroupChange(g.id)}
                            className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-all ${
                              selectedGroupId === g.id
                                ? "border-foreground bg-foreground text-background"
                                : "border-border hover:border-foreground/30 hover:bg-accent/50"
                            }`}
                          >
                            <span className="text-lg">{g.icon || "📦"}</span>
                            <span className="text-center leading-tight">
                              {g.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {selectedGroup &&
                      selectedGroup.attributes.length > 0 && (
                        <>
                          <Separator />
                          <div className="space-y-5">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">
                                {selectedGroup.icon} {selectedGroup.name}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                              {selectedGroup.attributes.length} {t("attributes")}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              {selectedGroup.attributes.map((attr) =>
                                renderAttributeField(attr)
                              )}
                            </div>
                          </div>
                        </>
                      )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* ── Variants (Shopify-style Option Builder) ── */}
            <Card>
              <Collapsible
                open={openSections.variants}
                onOpenChange={() => toggleSection("variants")}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-accent/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-muted-foreground" />
                        <CardTitle>{t("variants")}</CardTitle>
                        {hasVariants && generatedVariants.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {generatedVariants.length} variants
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={hasVariants}
                          onCheckedChange={(v) => {
                            setHasVariants(v);
                            if (v && variantOptions.length === 0) {
                              setVariantOptions([{ name: "", type: "text", values: [], colorValues: {} }]);
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        {openSections.variants ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                    <CardDescription>
                      {t("variantsDesc")}
                    </CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {hasVariants && (
                    <CardContent className="space-y-6">
                      {/* Option Definitions */}
                      <div className="space-y-4">
                        <Label className="text-sm font-semibold">
                          {t("optionDefinitions")}
                        </Label>
                        {variantOptions.map((option, optIdx) => (
                          <div
                            key={optIdx}
                            className="border rounded-lg p-4 space-y-3 bg-accent/20"
                          >
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                {t("option")} {optIdx + 1}
                              </Label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive"
                                onClick={() => removeVariantOption(optIdx)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="space-y-1.5">
                                <Label className="text-xs">{t("optionName")}</Label>
                                <Select
                                  value={option.name}
                                  onValueChange={(v) =>
                                    updateOptionName(optIdx, v)
                                  }
                                >
                                  <SelectTrigger className="h-10">
                                    <SelectValue placeholder="e.g., Color, Size" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Color">{t("color")}</SelectItem>
                                    <SelectItem value="Size">{t("size")}</SelectItem>
                                    <SelectItem value="Material">
                                      {t("material")}
                                    </SelectItem>
                                    <SelectItem value="Style">{t("style")}</SelectItem>
                                    <SelectItem value="Finish">
                                      {t("finish")}
                                    </SelectItem>
                                    <SelectItem value="Capacity">
                                      {t("capacity")}
                                    </SelectItem>
                                    <SelectItem value="Length">
                                      {t("length")}
                                    </SelectItem>
                                    <SelectItem value="Flavor">
                                      {t("flavor")}
                                    </SelectItem>
                                    <SelectItem value="Scent">{t("scent")}</SelectItem>
                                    <SelectItem value="Weight">
                                      {t("weight")}
                                    </SelectItem>
                                    <SelectItem value="Pack Size">
                                      {t("packSize")}
                                    </SelectItem>
                                    <SelectItem value="Custom">
                                      {t("custom")}
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                {option.name === "Custom" && (
                                  <Input
                                    placeholder={t("enterCustomOption")}
                                    className="h-10 mt-2"
                                    onBlur={(e) => {
                                      if (e.target.value)
                                        updateOptionName(
                                          optIdx,
                                          e.target.value
                                        );
                                    }}
                                  />
                                )}
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">{t("optionType")}</Label>
                                <Select
                                  value={option.type}
                                  onValueChange={(value) => updateOptionType(optIdx, value as VariantOption["type"])}
                                >
                                  <SelectTrigger className="h-10">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="text">{t("textOption")}</SelectItem>
                                    <SelectItem value="color">{t("colorOption")}</SelectItem>
                                    <SelectItem value="size">{t("sizeOption")}</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs">
                                  {t("values")}{" "}
                                  <span className="text-muted-foreground">
                                    {t("valuesHint")}
                                  </span>
                                </Label>
                                <Input
                                  placeholder={
                                    option.name === "Size"
                                      ? "e.g., S, M, L, XL"
                                      : option.name === "Color"
                                        ? "e.g., Red, Blue, Black"
                                        : "Add a value..."
                                  }
                                  className="h-10"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === ",") {
                                      e.preventDefault();
                                      const val = (
                                        e.target as HTMLInputElement
                                      ).value.trim();
                                      if (val) {
                                        addOptionValue(optIdx, val);
                                        (e.target as HTMLInputElement).value =
                                          "";
                                      }
                                    }
                                  }}
                                  onBlur={(e) => {
                                    const val = e.target.value.trim();
                                    if (val) {
                                      addOptionValue(optIdx, val);
                                      e.target.value = "";
                                    }
                                  }}
                                />
                              </div>
                            </div>
                            {option.values.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {option.values.map((val, valIdx) => (
                                  <div key={val} className="flex items-center gap-2 rounded-md border bg-background px-2 py-1">
                                    {option.type === "color" && (
                                      <Input
                                        type="color"
                                        value={option.colorValues?.[val] || "#e5e7eb"}
                                        onChange={(event) => updateOptionColor(optIdx, val, event.target.value)}
                                        className="h-6 w-8 cursor-pointer border-0 p-0"
                                        aria-label={`${val} color`}
                                      />
                                    )}
                                    <span className="text-xs font-medium">{val}</span>
                                    <button
                                      type="button"
                                      onClick={() => removeOptionValue(optIdx, valIdx)}
                                      className="hover:text-destructive"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                        {variantOptions.length < 3 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addVariantOption}
                          >
                            <Plus className="mr-2 h-3.5 w-3.5" />
                            {t("addAnotherOption")}
                          </Button>
                        )}
                      </div>

                      {/* Generated Variant Matrix */}
                      {generatedVariants.length > 0 && (
                        <>
                          <Separator />
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-semibold">
                                {t("variantMatrix")} ({generatedVariants.length}{" "}
                                {t("combinations")})
                              </Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={applyPriceToAll}
                                className="text-xs"
                              >
                                {t("applyBasePrice")}
                              </Button>
                            </div>
                            <div className="border rounded-lg overflow-x-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-8"></TableHead>
                                    <TableHead>{t("variant")}</TableHead>
                                    <TableHead>{t("sku")}</TableHead>
                                    <TableHead>{t("price")} </TableHead>
                                    <TableHead>{t("quantity")}</TableHead>
                                    <TableHead>{t("barcode")}</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {generatedVariants.map((variant) => (
                                    <TableRow
                                      key={variant.id}
                                      className={
                                        !variant.isActive ? "opacity-40" : ""
                                      }
                                    >
                                      <TableCell>
                                        <Checkbox
                                          checked={variant.isActive}
                                          onCheckedChange={(v) =>
                                            updateGeneratedVariant(
                                              variant.id,
                                              "isActive",
                                              !!v
                                            )
                                          }
                                        />
                                      </TableCell>
                                      <TableCell className="font-medium text-sm">
                                        {Object.values(variant.options).join(
                                          " / "
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        <Input
                                          value={variant.sku}
                                          onChange={(e) =>
                                            updateGeneratedVariant(
                                              variant.id,
                                              "sku",
                                              e.target.value
                                            )
                                          }
                                          placeholder={t("auto")}
                                          className="h-8 w-28 text-xs"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          value={variant.price}
                                          onChange={(e) =>
                                            updateGeneratedVariant(
                                              variant.id,
                                              "price",
                                              e.target.value
                                            )
                                          }
                                          placeholder={price || "0.00"}
                                          className="h-8 w-24 text-xs"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Input
                                          type="number"
                                          min="0"
                                          value={variant.quantity}
                                          onChange={(e) =>
                                            updateGeneratedVariant(
                                              variant.id,
                                              "quantity",
                                              e.target.value
                                            )
                                          }
                                          className="h-8 w-20 text-xs"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Input
                                          value={variant.barcode}
                                          onChange={(e) =>
                                            updateGeneratedVariant(
                                              variant.id,
                                              "barcode",
                                              e.target.value
                                            )
                                          }
                                          placeholder={t("optional")}
                                          className="h-8 w-28 text-xs"
                                        />
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* ── Inventory ── */}
            <Card>
              <Collapsible
                open={openSections.inventory}
                onOpenChange={() => toggleSection("inventory")}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-accent/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <CardTitle>{t("inventory")}</CardTitle>
                      </div>
                      {openSections.inventory ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                    <CardDescription>
                      {t("inventoryDesc")}
                    </CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="sku">{t("skuLabel")}</Label>
                        <Input
                          id="sku"
                          name="sku"
                          placeholder={t("skuPlaceholder")}
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="barcode">
                          {t("barcodeLabel")}
                        </Label>
                        <Input
                          id="barcode"
                          name="barcode"
                          placeholder={t("barcodePlaceholder")}
                          className="h-11"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="trackInventory"
                          checked={trackInventory}
                          onCheckedChange={setTrackInventory}
                        />
                        <Label htmlFor="trackInventory">{t("trackInventory")}</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id="continueSellingWhenOOS"
                          checked={continueSellingWhenOOS}
                          onCheckedChange={setContinueSellingWhenOOS}
                        />
                        <Label htmlFor="continueSellingWhenOOS">
                          {t("continueSelling")}
                        </Label>
                      </div>
                    </div>
                    {trackInventory && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="quantity">{t("quantityInStock")}</Label>
                          <Input
                            id="quantity"
                            name="quantity"
                            type="number"
                            min="0"
                            defaultValue="0"
                            className="h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lowStockThreshold">
                            {t("lowStockThreshold")}
                          </Label>
                          <Input
                            id="lowStockThreshold"
                            name="lowStockThreshold"
                            type="number"
                            min="0"
                            defaultValue="5"
                            className="h-11"
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* ── Shipping & Delivery ── */}
            <Card>
              <Collapsible
                open={openSections.shipping}
                onOpenChange={() => toggleSection("shipping")}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-accent/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <CardTitle>{t("shippingDelivery")}</CardTitle>
                      </div>
                      {openSections.shipping ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                    <CardDescription>
                      {t("shippingDesc")}
                    </CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="isDigital"
                          checked={isDigital}
                          onCheckedChange={(v) => {
                            setIsDigital(v);
                            if (v) setRequiresShipping(false);
                          }}
                        />
                        <Label htmlFor="isDigital">{t("digitalProduct")}</Label>
                      </div>
                      {!isDigital && (
                        <div className="flex items-center gap-2">
                          <Switch
                            id="requiresShipping"
                            checked={requiresShipping}
                            onCheckedChange={setRequiresShipping}
                          />
                          <Label htmlFor="requiresShipping">
                            {t("requiresShipping")}
                          </Label>
                        </div>
                      )}
                    </div>

                    {!isDigital && (
                      <>
                        <Separator />
                        <div className="grid gap-4 sm:grid-cols-4">
                          <div className="space-y-2">
                            <Label htmlFor="weight">{t("weight")}</Label>
                            <Input
                              id="weight"
                              name="weight"
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.0"
                              className="h-11"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="length">{t("length")}</Label>
                            <Input
                              id="length"
                              name="length"
                              type="number"
                              step="0.1"
                              min="0"
                              placeholder="cm"
                              className="h-11"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="width">{t("width")}</Label>
                            <Input
                              id="width"
                              name="width"
                              type="number"
                              step="0.1"
                              min="0"
                              placeholder="cm"
                              className="h-11"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="height">{t("height")}</Label>
                            <Input
                              id="height"
                              name="height"
                              type="number"
                              step="0.1"
                              min="0"
                              placeholder="cm"
                              className="h-11"
                            />
                          </div>
                        </div>
                        <input
                          type="hidden"
                          name="dimensionUnit"
                          value="cm"
                        />

                        <Separator />
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="countryOfOrigin">
                              {t("countryOfOrigin")}
                            </Label>
                            <Select name="countryOfOrigin">
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder={t("selectCountry")} />
                              </SelectTrigger>
                              <SelectContent>
                                {COUNTRIES_ORIGIN.map((c) => (
                                  <SelectItem key={c} value={c}>
                                    {c}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="hsCode">
                              {t("hsCode")}
                            </Label>
                            <Input
                              id="hsCode"
                              name="hsCode"
                              placeholder={t("hsCodePlaceholder")}
                              className="h-11"
                            />
                            <p className="text-xs text-muted-foreground">
                              {t("hsCodeHint")}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="estimatedDelivery">
                            {t("estimatedDelivery")}
                          </Label>
                          <Input
                            id="estimatedDelivery"
                            name="estimatedDelivery"
                            placeholder={t("estimatedDeliveryPlaceholder")}
                            className="h-11"
                          />
                        </div>
                      </>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* ── Bundle Products ── */}
            <Card>
              <Collapsible
                open={openSections.bundle}
                onOpenChange={() => toggleSection("bundle")}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-accent/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Gift className="h-4 w-4 text-muted-foreground" />
                        <CardTitle>{t("bundleGift")}</CardTitle>
                      </div>
                      {openSections.bundle ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                    <CardDescription>
                      {t("bundleDesc")}
                    </CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={isGiftCard}
                          onCheckedChange={setIsGiftCard}
                        />
                        <Label>{t("isGiftCard")}</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={isBundle}
                          onCheckedChange={setIsBundle}
                        />
                        <Label>{t("isBundle")}</Label>
                      </div>
                    </div>

                    {isBundle && (
                      <>
                        <Separator />
                        <div className="space-y-3">
                          <Label className="text-sm font-semibold">
                            {t("bundleItems")}
                          </Label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder={t("searchBundle")}
                              value={bundleSearch}
                              onChange={(e) => setBundleSearch(e.target.value)}
                              className="pl-9 h-11"
                            />
                          </div>
                          {bundleSearchResults.length > 0 && (
                            <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                              {bundleSearchResults.map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => addBundleItem(p)}
                                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent transition-colors border-b last:border-0"
                                >
                                  <span>{p.name}</span>
                                  <span className="text-muted-foreground">
                                    SAR {p.price.toFixed(2)}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}

                          {bundleItems.length > 0 && (
                            <div className="space-y-2">
                              {bundleItems.map((item, idx) => (
                                <div
                                  key={item.productId}
                                  className="flex items-center gap-3 p-3 border rounded-lg"
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {item.productName}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="number"
                                      min="1"
                                      value={item.quantity}
                                      onChange={(e) =>
                                        updateBundleItem(
                                          idx,
                                          "quantity",
                                          parseInt(e.target.value) || 1
                                        )
                                      }
                                      className="h-8 w-16 text-xs"
                                      placeholder="Qty"
                                    />
                                    <Input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={item.discount}
                                      onChange={(e) =>
                                        updateBundleItem(
                                          idx,
                                          "discount",
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      className="h-8 w-20 text-xs"
                                      placeholder="% off"
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive"
                                      onClick={() => removeBundleItem(idx)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>

            {/* ── SEO ── */}
            <Card>
              <Collapsible
                open={openSections.seo}
                onOpenChange={() => toggleSection("seo")}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-accent/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe2 className="h-4 w-4 text-muted-foreground" />
                        <CardTitle>{t("seoSearch")}</CardTitle>
                      </div>
                      {openSections.seo ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                    <CardDescription>
                      {t("seoDesc")}
                    </CardDescription>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="seoTitle">{t("seoTitle")}</Label>
                      <Input
                        id="seoTitle"
                        name="seoTitle"
                        placeholder={t("seoTitlePlaceholder")}
                        className="h-11"
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("seoTitleHint")}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="seoDescription">{t("metaDescription")}</Label>
                      <Textarea
                        id="seoDescription"
                        name="seoDescription"
                        placeholder={t("metaDescPlaceholder")}
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("metaDescHint")}
                      </p>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          </div>

          {/* ═══════════════ RIGHT COLUMN (1/3) ═══════════════ */}
          <div className="space-y-6">
            {/* ── Status & Visibility ── */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  {t("statusVisibility")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status">{t("productStatus")}</Label>
                  <Select name="status" defaultValue="DRAFT">
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder={t("selectStatus")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-yellow-500" />
                          {t("draft")}
                        </div>
                      </SelectItem>
                      <SelectItem value="ACTIVE">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-green-500" />
                          {t("active")}
                        </div>
                      </SelectItem>
                      <SelectItem value="ARCHIVED">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-gray-400" />
                          {t("archived")}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="isFeatured"
                    checked={isFeatured}
                    onCheckedChange={setIsFeatured}
                  />
                  <Label htmlFor="isFeatured">{t("featuredProduct")}</Label>
                </div>

                <Separator />

                {/* Schedule Publishing */}
                <div className="flex items-center gap-2">
                  <Switch
                    checked={schedulePublish}
                    onCheckedChange={setSchedulePublish}
                  />
                  <Label className="text-sm">{t("schedulePublishing")}</Label>
                </div>
                {schedulePublish && (
                  <div className="space-y-2">
                    <Label className="text-xs">{t("publishDateTime")}</Label>
                    <Input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="h-10"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Custom Badge / Label ── */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5" /> {t("productBadge")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {CUSTOM_BADGES.map((badge) => (
                    <button
                      key={badge}
                      type="button"
                      onClick={() =>
                        setCustomBadge(customBadge === badge ? "" : badge)
                      }
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all border ${
                        customBadge === badge
                          ? "bg-foreground text-background border-foreground"
                          : "border-border hover:border-foreground/30"
                      }`}
                    >
                      {badge}
                    </button>
                  ))}
                </div>
                {customBadge && (
                  <p className="text-xs text-muted-foreground">
                    {t("badgeShown", { badge: customBadge })}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* ── Product Organization ── */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  {t("organization")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="productType">{t("productType")}</Label>
                  <Input
                    id="productType"
                    name="productType"
                    placeholder={t("productTypePlaceholder")}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vendor">{t("vendorBrand")}</Label>
                  <Input
                    id="vendor"
                    name="vendor"
                    placeholder={t("vendorPlaceholder")}
                    className="h-11"
                  />
                </div>
                <Separator />
                {/* Collections / Categories */}
                <div className="space-y-2">
                  <Label className="text-sm">{t("collections")}</Label>
                  <div className="border rounded-lg max-h-48 overflow-y-auto p-2 space-y-1">
                    {categories.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-2">
                        {t("noCategories")}
                      </p>
                    ) : (
                      categories.map((cat) => (
                        <div key={cat.id}>
                          <label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent/50 cursor-pointer">
                            <Checkbox
                              checked={selectedCategories.includes(cat.id)}
                              onCheckedChange={() => toggleCategory(cat.id)}
                            />
                            <span className="text-sm font-medium">
                              {cat.name}
                            </span>
                          </label>
                          {cat.children &&
                            cat.children.map((child) => (
                              <label
                                key={child.id}
                                className="flex items-center gap-2 px-2 py-1.5 pl-8 rounded hover:bg-accent/50 cursor-pointer"
                              >
                                <Checkbox
                                  checked={selectedCategories.includes(
                                    child.id
                                  )}
                                  onCheckedChange={() =>
                                    toggleCategory(child.id)
                                  }
                                />
                                <span className="text-sm text-muted-foreground">
                                  {child.name}
                                </span>
                              </label>
                            ))}
                        </div>
                      ))
                    )}
                  </div>
                  {selectedCategories.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {t("selected", { count: selectedCategories.length })}
                    </p>
                  )}
                </div>
                <Separator />
                {/* Tags */}
                <div className="space-y-2">
                  <Label>{t("tags")}</Label>
                  <div className="flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder={t("addTag")}
                      className="h-10"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addTag}
                      className="h-10 px-3"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs gap-1 pl-2.5 pr-1"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* ── Customer Engagement ── */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5" /> {t("warrantyTrust")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="warrantyInfo">{t("warrantyInfo")}</Label>
                  <Input
                    id="warrantyInfo"
                    name="warrantyInfo"
                    placeholder={t("warrantyPlaceholder")}
                    className="h-11"
                  />
                </div>
              </CardContent>
            </Card>

            {/* ── Save ── */}
            <div className="sticky bottom-4 space-y-3">
              <Button
                type="submit"
                className="w-full h-12 text-[15px] font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {t("saveProduct")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full h-11"
                onClick={() => router.push("/admin/products")}
                disabled={isLoading}
              >
                {t("cancel")}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
