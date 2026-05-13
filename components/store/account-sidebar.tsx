import Link from "next/link";
import {
  Heart,
  MapPin,
  MessageSquare,
  Package,
  RotateCcw,
  User,
  Wallet,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { getTranslations } from "next-intl/server";

interface AccountSidebarProps {
  active:
    | "dashboard"
    | "orders"
    | "wishlist"
    | "addresses"
    | "reviews"
    | "storeCredit"
    | "returns"
    | "profile";
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export async function AccountSidebar({ active, user }: AccountSidebarProps) {
  const t = await getTranslations("accountPage");
  const tAccount = await getTranslations("account");

  const items = [
    { href: "/account", icon: User, label: t("dashboard"), key: "dashboard" },
    { href: "/account/orders", icon: Package, label: tAccount("orders"), key: "orders" },
    { href: "/account/wishlist", icon: Heart, label: tAccount("wishlist"), key: "wishlist" },
    { href: "/account/addresses", icon: MapPin, label: tAccount("addresses"), key: "addresses" },
    { href: "/account/reviews", icon: MessageSquare, label: t("reviews"), key: "reviews" },
    { href: "/account/store-credit", icon: Wallet, label: tAccount("storeCredit"), key: "storeCredit" },
    { href: "/account/returns", icon: RotateCcw, label: tAccount("returns"), key: "returns" },
  ] as const;

  return (
    <aside className="space-y-5">
      {user && (
        <Card className="shadow-none border">
          <CardContent className="p-5 flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={user.image || ""} />
              <AvatarFallback className="bg-foreground text-background text-lg font-bold">
                {user.name?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold truncate">{user.name}</p>
              <p className="text-sm text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <nav className="space-y-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
              active === item.key
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
  );
}
