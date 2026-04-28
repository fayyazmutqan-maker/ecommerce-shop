"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { AddToCartButton } from "@/components/store/add-to-cart-button";
import { useTranslations } from "next-intl";
import type { ProductVariantOption } from "@/lib/product-variant-options";

export interface Variant {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  compareAtPrice: number | null;
  quantity: number;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  image: string | null;
}

interface VariantSelectorProps {
  productId: string;
  productName: string;
  productPrice: number;
  productCompareAtPrice: number | null;
  productQuantity: number;
  productImage: string;
  variants: Variant[];
  initialVariantId?: string | null;
  variantOptions?: ProductVariantOption[];
  onVariantChange?: (variant: Variant | null) => void;
}

type OptionKey = "option1" | "option2" | "option3";
type OptionLabelKey = "color" | "capacity" | "size" | "connectivity";

const OPTION_KEYS: OptionKey[] = ["option1", "option2", "option3"];
const COLOR_VALUES = new Set([
  "black",
  "white",
  "silver",
  "gold",
  "gray",
  "grey",
  "blue",
  "red",
  "green",
  "yellow",
  "pink",
  "purple",
  "orange",
  "brown",
  "beige",
  "space black",
  "space gray",
  "space grey",
]);
const COLOR_SWATCHES: Record<string, string> = {
  black: "#111827",
  white: "#ffffff",
  silver: "#cbd5e1",
  gold: "#d4af37",
  gray: "#6b7280",
  grey: "#6b7280",
  blue: "#2563eb",
  red: "#dc2626",
  green: "#16a34a",
  yellow: "#facc15",
  pink: "#ec4899",
  purple: "#9333ea",
  orange: "#f97316",
  brown: "#92400e",
  beige: "#d6c2a8",
  "space black": "#020617",
  "space gray": "#4b5563",
  "space grey": "#4b5563",
};
const SIZE_PATTERN = /^(xxs|xs|s|m|l|xl|xxl|xxxl|\d+(\.\d+)?\s?(inch|in|cm|mm)|\d+(\.\d+)?)$/i;
const CAPACITY_PATTERN = /\b\d+\s?(gb|tb|mb)\b/i;

