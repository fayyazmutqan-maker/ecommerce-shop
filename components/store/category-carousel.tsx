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

interface Category {
  id: string;
  name: string;
  slug: string;
  image: string | null;
}

interface CategoryCarouselProps {
  categories: Category[];
}

export function CategoryCarousel({ categories }: CategoryCarouselProps) {
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
            className="pl-4 basis-[45%] sm:basis-[35%] md:basis-[28%] lg:basis-[16.666%]"
          >
            <Link href={`/collections/${cat.slug}`} className="block">
              <Card className="group overflow-hidden border hover:border-foreground/20 hover:shadow-lg transition-all duration-300 shadow-none">
                <div className="aspect-square bg-accent relative overflow-hidden">
                  {cat.image ? (
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-accent to-muted">
                      <span className="text-3xl font-bold text-muted-foreground/30">
                        {cat.name[0]}
                      </span>
                    </div>
                  )}
                </div>
                <CardContent className="p-4 text-center">
                  <p className="text-sm font-semibold">{cat.name}</p>
                </CardContent>
              </Card>
            </Link>
          </CarouselItem>
        ))}
      </CarouselContent>

      {/* Navigation arrows — hidden on touch devices, visible on hover for desktop */}
      <CarouselPrevious className="hidden md:flex -left-4 h-10 w-10 border shadow-md bg-background/90 backdrop-blur-sm hover:bg-background" />
      <CarouselNext className="hidden md:flex -right-4 h-10 w-10 border shadow-md bg-background/90 backdrop-blur-sm hover:bg-background" />
    </Carousel>
  );
}
