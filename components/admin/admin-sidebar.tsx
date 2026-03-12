"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  Tag,
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
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Orders",
    href: "/admin/orders",
    icon: ShoppingCart,
  },
  {
    title: "Products",
    href: "/admin/products",
    icon: Package,
    children: [
      { title: "All Products", href: "/admin/products" },
      { title: "Add Product", href: "/admin/products/new" },
      { title: "Categories", href: "/admin/categories" },
    ],
  },
  {
    title: "Customers",
    href: "/admin/customers",
    icon: Users,
  },
  {
    title: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
  },
  {
    title: "Draft Orders",
    href: "/admin/draft-orders",
    icon: FilePen,
  },
  {
    title: "Returns",
    href: "/admin/returns",
    icon: RotateCcw,
  },
  {
    title: "Abandoned Carts",
    href: "/admin/abandoned-carts",
    icon: ShoppingBasket,
  },
  {
    title: "POS",
    href: "/admin/pos",
    icon: Monitor,
  },
  {
    title: "Inventory",
    href: "/admin/inventory",
    icon: Warehouse,
  },
  {
    title: "Gift Cards",
    href: "/admin/gift-cards",
    icon: CreditCard,
  },
  {
    title: "Blog",
    href: "/admin/blog",
    icon: PenTool,
  },
  {
    title: "Reviews",
    href: "/admin/reviews",
    icon: Star,
  },
];

const settingsNav = [
  {
    title: "Discounts",
    href: "/admin/discounts",
    icon: Percent,
  },
  {
    title: "Auto Discounts",
    href: "/admin/auto-discounts",
    icon: Zap,
  },
  {
    title: "Shipping Zones",
    href: "/admin/shipping-zones",
    icon: Truck,
  },
  {
    title: "Import / Export",
    href: "/admin/import-export",
    icon: ArrowDownUp,
  },
  {
    title: "Pages",
    href: "/admin/pages",
    icon: FileText,
  },
  {
    title: "Templates",
    href: "/admin/templates",
    icon: Palette,
  },
  {
    title: "Smart Collections",
    href: "/admin/smart-collections",
    icon: FolderKanban,
  },
  {
    title: "Translations",
    href: "/admin/translations",
    icon: Globe,
  },
  {
    title: "Navigation",
    href: "/admin/navigations",
    icon: Navigation,
  },
  {
    title: "Newsletter",
    href: "/admin/newsletter",
    icon: Mail,
  },
  {
    title: "Store Credit",
    href: "/admin/store-credit",
    icon: Wallet,
  },
  {
    title: "Sales Channels",
    href: "/admin/channels",
    icon: Share2,
  },
  {
    title: "Activity Log",
    href: "/admin/activity-log",
    icon: Activity,
  },
  {
    title: "Notifications",
    href: "/admin/notifications",
    icon: Bell,
  },
  {
    title: "Staff",
    href: "/admin/staff",
    icon: Shield,
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: Settings,
    children: [
      { title: "General", href: "/admin/settings" },
      { title: "Company", href: "/admin/settings/company" },
      { title: "Payments", href: "/admin/settings/payments" },
      { title: "Shipping", href: "/admin/settings/shipping" },
      { title: "Taxes", href: "/admin/settings/taxes" },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <Sidebar variant="sidebar" collapsible="icon">
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
                    Admin Panel
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) =>
                item.children ? (
                  <Collapsible key={item.title} defaultOpen={isActive(item.href)}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          isActive={isActive(item.href)}
                          tooltip={item.title}
                        >
                          <item.icon className="size-4" />
                          <span>{item.title}</span>
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
                                <Link href={child.href}>{child.title}</Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.href)}
                      tooltip={item.title}
                    >
                      <Link href={item.href}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Configuration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsNav.map((item) =>
                item.children ? (
                  <Collapsible key={item.title} defaultOpen={isActive(item.href)}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          isActive={isActive(item.href)}
                          tooltip={item.title}
                        >
                          <item.icon className="size-4" />
                          <span>{item.title}</span>
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
                                <Link href={child.href}>{child.title}</Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.href)}
                      tooltip={item.title}
                    >
                      <Link href={item.href}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
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
            <SidebarMenuButton asChild tooltip="View Store">
              <Link href="/" target="_blank">
                <Store className="size-4" />
                <span>View Store</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
