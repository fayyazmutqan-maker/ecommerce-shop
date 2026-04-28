"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CreditCard, RotateCcw, ShieldCheck, ShoppingCart, Truck } from "lucide-react";
import { ProductImageGallery } from "@/components/store/product-image-gallery";
import { VariantSelector, type Variant } from "@/components/store/variant-selector";
import type { ProductVariantOption } from "@/lib/product-variant-options";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useCartStore } from "@/lib/store";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface ImageData {
  url: string;
  alt?: string | null;
}

interface ProductDetailPurchaseProps {
  product: {
    id: string;
    name: string;
    price: number;
    compareAtPrice: number | null;
    quantity: number;
    image: string;
    sku: string | null;
    productType: string | null;
    tags: string | null;
  };
  images: ImageData[];
  variants: Variant[];
  variantOptions: ProductVariantOption[];
  beforeSelector: ReactNode;
}

export function ProductDetailPurchase({
  product,
  images,
  variants,
  variantOptions,
  beforeSelector,
}: ProductDetailPurchaseProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const addItem = useCartStore((state) => state.addItem);
  const tProduct = useTranslations("product");
  const tCommon = useTranslations("common");
  const initialVariantId = searchParams.get("variant");
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
    () => variants.find((variant) => variant.id === initialVariantId) ?? null,
  );
  const activeImageUrl = selectedVariant?.image ?? null;
  const activePrice = selectedVariant?.price ?? product.price;
  const activeQuantity = selectedVariant?.quantity ?? product.quantity;
  const activeImage = selectedVariant?.image ?? product.image;
  const requiresVariantSelection = variants.length > 0;
  const canAddToCart = activeQuantity > 0 && (!requiresVariantSelection || Boolean(selectedVariant));

  const galleryImages = useMemo(() => {
    const selectedColorImages = selectedVariant?.option1
      ? variants
          .filter((variant) => variant.option1 === selectedVariant.option1 && variant.image)
          .map((variant) => ({ url: variant.image as string, alt: variant.name }))
      : [];
    const uniqueColorImages = selectedColorImages.filter(
      (image, index, list) => list.findIndex((item) => item.url === image.url) === index,
    );

    if (!activeImageUrl && uniqueColorImages.length === 0) {
      return images;
    }

    const activeImage = activeImageUrl
      ? images.find((image) => image.url === activeImageUrl) ??
        uniqueColorImages.find((image) => image.url === activeImageUrl) ?? {
          url: activeImageUrl,
          alt: selectedVariant?.name ?? product.name,
        }
      : null;
    const variantImages = activeImage
      ? [activeImage, ...uniqueColorImages.filter((image) => image.url !== activeImage.url)]
      : uniqueColorImages;
    const variantImageUrls = new Set(variantImages.map((image) => image.url));

    return [...variantImages, ...images.filter((image) => !variantImageUrls.has(image.url))];
  }, [activeImageUrl, images, product.name, selectedVariant, variants]);

  const handleVariantChange = useCallback((variant: Variant | null) => {
    setSelectedVariant(variant);
  }, []);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (selectedVariant) {
      nextParams.set("variant", selectedVariant.id);
    } else {
      nextParams.delete("variant");
    }

    const nextQuery = nextParams.toString();
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    const currentUrl = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
    if (nextUrl !== currentUrl) {
      router.replace(nextUrl, { scroll: false });
    }
  }, [pathname, router, searchParams, selectedVariant]);

  const handleStickyAddToCart = () => {
    if (!canAddToCart) return;
    addItem({
      id: selectedVariant?.id || product.id,
      productId: product.id,
      name: product.name,
      price: activePrice,
      quantity: 1,
      image: activeImage,
      variantId: selectedVariant?.id,
      variantName: selectedVariant?.name,
      maxQuantity: activeQuantity,
    });
    toast.success(
      tProduct("addedToCart", {
        name: product.name + (selectedVariant?.name ? ` (${selectedVariant.name})` : ""),
      }),
    );
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
        <ProductImageGallery
          key={activeImageUrl ?? "default-product-gallery"}
          images={galleryImages}
          productId={product.id}
        />

        <div className="space-y-7">
          {beforeSelector}

          <VariantSelector
            productId={product.id}
            productName={product.name}
            productPrice={product.price}
            productCompareAtPrice={product.compareAtPrice}
            productQuantity={product.quantity}
            productImage={product.image}
            variants={variants}
            variantOptions={variantOptions}
            initialVariantId={initialVariantId}
            onVariantChange={handleVariantChange}
          />

          <div className="grid grid-cols-2 gap-3 text-sm">
            {(selectedVariant?.sku || product.sku) && (
              <div>
                <span className="text-muted-foreground">SKU:</span>{" "}
                <span className="font-medium">{selectedVariant?.sku || product.sku}</span>
              </div>
            )}
            {product.productType && (
              <div>
                <span className="text-muted-foreground">Type:</span>{" "}
                <span className="font-medium">{product.productType}</span>
              </div>
            )}
            {product.tags && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Tags:</span>{" "}
                <span className="font-medium">{product.tags}</span>
              </div>
            )}
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span>{tProduct("deliveryEstimate")}</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
              <span>{tProduct("returnsWindow")}</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              <span>{tProduct("secureCheckout")}</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span>{tProduct("paymentOptions")}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 shadow-lg backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{selectedVariant?.name || product.name}</p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold">
                {tCommon("sar")} {activePrice.toFixed(2)}
              </span>
              {activeQuantity > 0 ? (
                <Badge variant="secondary" className="h-5 px-2 text-[10px]">
                  {tProduct("inStock")}
                </Badge>
              ) : (
                <Badge variant="destructive" className="h-5 px-2 text-[10px]">
                  {tProduct("outOfStock")}
                </Badge>
              )}
            </div>
          </div>
          <Button className="h-11 px-4" disabled={!canAddToCart} onClick={handleStickyAddToCart}>
            <ShoppingCart className="me-2 h-4 w-4" />
            {tProduct("addToCart")}
          </Button>
        </div>
      </div>
    </>
  );
}
