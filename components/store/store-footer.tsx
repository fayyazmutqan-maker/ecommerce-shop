"use client";

import Link from "next/link";
import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { NewsletterForm } from "@/components/store/newsletter-form";
import { useTranslations } from "next-intl";

export function StoreFooter() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");

  return (
    <footer className="border-t bg-card">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          {/* Brand */}
          <div className="space-y-5 lg:pe-8">
            <h3 className="text-lg font-bold tracking-tight">ShopFlow</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("shopInfo")}
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
                  className="h-10 w-10 text-muted-foreground hover:text-foreground"
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
              {t("shop")}
            </h4>
            <ul className="space-y-3">
              {[
                { href: "/products", label: t("allProducts") },
                { href: "/collections", label: tNav("collections") },
                { href: "/products?sort=newest", label: t("newArrivals") },
                { href: "/products?onSale=true", label: t("sale") },
                { href: "/gift-cards", label: tNav("giftCards") },
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
              {t("support")}
            </h4>
            <ul className="space-y-3">
              {[
                { href: "/search", label: tCommon("search") },
                { href: "/contact", label: tNav("contact") },
                { href: "/returns", label: t("shippingReturns") },
                { href: "/privacy", label: t("privacyPolicy") },
                { href: "/terms", label: t("termsOfService") },
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
              {t("newsletter")}
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("newsletterDesc")}
            </p>
            <NewsletterForm />
          </div>
        </div>

        <Separator className="my-10" />

        {/* Saudi Compliance & Legal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 text-xs text-muted-foreground">
          <div className="space-y-1">
            <p className="font-semibold text-foreground text-[11px] uppercase tracking-widest">{t("commercialReg")}</p>
            <p>{t("crValue")}</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-foreground text-[11px] uppercase tracking-widest">{t("vatReg")}</p>
            <p>{t("vatValue")}</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-foreground text-[11px] uppercase tracking-widest">{t("ecommLicense")}</p>
            <p>{t("ecommLicenseValue")}</p>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed mb-8">
          {t("saudiCompliance")}
        </p>

        <Separator className="mb-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} ShopFlow. {t("allRightsReserved")}</p>
          <div className="flex items-center gap-6">
            <Link
              href="/privacy"
              className="hover:text-foreground transition-colors"
            >
              {t("privacy")}
            </Link>
            <Link
              href="/terms"
              className="hover:text-foreground transition-colors"
            >
              {t("terms")}
            </Link>
            <Link
              href="/returns"
              className="hover:text-foreground transition-colors"
            >
              {t("returns")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
