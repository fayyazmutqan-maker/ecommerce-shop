export type ProductVariantOptionType = "color" | "size" | "text";

export interface ProductVariantOptionValue {
  value: string;
  label?: string;
  colorHex?: string;
}

export interface ProductVariantOption {
  name: string;
  type: ProductVariantOptionType;
  position: 1 | 2 | 3;
  values: ProductVariantOptionValue[];
}

export function inferVariantOptionType(name: string): ProductVariantOptionType {
  const normalized = name.trim().toLowerCase();
  if (normalized === "color" || normalized === "colour") return "color";
  if (normalized === "size") return "size";
  return "text";
}

export function normalizeVariantOptions(options: ProductVariantOption[]) {
  return options
    .slice(0, 3)
    .map((option, index) => ({
      name: option.name.trim(),
      type: option.type || inferVariantOptionType(option.name),
      position: (index + 1) as 1 | 2 | 3,
      values: option.values
        .map((value) => ({
          value: value.value.trim(),
          label: value.label?.trim() || undefined,
          colorHex: value.colorHex?.trim() || undefined,
        }))
        .filter((value) => value.value),
    }))
    .filter((option) => option.name && option.values.length > 0);
}
