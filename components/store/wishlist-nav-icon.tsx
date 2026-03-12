"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWishlist } from "@/hooks/use-wishlist";

export function WishlistNavIcon() {
  const { count } = useWishlist();
  const hasItems = count > 0;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-10 w-10 text-muted-foreground hover:text-foreground relative"
      asChild
    >
      <Link href="/account/wishlist">
        <Heart
          className={`h-[18px] w-[18px] transition-colors ${hasItems ? "fill-red-500 text-red-500" : ""}`}
        />
        {hasItems && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center px-1">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </Link>
    </Button>
  );
}
