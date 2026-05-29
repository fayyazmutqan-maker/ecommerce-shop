"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  Percent,
  FileText,
  Monitor,
  Palette,
  BarChart3,
  ShoppingBag,
  ChevronDown,
  Store,
  Truck,
  Zap,
  FilePen,
  ShoppingBasket,
  ArrowDownUp,
  RotateCcw,
  Warehouse,
  Shield,
  CreditCard,
  PenTool,
  Activity,
  Bell,
  FolderKanban,
  Star,
  Mail,
  MailCheck,
  Navigation,
  Wallet,
  Globe,
  Share2,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const mainNav = [
  {
    key: "dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    key: "orders",
    href: "/admin/orders",
    icon: ShoppingCart,
  },
  {
    key: "products",
    href: "/admin/products",
    icon: Package,
    children: [
      { key: "allProducts", href: "/admin/products" },
      { key: "addProduct", href: "/admin/products/new" },
      { key: "categories", href: "/admin/categories" },
    ],
  },
  {
    key: "customers",
    href: "/admin/customers",
    icon: Users,
  },
  {
    key: "analytics",
    href: "/admin/analytics",
    icon: BarChart3,
  },
  {
    key: "draftOrders",
    href: "/admin/draft-orders",
    icon: FilePen,
  },
  {
    key: "returns",
    href: "/admin/returns",
    icon: RotateCcw,
  },
  {
    key: "abandonedCarts",
    href: "/admin/abandoned-carts",
    icon: ShoppingBasket,
  },
  {
    key: "pos",
    href: "/admin/pos",
    icon: Monitor,
  },
  {
    key: "inventory",
    href: "/admin/inventory",
    icon: Warehouse,
  },
  {
    key: "giftCards",
    href: "/admin/gift-cards",
    icon: CreditCard,
  },
  {
    key: "blog",
    href: "/admin/blog",
    icon: PenTool,
  },
  {
    key: "reviews",
    href: "/admin/reviews",
    icon: Star,
  },
];

const settingsNav = [
  {
    key: "discounts",
    href: "/admin/discounts",
    icon: Percent,
  },
  {
    key: "autoDiscounts",
    href: "/admin/auto-discounts",
    icon: Zap,
  },
  {
    key: "shippingZones",
    href: "/admin/shipping-zones",
    icon: Truck,
  },
  {
    key: "importExport",
    href: "/admin/import-export",
    icon: ArrowDownUp,
  },
  {
    key: "pages",
    href: "/admin/pages",
    icon: FileText,
  },
  {
    key: "templates",
    href: "/admin/templates",
    icon: Palette,
  },
  {
    key: "smartCollections",
    href: "/admin/smart-collections",
    icon: FolderKanban,
  },
  {
    key: "translations",
    href: "/admin/translations",
    icon: Globe,
  },
  {
    key: "navigation",
    href: "/admin/navigations",
    icon: Navigation,
  },
  {
    key: "newsletter",
    href: "/admin/newsletter",
    icon: Mail,
  },
  {
    key: "emailPreviews",
    href: "/admin/email-previews",
    icon: MailCheck,
  },
  {
    key: "storeCredit",
    href: "/admin/store-credit",
    icon: Wallet,
  },
  {
    key: "salesChannels",
    href: "/admin/channels",
    icon: Share2,
  },
  {
    key: "activityLog",
    href: "/admin/activity-log",
    icon: Activity,
  },
  {
    key: "notifications",
    href: "/admin/notifications",
    icon: Bell,
  },
  {
    key: "staff",
    href: "/admin/staff",
    icon: Shield,
  },
  {
    key: "settings",
    href: "/admin/settings",
    icon: Settings,
    children: [
      { key: "general", href: "/admin/settings" },
      { key: "company", href: "/admin/settings/company" },
      { key: "payments", href: "/admin/settings/payments" },
      { key: "shipping", href: "/admin/settings/shipping" },
      { key: "taxes", href: "/admin/settings/taxes" },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const t = useTranslations("admin.nav");
  const locale = useLocale();
  const side = locale === "ar" ? "right" : "left";

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <Sidebar variant="sidebar" collapsible="icon" side={side}>
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/admin">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <ShoppingBag className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">ShopFlow</span>
                  <span className="text-xs text-sidebar-foreground/60">
                    {t("adminPanel")}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("main")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) =>
                item.children ? (
                  <Collapsible key={item.key} defaultOpen={isActive(item.href)}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          isActive={isActive(item.href)}
                          tooltip={t(item.key)}
                        >
                          <item.icon className="size-4" />
                          <span>{t(item.key)}</span>
                          <ChevronDown className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.children.map((child) => (
                            <SidebarMenuSubItem key={child.href}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={pathname === child.href}
                              >
                                <Link href={child.href}>{t(child.key)}</Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.href)}
                      tooltip={t(item.key)}
                    >
                      <Link href={item.href}>
                        <item.icon className="size-4" />
                        <span>{t(item.key)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t("configuration")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsNav.map((item) =>
                item.children ? (
                  <Collapsible key={item.key} defaultOpen={isActive(item.href)}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          isActive={isActive(item.href)}
                          tooltip={t(item.key)}
                        >
                          <item.icon className="size-4" />
                          <span>{t(item.key)}</span>
                          <ChevronDown className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.children.map((child) => (
                            <SidebarMenuSubItem key={child.href}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={pathname === child.href}
                              >
                                <Link href={child.href}>{t(child.key)}</Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.href)}
                      tooltip={t(item.key)}
                    >
                      <Link href={item.href}>
                        <item.icon className="size-4" />
                        <span>{t(item.key)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={t("viewStore")}>
              <Link href="/" target="_blank">
                <Store className="size-4" />
                <span>{t("viewStore")}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
