"use client";

import { ProductCard } from "./product-card";

interface ProductData {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number | null;
  images: string[];
  category?: string | null;
  isNew?: boolean;
}

const COLS_CLASS: Record<number, string> = {
  1: "grid-cols-1 md:grid-cols-1 lg:grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2 lg:grid-cols-2",
  3: "grid-cols-2 md:grid-cols-3 lg:grid-cols-3",
  4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
  5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
  6: "grid-cols-2 md:grid-cols-4 lg:grid-cols-6",
};

const GAP_CLASS: Record<string, string> = {
  tight: "gap-3 md:gap-4",
  normal: "gap-5 md:gap-6",
  loose: "gap-7 md:gap-8",
};

export interface ProductGridLayout {
  columns?: number;
  gap?: "tight" | "normal" | "loose";
  cardRatio?: "square" | "portrait" | "landscape" | "wide";
  showAddToCart?: boolean;
  showWishlist?: boolean;
  showBadges?: boolean;
}

export function ProductCardGrid({
  products,
  layout,
}: {
  products: ProductData[];
  layout?: ProductGridLayout;
}) {
  const cols = layout?.columns || 4;
  const gap = layout?.gap || "normal";
  const colsClass = COLS_CLASS[cols] || COLS_CLASS[4];
  const gapClass = GAP_CLASS[gap] || GAP_CLASS.normal;

  return (
    <div className={`grid ${colsClass} ${gapClass}`}>
      {products.map((product) => (
        <ProductCard
          key={product.id}
          {...product}
          cardRatio={layout?.cardRatio}
          showAddToCart={layout?.showAddToCart}
          showWishlist={layout?.showWishlist}
          showBadges={layout?.showBadges}
        />
      ))}
    </div>
  );
}
