"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

export default function StoreError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error("Store error:", error);
  }, [error]);

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
      <div className="text-center max-w-md mx-auto">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
        <h1 className="text-2xl font-bold mb-2">{t("somethingWentWrong")}</h1>
        <p className="text-muted-foreground mb-6">
          {t("storeErrorDesc")}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={reset}>{t("tryAgain")}</Button>
          <Button variant="outline" asChild>
            <Link href="/">{t("goHome")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
