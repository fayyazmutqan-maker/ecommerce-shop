import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { wishlistItems, productImages } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { ArrowLeft, Heart, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/helpers";
import { Breadcrumbs } from "@/components/store/breadcrumbs";

export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const items = await db.query.wishlistItems.findMany({
    where: eq(wishlistItems.userId, session.user.id),
    orderBy: [desc(wishlistItems.createdAt)],
    with: {
      product: {
        with: {
          images: { where: eq(productImages.isPrimary, true), limit: 1 },
        },
      },
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
      <Breadcrumbs items={[
        { label: "Account", href: "/account" },
        { label: "Wishlist" },
      ]} />

      <div className="flex items-center gap-4 mb-10">
        <Button variant="outline" size="icon" asChild className="h-10 w-10">
          <Link href="/account">
            <ArrowLeft className="h-[18px] w-[18px]" />
          </Link>
        </Button>
        <div>
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-1">
            Account
          </p>
          <h1 className="text-3xl font-bold">My Wishlist</h1>
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="shadow-none border">
          <CardContent className="py-20 text-center">
            <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-5 font-medium">
              Your wishlist is empty
            </p>
            <Button asChild className="h-11 px-6 font-semibold">
              <Link href="/products">Browse Products</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden shadow-none border">
              <Link href={`/products/${item.product.slug}`}>
                <div className="aspect-square bg-muted relative">
                  {item.product.images[0] ? (
                    <img
                      src={item.product.images[0].url}
                      alt={item.product.name}
                      className="h-full w-full object-cover"
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
  );
}
