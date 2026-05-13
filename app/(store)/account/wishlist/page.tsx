import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { wishlistItems, productImages } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { ArrowLeft, Heart, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/helpers";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { AccountSidebar } from "@/components/store/account-sidebar";
import { getTranslations } from "next-intl/server";
import { shouldUseUnoptimizedImage } from "@/lib/image";

export const dynamic = "force-dynamic";

interface WishlistProduct {
  slug: string;
  name: string;
  price: string | number;
  compareAtPrice: string | number | null;
  images: Array<{ url: string }>;
}

type WishlistItem = {
  id: string;
  product: WishlistProduct;
};

export default async function WishlistPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const t = await getTranslations("account");

  const items = (await db.query.wishlistItems.findMany({
    where: eq(wishlistItems.userId, session.user.id),
    orderBy: [desc(wishlistItems.createdAt)],
    with: {
      product: {
        with: {
          images: { where: eq(productImages.isPrimary, true), limit: 1 },
        },
      },
    },
  })) as unknown as WishlistItem[];

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
      <Breadcrumbs items={[
        { label: t("title"), href: "/account" },
        { label: t("wishlist") },
      ]} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        <AccountSidebar active="wishlist" user={session.user} />

        <div className="lg:col-span-3 space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild className="h-10 w-10">
          <Link href="/account">
            <ArrowLeft className="h-[18px] w-[18px]" />
          </Link>
        </Button>
        <div>
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-1">
            {t("title")}
          </p>
          <h1 className="text-3xl font-bold">{t("myWishlist")}</h1>
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="shadow-none border">
          <CardContent className="py-20 text-center">
            <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-5 font-medium">
              {t("wishlistEmpty")}
            </p>
            <Button asChild className="h-11 px-6 font-semibold">
              <Link href="/products">{t("browseProducts")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden shadow-none border">
              <Link href={`/products/${item.product.slug}`}>
                <div className="aspect-square bg-muted relative">
                  {item.product.images[0] ? (
                    <Image
                      src={item.product.images[0].url}
                      alt={item.product.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover"
                      unoptimized={shouldUseUnoptimizedImage(item.product.images[0].url)}
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </Link>
              <CardContent className="p-4">
                <Link href={`/products/${item.product.slug}`}>
                  <h3 className="font-medium text-sm line-clamp-2 hover:underline">
                    {item.product.name}
                  </h3>
                </Link>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-bold">
                    {formatCurrency(Number(item.product.price))}
                  </span>
                  {item.product.compareAtPrice && (
                    <span className="text-sm text-muted-foreground line-through">
                      {formatCurrency(Number(item.product.compareAtPrice))}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
