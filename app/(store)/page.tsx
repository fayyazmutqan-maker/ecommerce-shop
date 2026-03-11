import Link from "next/link";
import {
  ArrowRight,
  Truck,
  RotateCcw,
  ShieldCheck,
  Headphones,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { NewsletterForm } from "@/components/store/newsletter-form";
import { db } from "@/lib/db";
import { products, categories as categoriesTable, storeSettings, productImages } from "@/lib/schema";
import { eq, desc, asc, and, isNull } from "drizzle-orm";
import { getLocale } from "next-intl/server";
import { applyTranslationsBatch } from "@/lib/translations";
import { ProductCardGrid } from "@/components/store/product-card-grid";
import { CategoryCarousel } from "@/components/store/category-carousel";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [rawFeatured, rawCategories, settings] = await Promise.all([
    db.query.products.findMany({
      where: and(eq(products.status, "ACTIVE"), eq(products.isFeatured, true)),
      with: { images: { orderBy: [asc(productImages.position)] } },
      limit: 8,
      orderBy: [desc(products.createdAt)],
    }),
    db.query.categories.findMany({
      where: and(eq(categoriesTable.isActive, true), isNull(categoriesTable.parentId)),
      orderBy: [asc(categoriesTable.sortOrder)],
      limit: 12,
    }),
    db.query.storeSettings.findFirst(),
  ]);

  const rawNewArrivals = await db.query.products.findMany({
    where: eq(products.status, "ACTIVE"),
    with: { images: { orderBy: [asc(productImages.position)] } },
    limit: 4,
    orderBy: [desc(products.createdAt)],
  });

  // Apply locale translations
  const locale = await getLocale();
  const featuredProducts = await applyTranslationsBatch("product", rawFeatured as Record<string, unknown>[], locale) as typeof rawFeatured;
  const categories = await applyTranslationsBatch("category", rawCategories as Record<string, unknown>[], locale) as typeof rawCategories;
  const newArrivals = await applyTranslationsBatch("product", rawNewArrivals as Record<string, unknown>[], locale) as typeof rawNewArrivals;

  const storeName = settings?.storeName || "ShopFlow";

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-accent/60 via-background to-background">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-24 lg:py-36">
          <div className="max-w-2xl space-y-8">
            <Badge
              variant="secondary"
              className="px-4 py-1.5 text-xs font-semibold tracking-wide uppercase"
            >
              New Collection 2026
            </Badge>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08]">
              Discover Your
              <br />
              <span className="text-muted-foreground">Perfect Style</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
              Curated collections with exceptional quality craftsmanship.
              Free shipping on orders over SAR 200.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Button size="lg" className="h-12 px-8 text-[15px]" asChild>
                <Link href="/products">
                  Shop Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8 text-[15px]"
                asChild
              >
                <Link href="/collections">Browse Collections</Link>
              </Button>
            </div>
          </div>
        </div>
        {/* Decorative element */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-[radial-gradient(ellipse_at_80%_20%,var(--accent),transparent_70%)] opacity-40 pointer-events-none" />
      </section>

      {/* Trust Bar */}
      <section className="border-y bg-card">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4">
            {/* eslint-disable-next-line @typescript-eslint/no-unused-vars */}
            {[
              {
                icon: Truck,
                title: "Free Shipping",
                desc: "On orders over SAR 200",
              },
              {
                icon: RotateCcw,
                title: "Easy Returns",
                desc: "30-day return policy",
              },
              {
                icon: ShieldCheck,
                title: "Secure Payments",
                desc: "256-bit SSL encryption",
              },
              {
                icon: Headphones,
                title: "24/7 Support",
                desc: "Dedicated help center",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="flex items-center gap-4 py-4 px-3 sm:py-6 sm:px-6 border-b lg:border-b-0 lg:border-l lg:first:border-l-0"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                  <feature.icon className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{feature.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {feature.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      {categories.length > 0 && (
        <section className="py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="flex items-end justify-between mb-12">
              <div>
                <p className="text-sm font-semibold text-muted-foreground tracking-wide uppercase mb-2">
                  Browse
                </p>
                <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
                  Shop by Category
                </h2>
              </div>
              <Button variant="ghost" className="text-sm font-medium" asChild>
                <Link href="/collections">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <CategoryCarousel categories={categories} />
          </div>
        </section>
      )}

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="py-20 lg:py-24 bg-accent/30">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="flex items-end justify-between mb-12">
              <div>
                <p className="text-sm font-semibold text-muted-foreground tracking-wide uppercase mb-2">
                  Curated
                </p>
                <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
                  Featured Products
                </h2>
              </div>
              <Button variant="ghost" className="text-sm font-medium" asChild>
                <Link href="/products?featured=true">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <ProductCardGrid
              products={featuredProducts.map((p) => ({
                id: p.id,
                name: p.name,
                slug: p.slug,
                price: Number(p.price),
                compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
                images: p.images.map((i) => i.url),
                isNew: false,
              }))}
            />
          </div>
        </section>
      )}

      {/* Promo Banner */}
      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="relative rounded-2xl bg-foreground text-background overflow-hidden">
            <div className="relative z-10 px-8 py-16 md:px-16 md:py-20 max-w-xl">
              <p className="text-sm font-semibold tracking-wide uppercase opacity-70 mb-4">
                Limited Time
              </p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
                Summer Sale
                <br />
                Up to 50% Off
              </h2>
              <p className="mt-4 text-base opacity-70 leading-relaxed max-w-md">
                Don&apos;t miss our biggest sale of the year. Thousands of items
                at unbeatable prices.
              </p>
              <Button
                size="lg"
                variant="secondary"
                className="mt-8 h-12 px-8 text-[15px]"
                asChild
              >
                <Link href="/products?sale=true">Shop the Sale</Link>
              </Button>
            </div>
            <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_70%_50%,rgba(255,255,255,0.08),transparent_70%)]" />
          </div>
        </div>
      </section>

      {/* New Arrivals */}
      {newArrivals.length > 0 && (
        <section className="py-20 lg:py-24 bg-accent/30">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="flex items-end justify-between mb-12">
              <div>
                <p className="text-sm font-semibold text-muted-foreground tracking-wide uppercase mb-2">
                  Just Dropped
                </p>
                <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
                  New Arrivals
                </h2>
              </div>
              <Button variant="ghost" className="text-sm font-medium" asChild>
                <Link href="/products?sort=newest">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <ProductCardGrid
              products={newArrivals.map((p) => ({
                id: p.id,
                name: p.name,
                slug: p.slug,
                price: Number(p.price),
                compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
                images: p.images.map((i) => i.url),
                isNew: true,
              }))}
            />
          </div>
        </section>
      )}

      {/* Newsletter */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-xl text-center">
            <p className="text-sm font-semibold text-muted-foreground tracking-wide uppercase mb-3">
              Stay Updated
            </p>
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">
              Join Our Newsletter
            </h2>
            <p className="text-muted-foreground mt-4 text-base leading-relaxed">
              Subscribe for exclusive deals, early access to new arrivals, and
              insider-only discounts.
            </p>
            <div className="flex gap-3 mt-8 max-w-md mx-auto">
              <NewsletterForm />
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              No spam, unsubscribe at any time.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
