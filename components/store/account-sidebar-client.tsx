"use client";

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

interface AccountSidebarClientProps {
  active:
    | "dashboard"
    | "orders"
    | "wishlist"
    | "addresses"
    | "reviews"
    | "storeCredit"
    | "returns";
}

const items = [
  { href: "/account", icon: User, label: "Dashboard", key: "dashboard" },
  { href: "/account/orders", icon: Package, label: "Orders", key: "orders" },
  { href: "/account/wishlist", icon: Heart, label: "Wishlist", key: "wishlist" },
  { href: "/account/addresses", icon: MapPin, label: "Addresses", key: "addresses" },
  { href: "/account/reviews", icon: MessageSquare, label: "Reviews", key: "reviews" },
  { href: "/account/store-credit", icon: Wallet, label: "Store Credit", key: "storeCredit" },
  { href: "/account/returns", icon: RotateCcw, label: "Returns", key: "returns" },
] as const;

export function AccountSidebarClient({ active }: AccountSidebarClientProps) {
  return (
    <aside className="space-y-5">
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
