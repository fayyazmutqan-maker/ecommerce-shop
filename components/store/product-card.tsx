"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useCartStore } from "@/lib/store";
import { toast } from "sonner";

interface ProductCardProps {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number | null;
  images: string[];
  category?: string | null;
  isNew?: boolean;
  cardRatio?: "square" | "portrait" | "landscape" | "wide";
  showAddToCart?: boolean;
  showWishlist?: boolean;
  showBadges?: boolean;
}

export function ProductCard({
  id,
  name,
  slug,
  price,
  compareAtPrice,
  images,
  category,
  isNew,
  cardRatio = "portrait",
  showAddToCart = true,
  showWishlist = true,
  showBadges = true,
}: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const discount =
    compareAtPrice && compareAtPrice > price
      ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
      : null;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({
      id,
      name,
      price,
      quantity: 1,
      image: images[0] || "",
    });
    toast.success(`${name} added to cart`);
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: id }),
      });
      if (res.status === 401) {
        toast.error("Please sign in to add items to your wishlist");
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to update wishlist");
        return;
      }
      const data = await res.json();
      toast.success(data.removed ? "Removed from wishlist" : "Added to wishlist");
    } catch {
      toast.error("Failed to update wishlist");
    }
  };

  const RATIO_CLASS: Record<string, string> = {
    square: "aspect-square",
    portrait: "aspect-[4/5]",
    landscape: "aspect-[5/4]",
    wide: "aspect-[16/9]",
  };

  return (
    <Card className="group overflow-hidden border hover:border-foreground/20 shadow-none hover:shadow-lg transition-all duration-300 rounded-xl">
      <Link href={`/products/${slug}`}>
        <div className={`relative ${RATIO_CLASS[cardRatio] || RATIO_CLASS.portrait} overflow-hidden bg-accent/50`}>
          {images[0] ? (
            <Image
              src={images[0]}
              alt={name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-muted-foreground/40">
              <ShoppingCart className="h-10 w-10" />
            </div>
          )}
          {/* Badges */}
          {showBadges && (
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {isNew && (
              <Badge className="bg-foreground text-background text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 hover:bg-foreground">
                New
              </Badge>
            )}
            {discount && (
              <Badge className="bg-destructive text-destructive-foreground text-[10px] font-semibold px-2.5 py-1 hover:bg-destructive">
                -{discount}%
              </Badge>
            )}
          </div>
          )}
          {/* Wishlist */}
          {showWishlist && (
          <div className="absolute top-3 right-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-300 translate-y-0 lg:translate-y-1 lg:group-hover:translate-y-0">
            <Button
              variant="secondary"
              size="icon"
              className="h-10 w-10 lg:h-9 lg:w-9 rounded-full shadow-md bg-background/90 backdrop-blur-sm hover:bg-background"
              onClick={handleWishlist}
            >
              <Heart className="h-4 w-4" />
            </Button>
          </div>
          )}
          {/* Quick Add */}
          {showAddToCart && (
          <div className="absolute bottom-0 left-0 right-0 p-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-300 translate-y-0 lg:translate-y-2 lg:group-hover:translate-y-0">
            <Button
              className="w-full h-10 text-sm font-medium shadow-lg"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Add to Cart
            </Button>
          </div>
          )}
        </div>
      </Link>
      <CardContent className="p-4 space-y-1.5">
        {category && (
          <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-medium">
            {category}
          </p>
        )}
        <Link href={`/products/${slug}`}>
          <h3 className="text-sm font-semibold line-clamp-1 group-hover:text-muted-foreground transition-colors">
            {name}
          </h3>
        </Link>
        <div className="flex items-center gap-2 pt-0.5">
          <span className="text-[15px] font-bold">SAR {price.toFixed(2)}</span>
          {compareAtPrice && compareAtPrice > price && (
            <span className="text-xs text-muted-foreground line-through">
              SAR {compareAtPrice.toFixed(2)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
