import Link from "next/link";
import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { NewsletterForm } from "@/components/store/newsletter-form";

export function StoreFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          {/* Brand */}
          <div className="space-y-5 lg:pr-8">
            <h3 className="text-lg font-bold tracking-tight">ShopFlow</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your one-stop destination for quality products at exceptional
              value. Fast shipping across Saudi Arabia, easy returns, and outstanding support.
            </p>
            <div className="flex gap-1">
              {[
                { icon: Facebook, label: "Facebook" },
                { icon: Instagram, label: "Instagram" },
                { icon: Twitter, label: "Twitter" },
                { icon: Youtube, label: "Youtube" },
              ].map((social) => (
                <Button
                  key={social.label}
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-foreground"
                  asChild
                >
                  <a href="#" aria-label={social.label}>
                    <social.icon className="h-4 w-4" />
                  </a>
                </Button>
              ))}
            </div>
          </div>

          {/* Shop */}
          <div className="space-y-5">
            <h4 className="text-sm font-semibold uppercase tracking-widest">
              Shop
            </h4>
            <ul className="space-y-3">
              {[
                { href: "/products", label: "All Products" },
                { href: "/collections", label: "Collections" },
                { href: "/products?sort=newest", label: "New Arrivals" },
                { href: "/products?onSale=true", label: "Sale" },
                { href: "/gift-cards", label: "Gift Cards" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-5">
            <h4 className="text-sm font-semibold uppercase tracking-widest">
              Support
            </h4>
            <ul className="space-y-3">
              {[
                { href: "/search", label: "Search" },
                { href: "/contact", label: "Contact Us" },
                { href: "/returns", label: "Shipping & Returns" },
                { href: "/privacy", label: "Privacy Policy" },
                { href: "/terms", label: "Terms of Service" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div className="space-y-5">
            <h4 className="text-sm font-semibold uppercase tracking-widest">
              Newsletter
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Get special offers and updates delivered to your inbox.
            </p>
            <NewsletterForm />
          </div>
        </div>

        <Separator className="my-10" />

        {/* Saudi Compliance & Legal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 text-xs text-muted-foreground">
          <div className="space-y-1">
            <p className="font-semibold text-foreground text-[11px] uppercase tracking-widest">Commercial Registration</p>
            <p>CR No: 1010XXXXXX — Riyadh, Saudi Arabia</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-foreground text-[11px] uppercase tracking-widest">VAT Registration</p>
            <p>VAT No: 3XXXXXXXXXX003 — ZATCA Registered</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-foreground text-[11px] uppercase tracking-widest">E-Commerce License</p>
            <p>Licensed and regulated by CITC (Ministry of Commerce)</p>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed mb-8">
          All prices are displayed in Saudi Riyal (SAR) and include 15% VAT as mandated by ZATCA.
          Products comply with SASO (Saudi Standards, Metrology and Quality Organization) standards.
          We adhere to Saudi e-commerce regulations under the Ministry of Commerce and CITC guidelines.
          Consumer rights are protected under the Saudi E-Commerce Law. Returns accepted within 7 days of delivery.
        </p>

        <Separator className="mb-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} ShopFlow. All rights reserved. Kingdom of Saudi Arabia.</p>
          <div className="flex items-center gap-6">
            <Link
              href="/privacy"
              className="hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="hover:text-foreground transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/returns"
              className="hover:text-foreground transition-colors"
            >
              Returns
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
