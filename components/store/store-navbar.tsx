"use client";

import Link from "next/link";
import {
  ShoppingBag,
  Search,
  User,
  Menu,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CartSheet } from "@/components/store/cart-sheet";
import { LanguageSwitcher } from "@/components/store/language-switcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { WishlistNavIcon } from "@/components/store/wishlist-nav-icon";
import { useSession, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

export function StoreNavbar() {
  const t = useTranslations("common");
  const tNav = useTranslations("nav");
  const { data: session, status } = useSession();
  const [isSessionLoaded, setIsSessionLoaded] = useState(false);
  const isAuthenticated = status === "authenticated";

  // Defer session check to after page load to avoid permission prompts
  useEffect(() => {
    const timeout = window.setTimeout(() => setIsSessionLoaded(true), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const navLinks = [
    { title: tNav("home"), href: "/" },
    { title: tNav("products"), href: "/products" },
    { title: tNav("collections"), href: "/collections" },
    { title: tNav("blog"), href: "/blog" },
    { title: tNav("contact"), href: "/contact" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      {/* Announcement Bar */}
      <div className="bg-foreground text-background text-center py-2.5 text-[13px] font-medium tracking-wide">
        {t("announcement", { code: "WELCOME10" })}
      </div>

      {/* Main Navbar */}
      <div className="border-b">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex h-[72px] items-center justify-between gap-8">
            {/* Mobile Menu Toggle */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden h-10 w-10"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[min(320px,85vw)]">
                <SheetHeader>
                  <SheetTitle className="text-start">
                    <Link href="/" className="flex items-center gap-2.5">
                      <ShoppingBag className="h-6 w-6" />
                      <span className="text-xl font-bold tracking-tight">
                        ShopFlow
                      </span>
                    </Link>
                  </SheetTitle>
                </SheetHeader>
                <nav className="mt-8 flex flex-col gap-1">
                  <Link
                    href="/search"
                    className="flex items-center px-4 py-3 text-[15px] font-medium rounded-lg hover:bg-accent transition-colors"
                  >
                    <Search className="h-4 w-4 mr-3" />
                    {t("search")}
                  </Link>
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex items-center px-4 py-3 text-[15px] font-medium rounded-lg hover:bg-accent transition-colors"
                    >
                      {link.title}
                    </Link>
                  ))}
                </nav>
                <div className="mt-8 px-4 space-y-3">
                  {isAuthenticated ? (
                    <>
                      <Button className="w-full h-11" asChild>
                        <Link href="/account">{t("account")}</Link>
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full h-11"
                        onClick={() => signOut({ callbackUrl: "/" })}
                      >
                        {t("logout")}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button className="w-full h-11" asChild>
                        <Link href="/login">{t("signIn")}</Link>
                      </Button>
                      <Button variant="outline" className="w-full h-11" asChild>
                        <Link href="/register">{t("createAccount")}</Link>
                      </Button>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
              <ShoppingBag className="h-7 w-7" />
              <span className="text-xl font-bold tracking-tight hidden sm:inline">
                ShopFlow
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent/50"
                >
                  {link.title}
                </Link>
              ))}
            </nav>

            {/* Action Icons */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="hidden sm:inline-flex h-10 w-10 text-muted-foreground hover:text-foreground"
                asChild
              >
                <Link href="/search">
                  <Search className="h-[18px] w-[18px]" />
                </Link>
              </Button>
              <WishlistNavIcon />
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-muted-foreground hover:text-foreground"
                    >
                      <User className="h-[18px] w-[18px]" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium truncate">{session?.user?.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/account">{t("account")}</Link>
                    </DropdownMenuItem>
                    {(session?.user as { role?: string })?.role === "ADMIN" || (session?.user as { role?: string })?.role === "STAFF" ? (
                      <DropdownMenuItem asChild>
                        <Link href="/admin">{tNav("admin")}</Link>
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                      <LogOut className="h-4 w-4 me-2" />
                      {t("logout")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-muted-foreground hover:text-foreground"
                  asChild
                >
                  <Link href="/login">
                    <User className="h-[18px] w-[18px]" />
                  </Link>
                </Button>
              )}
              <ThemeToggle />
              <LanguageSwitcher />
              <CartSheet />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
