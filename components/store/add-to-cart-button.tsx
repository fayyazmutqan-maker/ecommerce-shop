"use client";

import { useState } from "react";
import { ShoppingCart, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/store";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface AddToCartButtonProps {
  product: {
    id: string;
    name: string;
    price: number;
    image: string;
    variantId?: string;
    variantName?: string;
    maxQuantity?: number;
  };
  disabled?: boolean;
}

export function AddToCartButton({ product, disabled }: AddToCartButtonProps) {
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((state) => state.addItem);
  const t = useTranslations("product");

  const maxQty = product.maxQuantity || 9999;

  const handleAddToCart = () => {
    addItem({
      id: product.variantId || product.id,
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      image: product.image,
      variantId: product.variantId,
      variantName: product.variantName,
      maxQuantity: product.maxQuantity,
    });
    toast.success(t("addedToCart", { name: product.name + (product.variantName ? ` (${product.variantName})` : "") }));
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center border rounded-lg">
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-r-none"
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          disabled={disabled}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-14 text-center text-sm font-semibold">
          {quantity}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-l-none"
          onClick={() => setQuantity((q) => Math.min(q + 1, maxQty))}
          disabled={disabled}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <Button
        className="flex-1 h-12 text-[15px] font-semibold"
        onClick={handleAddToCart}
        disabled={disabled}
      >
        <ShoppingCart className="h-4 w-4 mr-2" />
        {disabled ? t("outOfStock") : t("addToCart")}
      </Button>
    </div>
  );
}
