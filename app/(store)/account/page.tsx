import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, wishlistItems } from "@/lib/schema";
import { eq, desc, count } from "drizzle-orm";
import {
  Package,
  Heart,
  MapPin,
  User,
  LogOut,
  ChevronRight,
  Wallet,
  RotateCcw,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Breadcrumbs } from "@/components/store/breadcrumbs";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const [orderList, wishlistCountResult] = await Promise.all([
    db.query.orders.findMany({
      where: eq(orders.userId, session.user.id),
      orderBy: [desc(orders.createdAt)],
      limit: 5,
      with: { items: true },
    }),
    db.select({ value: count() }).from(wishlistItems).where(eq(wishlistItems.userId, session.user.id)),
  ]);

  const wishlistCount = wishlistCountResult[0].value;
  const totalSpent = orderList.reduce((sum, o) => sum + Number(o.totalAmount), 0);
  const t = await getTranslations("accountPage");
  const tAccount = await getTranslations("account");
  const tCommon = await getTranslations("common");

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
      <Breadcrumbs items={[{ label: tAccount("title") }]} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
        {/* Sidebar */}
        <aside className="space-y-5">
          <Card className="shadow-none border">
            <CardContent className="p-5 flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarImage src={session.user.image || ""} />
                <AvatarFallback className="bg-foreground text-background text-lg font-bold">
                  {session.user.name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-semibold truncate">{session.user.name}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {session.user.email}
                </p>
              </div>
            </CardContent>
          </Card>

          <nav className="space-y-1">
            {[
              { href: "/account", icon: User, label: t("dashboard"), active: true },
              { href: "/account/orders", icon: Package, label: tAccount("orders") },
              { href: "/account/wishlist", icon: Heart, label: tAccount("wishlist") },
              { href: "/account/addresses", icon: MapPin, label: tAccount("addresses") },
              { href: "/account/reviews", icon: MessageSquare, label: t("reviews") },
              { href: "/account/store-credit", icon: Wallet, label: tAccount("storeCredit") },
              { href: "/account/returns", icon: RotateCcw, label: tAccount("returns") },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                  item.active
                    ? "bg-accent font-semibold"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                }`}
              >
                <item.icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-8">
          <div>
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-2">{t("overview")}</p>
            <h1 className="text-3xl font-bold">{tAccount("title")}</h1>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Card className="shadow-none border">
              <CardContent className="p-5 text-center">
                <p className="text-3xl font-bold">{orderList.length}</p>
                <p className="text-sm text-muted-foreground mt-1">{t("totalOrders")}</p>
              </CardContent>
            </Card>
            <Card className="shadow-none border">
              <CardContent className="p-5 text-center">
                <p className="text-3xl font-bold">{tCommon("sar")} {totalSpent.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground mt-1">{t("totalSpent")}</p>
              </CardContent>
            </Card>
            <Card className="shadow-none border">
              <CardContent className="p-5 text-center">
                <p className="text-3xl font-bold">{wishlistCount}</p>
                <p className="text-sm text-muted-foreground mt-1">{t("wishlistItems")}</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Orders */}
          <Card className="shadow-none border">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg">{t("recentOrders")}</CardTitle>
              <Button variant="ghost" size="sm" asChild className="text-sm">
                <Link href="/account/orders">
                  {tCommon("viewAll")} <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {orderList.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  {t("noOrders")}
                </p>
              ) : (
                <div className="space-y-1">
                  {orderList.map((order) => (
                    <div
                      key={order.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-2 border-b last:border-0"
                    >
                      <div>
                        <p className="text-sm font-semibold">
                          #{order.orderNumber}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(order.createdAt).toLocaleDateString()} ·{" "}
                          {order.items.length} item
                          {order.items.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant={
                            order.status === "DELIVERED"
                              ? "default"
                              : order.status === "CANCELLED"
                                ? "destructive"
                                : "secondary"
                          }
                          className="text-xs"
                        >
                          {order.status}
                        </Badge>
                        <span className="text-sm font-bold">
                          {tCommon("sar")} {Number(order.totalAmount).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
