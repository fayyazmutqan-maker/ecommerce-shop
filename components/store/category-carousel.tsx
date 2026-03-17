"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useTranslations } from "next-intl";

interface Category {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  _count?: { products: number };
}

export interface CategoryGridLayout {
  display?: "carousel" | "grid";
  columns?: number;
  gap?: "tight" | "normal" | "loose";
  cardRatio?: "square" | "portrait" | "circle";
  showImage?: boolean;
  showCount?: boolean;
}

interface CategoryCarouselProps {
  categories: Category[];
  layout?: CategoryGridLayout;
}

const COLS_CLASS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 md:grid-cols-3",
  4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
  5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
  6: "grid-cols-2 md:grid-cols-4 lg:grid-cols-6",
};

const GAP_CLASS: Record<string, string> = {
  tight: "gap-3 md:gap-4",
  normal: "gap-5 md:gap-6",
  loose: "gap-7 md:gap-8",
};

const RATIO_CLASS: Record<string, string> = {
  square: "aspect-square",
  portrait: "aspect-[3/4]",
  circle: "aspect-square rounded-full",
};

const BASIS_CLASS: Record<number, string> = {
  2: "basis-[48%] sm:basis-[48%] md:basis-[48%] lg:basis-[48%]",
  3: "basis-[45%] sm:basis-[40%] md:basis-[32%] lg:basis-[32%]",
  4: "basis-[45%] sm:basis-[35%] md:basis-[28%] lg:basis-[24%]",
  5: "basis-[45%] sm:basis-[35%] md:basis-[22%] lg:basis-[19%]",
  6: "basis-[45%] sm:basis-[35%] md:basis-[28%] lg:basis-[16.666%]",
};

function CategoryCard({ cat, layout }: { cat: Category; layout: CategoryGridLayout }) {
  const t = useTranslations("product");
  const showImage = layout.showImage !== false;
  const showCount = layout.showCount === true;
  const ratio = layout.cardRatio || "square";
  const isCircle = ratio === "circle";

  return (
    <Link href={`/collections/${cat.slug}`} className="block">
      <Card className="group overflow-hidden border hover:border-foreground/20 hover:shadow-lg transition-all duration-300 shadow-none">
        {showImage && (
          <div className={`${RATIO_CLASS[ratio] || RATIO_CLASS.square} bg-accent relative overflow-hidden ${isCircle ? "mx-4 mt-4" : ""}`}>
            {cat.image ? (
              <img
                src={cat.image}
                alt={cat.name}
                className={`h-full w-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out ${isCircle ? "rounded-full" : ""}`}
              />
            ) : (
              <div className={`h-full w-full flex items-center justify-center bg-gradient-to-br from-accent to-muted ${isCircle ? "rounded-full" : ""}`}>
                <span className="text-3xl font-bold text-muted-foreground/30">
                  {cat.name[0]}
                </span>
              </div>
            )}
          </div>
        )}
        <CardContent className="p-4 text-center">
          <p className="text-sm font-semibold">{cat.name}</p>
          {showCount && cat._count && (
            <p className="text-xs text-muted-foreground mt-0.5">{t("productCount", { count: cat._count.products })}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export function CategoryCarousel({ categories, layout = {} }: CategoryCarouselProps) {
  const display = layout.display || "carousel";
  const cols = layout.columns || 6;
  const gap = layout.gap || "normal";

  if (display === "grid") {
    return (
      <div className={`grid ${COLS_CLASS[cols] || COLS_CLASS[4]} ${GAP_CLASS[gap] || GAP_CLASS.normal}`}>
        {categories.map((cat) => (
          <CategoryCard key={cat.id} cat={cat} layout={layout} />
        ))}
      </div>
    );
  }

  return (
    <Carousel
      opts={{
        align: "start",
        loop: true,
        dragFree: true,
        slidesToScroll: 1,
      }}
      className="w-full"
    >
      <CarouselContent className="-ml-4">
        {categories.map((cat) => (
          <CarouselItem
            key={cat.id}
            className={`pl-4 ${BASIS_CLASS[cols] || BASIS_CLASS[6]}`}
          >
            <CategoryCard cat={cat} layout={layout} />
          </CarouselItem>
        ))}
      </CarouselContent>

      {/* Navigation arrows — hidden on touch devices, visible on hover for desktop */}
      <CarouselPrevious className="hidden md:flex -left-4 h-10 w-10 border shadow-md bg-background/90 backdrop-blur-sm hover:bg-background" />
      <CarouselNext className="hidden md:flex -right-4 h-10 w-10 border shadow-md bg-background/90 backdrop-blur-sm hover:bg-background" />
    </Carousel>
  );
}
