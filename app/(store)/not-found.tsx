"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";

export default function StoreNotFound() {
  const t = useTranslations("errors");
  const tCommon = useTranslations("common");

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
      <div className="text-center max-w-md mx-auto">
        <div className="text-7xl font-bold text-muted-foreground/20 mb-4">
          404
        </div>
        <h1 className="text-2xl font-bold mb-2">{t("pageNotFound")}</h1>
        <p className="text-muted-foreground mb-8">
          {t("storeNotFoundDesc")}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button asChild>
            <Link href="/products">
              <ShoppingBag className="mr-2 h-4 w-4" />
              {tCommon("browseProducts")}
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">{tCommon("home")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
