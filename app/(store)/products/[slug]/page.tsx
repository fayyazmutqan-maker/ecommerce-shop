import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { products, productImages, productVariants, productCategories, reviews, productBundles } from "@/lib/schema";
import { eq, desc, asc, and, inArray } from "drizzle-orm";
import { getLocale } from "next-intl/server";
import { applyTranslations, applyTranslationsBatch } from "@/lib/translations";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductCardGrid } from "@/components/store/product-card-grid";
import { ProductImageGallery } from "@/components/store/product-image-gallery";
import { VariantSelector } from "@/components/store/variant-selector";
import { ReviewForm } from "@/components/store/review-form";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const rawProduct = await db.query.products.findFirst({
    where: and(eq(products.slug, slug), eq(products.status, "ACTIVE")),
    with: { images: { orderBy: [asc(productImages.position)], limit: 1 } },
  });

  if (!rawProduct) {
    return { title: "Product Not Found" };
  }

  const product = {
    ...rawProduct,
    price: Number(rawProduct.price),
    compareAtPrice: rawProduct.compareAtPrice ? Number(rawProduct.compareAtPrice) : null,
  };

  const title = product.seoTitle || product.name;
  const description =
    product.seoDescription ||
    product.shortDescription ||
    product.description?.slice(0, 160) ||
    `Buy ${product.name} for SAR ${product.price.toFixed(2)}`;

  return {
    title: `${title} | ShopFlow`,
    description,
    alternates: {
      canonical: `/products/${slug}`,
    },
    openGraph: {
      title,
      description,
      type: "website",
      images: product.images[0]
        ? [{ url: product.images[0].url, alt: product.name }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: product.images[0] ? [product.images[0].url] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;

  const rawProduct = await db.query.products.findFirst({
    where: eq(products.slug, slug),
    with: {
      images: { orderBy: [asc(productImages.position)] },
      variants: { where: eq(productVariants.isActive, true) },
      categories: { with: { category: true } },
      bundleItems: {
        with: {
          child: {
            with: { images: { orderBy: [asc(productImages.position)], limit: 1 } },
          },
        },
      },
      reviews: {
        with: { user: { columns: { name: true, image: true } } },
        orderBy: [desc(reviews.createdAt)],
        limit: 10,
      },
    },
  });

  if (!rawProduct || rawProduct.status !== "ACTIVE") {
    notFound();
  }

  const productBase = {
    ...rawProduct,
    price: Number(rawProduct.price),
    compareAtPrice: rawProduct.compareAtPrice ? Number(rawProduct.compareAtPrice) : null,
    variants: rawProduct.variants.map((v) => ({
      ...v,
      price: Number(v.price),
      compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null,
    })),
  };

  // Get related products from same categories
  const categoryIds = productBase.categories.map((c) => c.categoryId);
  const relatedIds = categoryIds.length > 0
    ? await db
        .select({ id: productCategories.productId })
        .from(productCategories)
        .where(inArray(productCategories.categoryId, categoryIds))
    : [];
  const uniqueIds = [...new Set(relatedIds.map((r) => r.id))].filter((id) => id !== productBase.id);

  const relatedRaw = uniqueIds.length > 0
    ? await db.query.products.findMany({
        where: and(
          eq(products.status, "ACTIVE"),
          inArray(products.id, uniqueIds),
        ),
        with: { images: { orderBy: [asc(productImages.position)] } },
        limit: 4,
      })
    : [];

  // Apply locale translations to dynamic content
  const locale = await getLocale();
  const product = await applyTranslations("product", productBase, locale);
  const relatedProducts = await applyTranslationsBatch(
    "product",
    relatedRaw.map((p) => ({ ...p, price: Number(p.price), compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null })),
    locale
  );

  const avgRating =
    product.reviews.length > 0
      ? product.reviews.reduce((sum, r) => sum + r.rating, 0) /
        product.reviews.length
      : 0;

  const discount =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(
          ((product.compareAtPrice - product.price) / product.compareAtPrice) *
            100
        )
      : null;

  // JSON-LD Product structured data for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription || product.description || "",
    image: product.images.map((i) => i.url),
    sku: product.sku || undefined,
    brand: product.vendor ? { "@type": "Brand", name: product.vendor } : undefined,
    offers: {
      "@type": "Offer",
      url: `https://shopflow.sa/products/${product.slug}`,
      priceCurrency: "SAR",
      price: product.price.toFixed(2),
      availability:
        product.quantity > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      ...(product.compareAtPrice &&
        product.compareAtPrice > product.price && {
          priceValidUntil: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString().split("T")[0],
        }),
    },
    ...(product.reviews.length > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: avgRating.toFixed(1),
        reviewCount: product.reviews.length,
      },
    }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-10 lg:py-14">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-10">
        <Link href="/" className="hover:text-foreground transition-colors">
          Home
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <Link
          href="/products"
          className="hover:text-foreground transition-colors"
        >
          Products
        </Link>
        {product.categories[0] && (
          <>
            <span className="text-muted-foreground/40">/</span>
            <Link
              href={`/collections/${product.categories[0].category.slug}`}
              className="hover:text-foreground transition-colors"
            >
              {product.categories[0].category.name}
            </Link>
          </>
        )}
        <span className="text-muted-foreground/40">/</span>
        <span className="text-foreground font-medium truncate max-w-[200px]">
          {product.name}
        </span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
        {/* Image Gallery */}
        <ProductImageGallery
          images={product.images.map((i) => ({ url: i.url, alt: i.alt }))}
        />

        {/* Product Info */}
        <div className="space-y-7">
          <div>
            {product.categories[0] && (
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">
                {product.categories[0].category.name}
              </p>
            )}
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
              {product.name}
            </h1>
            {product.vendor && (
              <p className="text-sm text-muted-foreground mt-2">
                by {product.vendor}
              </p>
            )}
          </div>

          {/* Rating */}
          {product.reviews.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`text-base ${star <= Math.round(avgRating) ? "text-foreground" : "text-muted-foreground/20"}`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {avgRating.toFixed(1)} ({product.reviews.length} review
                {product.reviews.length !== 1 ? "s" : ""})
              </span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-4">
            <span className="text-3xl font-bold tracking-tight">
              SAR {product.price.toFixed(2)}
            </span>
            {product.compareAtPrice &&
              product.compareAtPrice > product.price && (
                <span className="text-lg text-muted-foreground line-through">
                  SAR {product.compareAtPrice.toFixed(2)}
                </span>
              )}
            {discount && (
              <Badge className="bg-destructive text-destructive-foreground text-xs font-semibold hover:bg-destructive">
                Save {discount}%
              </Badge>
            )}
          </div>

          {product.shortDescription && (
            <p className="text-muted-foreground leading-relaxed text-[15px]">
              {product.shortDescription}
            </p>
          )}

          <Separator />

          {/* Variant Selection + Add to Cart */}
          <VariantSelector
            productId={product.id}
            productName={product.name}
            productPrice={product.price}
            productCompareAtPrice={product.compareAtPrice}
            productQuantity={product.quantity}
            productImage={product.images[0]?.url || ""}
            variants={product.variants.map((v) => ({
              id: v.id,
              name: v.name,
              price: v.price,
              compareAtPrice: v.compareAtPrice,
              quantity: v.quantity,
              option1: v.option1,
              option2: v.option2,
              option3: v.option3,
              image: v.image,
            }))}
          />

          <Separator />

          {/* Meta Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {product.sku && (
              <div>
                <span className="text-muted-foreground">SKU:</span>{" "}
                <span className="font-medium">{product.sku}</span>
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
        </div>
      </div>

      {/* Tabs: Description / Reviews */}
      <Tabs defaultValue="description" className="mt-20">
        <TabsList className="w-auto">
          <TabsTrigger value="description" className="px-6">
            Description
          </TabsTrigger>
          <TabsTrigger value="reviews" className="px-6">
            Reviews ({product.reviews.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="description" className="mt-6">
          <div className="prose dark:prose-invert max-w-none text-[15px] leading-relaxed">
            {product.description ? (
              <p>{product.description}</p>
            ) : (
              <p className="text-muted-foreground">
                No description available.
              </p>
            )}
          </div>
        </TabsContent>
        <TabsContent value="reviews" className="mt-6 space-y-5">
          {product.reviews.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              No reviews yet. Be the first to review this product!
            </p>
          ) : (
            product.reviews.map((review) => (
              <div
                key={review.id}
                className="border rounded-xl p-5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center text-xs font-semibold">
                      {review.user.name?.[0] || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">
                        {review.user.name || "Anonymous"}
                      </p>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={`text-xs ${star <= review.rating ? "text-foreground" : "text-muted-foreground/20"}`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {review.title && (
                  <p className="text-sm font-semibold">{review.title}</p>
                )}
                {review.comment && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {review.comment}
                  </p>
                )}
              </div>
            ))
          )}
          <ReviewForm productId={product.id} />
        </TabsContent>
      </Tabs>

      {/* Bundle Items */}
      {product.bundleItems && product.bundleItems.length > 0 && (
        <section className="mt-16 lg:mt-20">
          <div className="mb-8">
            <p className="text-sm font-semibold text-muted-foreground tracking-wide uppercase mb-2">
              Bundle
            </p>
            <h2 className="text-2xl font-bold tracking-tight">
              Included in This Bundle
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {product.bundleItems.map((bi) => (
              <Link key={bi.id} href={`/products/${bi.child.slug}`} className="group">
                <div className="border rounded-lg p-3 hover:shadow-md transition-shadow">
                  <div className="relative aspect-square overflow-hidden rounded-md bg-accent/50 mb-3">
                    {bi.child.images[0] ? (
                      <Image src={bi.child.images[0].url} alt={bi.child.name} fill className="object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No image</div>
                    )}
                    {bi.quantity > 1 && (
                      <Badge className="absolute top-2 right-2 text-xs">x{bi.quantity}</Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium line-clamp-2">{bi.child.name}</p>
                  <p className="text-sm text-muted-foreground">SAR {Number(bi.child.price).toFixed(2)}</p>
                  {bi.discount > 0 && (
                    <Badge variant="secondary" className="text-xs mt-1">{bi.discount}% off in bundle</Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="mt-20 lg:mt-24">
          <div className="mb-10">
            <p className="text-sm font-semibold text-muted-foreground tracking-wide uppercase mb-2">
              Related
            </p>
            <h2 className="text-3xl font-bold tracking-tight">
              You May Also Like
            </h2>
          </div>
          <ProductCardGrid
            products={relatedProducts.map((p) => ({
              id: p.id,
              name: p.name,
              slug: p.slug,
              price: Number(p.price),
              compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
              images: p.images.map((i) => i.url),
            }))}
          />
        </section>
      )}
    </div>
    </>
  );
}
