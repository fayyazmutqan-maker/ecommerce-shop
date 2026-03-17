"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin error:", error);
  }, [error]);

  const t = useTranslations("admin.error");

  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center max-w-md">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
        <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
        <p className="text-muted-foreground mb-6">
          {t("description")}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={reset}>{t("tryAgain")}</Button>
          <Button variant="outline" onClick={() => (window.location.href = "/admin")}>
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
