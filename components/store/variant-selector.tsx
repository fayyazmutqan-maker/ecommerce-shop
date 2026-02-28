"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { AddToCartButton } from "@/components/store/add-to-cart-button";

interface Variant {
  id: string;
  name: string;
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
}

export function VariantSelector({
  productId,
  productName,
  productPrice,
  productCompareAtPrice,
  productQuantity,
  productImage,
  variants,
}: VariantSelectorProps) {
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);

  const activePrice = selectedVariant?.price ?? productPrice;
  const activeCompareAt = selectedVariant?.compareAtPrice ?? productCompareAtPrice;
  const activeQuantity = selectedVariant?.quantity ?? productQuantity;
  const activeImage = selectedVariant?.image ?? productImage;

  const discount =
    activeCompareAt && activeCompareAt > activePrice
      ? Math.round(((activeCompareAt - activePrice) / activeCompareAt) * 100)
      : null;

  return (
    <div className="space-y-6">
      {/* Price */}
      <div className="flex items-baseline gap-4">
        <span className="text-3xl font-bold tracking-tight">
          SAR {activePrice.toFixed(2)}
        </span>
        {activeCompareAt && activeCompareAt > activePrice && (
          <span className="text-lg text-muted-foreground line-through">
            SAR {activeCompareAt.toFixed(2)}
          </span>
        )}
        {discount && (
          <Badge className="bg-destructive text-destructive-foreground text-xs font-semibold hover:bg-destructive">
            Save {discount}%
          </Badge>
        )}
      </div>

      {/* Variant Selector */}
      {variants.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold">Options</p>
          <div className="flex flex-wrap gap-2">
            {variants.map((variant) => (
              <Badge
                key={variant.id}
                variant={selectedVariant?.id === variant.id ? "default" : "outline"}
                className={`cursor-pointer px-4 py-2 text-sm font-medium transition-colors ${
                  selectedVariant?.id === variant.id
                    ? "bg-foreground text-background"
                    : "hover:bg-accent"
                } ${variant.quantity <= 0 ? "opacity-50 line-through" : ""}`}
                onClick={() => {
                  if (variant.quantity > 0) {
                    setSelectedVariant(
                      selectedVariant?.id === variant.id ? null : variant
                    );
                  }
                }}
              >
                {variant.name}
                {variant.price !== productPrice && (
                  <> — SAR {variant.price.toFixed(2)}</>
                )}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Stock */}
      <div className="flex items-center gap-3">
        {activeQuantity > 0 ? (
          <Badge variant="secondary" className="text-xs font-semibold px-3 py-1">
            In Stock
          </Badge>
        ) : (
          <Badge variant="destructive" className="text-xs font-semibold px-3 py-1">
            Out of Stock
          </Badge>
        )}
        {activeQuantity > 0 && activeQuantity <= 5 && (
          <span className="text-xs text-muted-foreground font-medium">
            Only {activeQuantity} left
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
        disabled={activeQuantity <= 0}
      />
    </div>
  );
}
