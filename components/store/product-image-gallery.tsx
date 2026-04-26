"use client";

import { useState } from "react";
import Image from "next/image";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { useWishlist } from "@/hooks/use-wishlist";
import { toast } from "sonner";

interface ImageData {
  url: string;
  alt?: string | null;
}

interface ProductImageGalleryProps {
  images: ImageData[];
  productId?: string;
}

export function ProductImageGallery({ images, productId }: ProductImageGalleryProps) {
  const [selected, setSelected] = useState(0);
  const t = useTranslations("common");
  const tWishlist = useTranslations("wishlist");
  const { has: isWishlisted, toggle: toggleWishlist } = useWishlist();
  const inWishlist = productId ? isWishlisted(productId) : false;

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!productId) return;
    const result = await toggleWishlist(productId);
    if (result === null) {
      toast.error(tWishlist("signInRequired"));
      return;
    }
    toast.success(result ? tWishlist("added") : tWishlist("removed"));
  };

  if (images.length === 0) {
    return (
      <div className="aspect-square rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
        {t("noImageAvailable")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main image */}
      <div className="aspect-square rounded-xl overflow-hidden bg-accent/50 relative group">
        <Image
          src={images[selected]?.url}
          alt={images[selected]?.alt || "Product image"}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
          priority
        />
        {productId && (
          <div className="absolute top-4 right-4 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-300">
            <Button
              variant="secondary"
              size="icon"
              className="h-10 w-10 rounded-full shadow-md bg-background/90 backdrop-blur-sm hover:bg-background"
              onClick={handleWishlist}
            >
              <Heart className={`h-4 w-4 transition-colors ${inWishlist ? "fill-red-500 text-red-500" : ""}`} />
            </Button>
          </div>
        )}
      </div>
      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setSelected(idx)}
              className={cn(
                "h-20 w-20 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all duration-200 relative",
                selected === idx
                  ? "border-foreground ring-1 ring-foreground/10"
                  : "border-transparent opacity-60 hover:opacity-100"
              )}
            >
              <Image
                src={img.url}
                alt={img.alt || `Thumbnail ${idx + 1}`}
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
