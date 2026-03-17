"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";

export default function NotFound() {
  const t = useTranslations("errors");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-muted-foreground/20 mb-4">
          404
        </div>
        <h1 className="text-3xl font-bold mb-2">{t("pageNotFound")}</h1>
        <p className="text-muted-foreground mb-8">
          {t("pageNotFoundDesc")}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button asChild>
            <Link href="/">
              <ShoppingBag className="mr-2 h-4 w-4" />
              {t("goToStore")}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