function getUniqueValues(variants: Variant[], key: OptionKey) {
  return Array.from(
    new Set(
      variants
        .map((variant) => variant[key]?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

function getOptionLabelKey(values: string[]): OptionLabelKey | null {
  const normalized = values.map((value) => value.toLowerCase());
  if (normalized.some((value) => COLOR_VALUES.has(value) || value.includes("black") || value.includes("silver"))) {
    return "color";
  }
  if (values.some((value) => CAPACITY_PATTERN.test(value))) return "capacity";
  if (values.some((value) => SIZE_PATTERN.test(value))) return "size";
  if (normalized.some((value) => value.includes("wi-fi") || value.includes("cell") || value.includes("lte") || value.includes("5g"))) {
    return "connectivity";
  }
  return null;
}

function getColorSwatch(value: string) {
  const normalized = value.toLowerCase().trim();
  const exact = COLOR_SWATCHES[normalized];
  if (exact) return exact;

  const matchedColor = Object.entries(COLOR_SWATCHES).find(([colorName]) => normalized.includes(colorName));
  return matchedColor?.[1] ?? "#e5e7eb";
}

export function VariantSelector({
  productId,
  productName,
  productPrice,
  productCompareAtPrice,
  productQuantity,
  productImage,
  variants,
  initialVariantId,
  variantOptions = [],
  onVariantChange,
}: VariantSelectorProps) {
  const optionGroups = OPTION_KEYS.map((key, index) => {
    const definition = variantOptions.find((option) => option.position === index + 1);
    const values = definition?.values.map((value) => value.value) ?? getUniqueValues(variants, key);
    const metadata = new Map(definition?.values.map((value) => [value.value, value]) ?? []);
    return {
      key,
      index,
      label: definition?.name,
      labelKey: definition ? null : getOptionLabelKey(values),
      type: definition?.type,
      values,
      metadata,
    };
  }).filter((group) => group.values.length > 0);

  const initialVariant =
    variants.find((variant) => variant.id === initialVariantId) ??
    variants.find((variant) => variant.quantity > 0) ??
    variants[0] ??
    null;
  const [selectedOptions, setSelectedOptions] = useState<Record<OptionKey, string | null>>(() => ({
    option1: optionGroups[0] ? initialVariant?.option1 ?? optionGroups[0].values[0] : null,
    option2: optionGroups[1] ? initialVariant?.option2 ?? optionGroups[1].values[0] : null,
    option3: optionGroups[2] ? initialVariant?.option3 ?? optionGroups[2].values[0] : null,
  }));
  const t = useTranslations("variant");
  const tCommon = useTranslations("common");

  const selectedVariant = variants.find((variant) =>
    optionGroups.every((group) => variant[group.key] === selectedOptions[group.key]),
  ) ?? null;
  const activePrice = selectedVariant?.price ?? productPrice;
  const activeCompareAt = selectedVariant?.compareAtPrice ?? productCompareAtPrice;
  const activeQuantity = selectedVariant?.quantity ?? productQuantity;
  const activeImage = selectedVariant?.image ?? productImage;
  const requiresVariantSelection = variants.length > 0 && optionGroups.length > 0;
  const hasCompleteSelection = optionGroups.every((group) => selectedOptions[group.key]);
  const canAddToCart = activeQuantity > 0 && (!requiresVariantSelection || Boolean(selectedVariant && hasCompleteSelection));

  useEffect(() => {
    onVariantChange?.(selectedVariant);
  }, [onVariantChange, selectedVariant]);

  const discount =
    activeCompareAt && activeCompareAt > activePrice
      ? Math.round(((activeCompareAt - activePrice) / activeCompareAt) * 100)
      : null;

  return (
    <div className="space-y-6">
      {/* Price */}
      <div className="flex items-baseline gap-4">
        <span className="text-3xl font-bold tracking-tight">
          {tCommon("sar")} {activePrice.toFixed(2)}
        </span>
        {activeCompareAt && activeCompareAt > activePrice && (
          <span className="text-lg text-muted-foreground line-through">
            {tCommon("sar")} {activeCompareAt.toFixed(2)}
          </span>
        )}
        {discount && (
          <Badge className="bg-destructive text-destructive-foreground text-xs font-semibold hover:bg-destructive">
            {t("save", { percent: discount })}
          </Badge>
        )}
      </div>

      {/* Variant Selector */}
      {optionGroups.length > 0 && (
        <div className="space-y-4">
          {optionGroups.map((group, groupIndex) => (
            <div key={group.key} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">
                  {group.label ?? (group.labelKey ? t(group.labelKey) : t("optionNumber", { number: group.index + 1 }))}
                </p>
                {selectedOptions[group.key] && (
                  <span className="text-xs text-muted-foreground">{selectedOptions[group.key]}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {group.values.map((value) => {
                  const matchingVariants = variants.filter((variant) =>
                    variant[group.key] === value &&
                    optionGroups.slice(0, groupIndex).every((optionGroup) => {
                      const selectedValue = selectedOptions[optionGroup.key];
                      return !selectedValue || variant[optionGroup.key] === selectedValue;
                    }),
                  );
                  const hasMatchingVariant = matchingVariants.length > 0;
                  const isAvailable = matchingVariants.some((variant) => variant.quantity > 0);
                  const isSelected = selectedOptions[group.key] === value;
                  const isColorOption = group.type === "color" || group.labelKey === "color";
                  const unavailableReason = hasMatchingVariant ? t("outOfStock") : t("notAvailable");
                  const optionLabel = group.label ?? (group.labelKey ? t(group.labelKey) : t("optionNumber", { number: group.index + 1 }));
                  const colorHex = group.metadata.get(value)?.colorHex;

                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={!hasMatchingVariant || !isAvailable}
                      title={!hasMatchingVariant || !isAvailable ? unavailableReason : undefined}
                      onClick={() => {
                        setSelectedOptions((current) => {
                          const next = { ...current, [group.key]: value };

                          for (const optionGroup of optionGroups.slice(groupIndex + 1)) {
                            if (!next[optionGroup.key]) continue;
                            const optionGroupIndex = optionGroups.findIndex((item) => item.key === optionGroup.key);
                            const stillValid = variants.some((variant) =>
                              optionGroups.slice(0, optionGroupIndex + 1).every((validationGroup) => {
                                const selectedValue = next[validationGroup.key];
                                return !selectedValue || variant[validationGroup.key] === selectedValue;
                              }),
                            );
                            if (!stillValid) next[optionGroup.key] = null;
                          }

                          return next;
                        });
                      }}
                      className={
                        isColorOption
                          ? `group flex w-20 flex-col items-center gap-1.5 rounded-lg border p-2 text-xs font-medium transition-colors ${
                              isSelected ? "border-foreground bg-accent" : "border-transparent hover:border-border"
                            } ${!isAvailable ? "cursor-not-allowed opacity-45" : ""}`
                          : `min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                              isSelected
                                ? "border-foreground bg-foreground text-background"
                                : "border-border bg-background hover:bg-accent"
                            } ${!isAvailable ? "cursor-not-allowed opacity-40 line-through" : ""}`
                      }
                      aria-pressed={isSelected}
                      aria-label={t("selectOption", { option: optionLabel, value })}
                    >
                      {isColorOption ? (
                        <>
                          <span className="relative">
                            <span
                              className="block h-9 w-9 rounded-full border border-border shadow-sm ring-offset-background group-aria-pressed:ring-2 group-aria-pressed:ring-foreground group-aria-pressed:ring-offset-2"
                              style={{ backgroundColor: colorHex || getColorSwatch(value) }}
                              aria-hidden="true"
                            />
                            {!isAvailable && (
                              <span className="absolute left-1/2 top-1/2 h-10 w-px -translate-x-1/2 -translate-y-1/2 rotate-45 bg-destructive" />
                            )}
                          </span>
                          <span className="max-w-full truncate">{value}</span>
                          {!isAvailable && (
                            <span className="text-[10px] text-muted-foreground">{unavailableReason}</span>
                          )}
                        </>
                      ) : (
                        <>
                          {value}
                          {!isAvailable && <span className="sr-only"> - {unavailableReason}</span>}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stock */}
      <div className="flex items-center gap-3">
        {activeQuantity > 0 ? (
          <Badge variant="secondary" className="text-xs font-semibold px-3 py-1">
            {t("inStock")}
          </Badge>
        ) : (
          <Badge variant="destructive" className="text-xs font-semibold px-3 py-1">
            {t("outOfStock")}
          </Badge>
        )}
        {activeQuantity > 0 && activeQuantity <= 5 && (
          <span className="text-xs text-muted-foreground font-medium">
            {t("onlyLeft", { count: activeQuantity })}
          </span>
        )}
      </div>

      {/* Add to Cart */}
      <AddToCartButton
        product={{
          id: productId,
          name: productName,
          price: activePrice,
          image: activeImage,
          variantId: selectedVariant?.id,
          variantName: selectedVariant?.name,
          maxQuantity: activeQuantity,
        }}
        disabled={!canAddToCart}
      />
    </div>
  );
}
