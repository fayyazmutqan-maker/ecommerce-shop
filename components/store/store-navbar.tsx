import Link from "next/link";
import {
  ShoppingBag,
  Search,
  User,
  Menu,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CartSheet } from "@/components/store/cart-sheet";

const navLinks = [
  { title: "Home", href: "/" },
  { title: "Products", href: "/products" },
  { title: "Collections", href: "/collections" },
  { title: "Blog", href: "/blog" },
  { title: "Contact", href: "/contact" },
];

export function StoreNavbar() {
  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      {/* Announcement Bar */}
      <div className="bg-foreground text-background text-center py-2.5 text-[13px] font-medium tracking-wide">
        Free shipping on orders over SAR 200 &mdash; Use code{" "}
        <span className="font-semibold">WELCOME10</span> for 10% off your first
        order
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
              <SheetContent side="left" className="w-[320px]">
                <SheetHeader>
                  <SheetTitle className="text-left">
                    <Link href="/" className="flex items-center gap-2.5">
                      <ShoppingBag className="h-6 w-6" />
                      <span className="text-xl font-bold tracking-tight">
                        ShopFlow
                      </span>
                    </Link>
                  </SheetTitle>
                </SheetHeader>
                <nav className="mt-8 flex flex-col gap-1">
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
                  <Button className="w-full h-11" asChild>
                    <Link href="/login">Sign In</Link>
                  </Button>
                  <Button variant="outline" className="w-full h-11" asChild>
                    <Link href="/register">Create Account</Link>
                  </Button>
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
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-muted-foreground hover:text-foreground"
                asChild
              >
                <Link href="/account/wishlist">
                  <Heart className="h-[18px] w-[18px]" />
                </Link>
              </Button>
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
              <CartSheet />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
