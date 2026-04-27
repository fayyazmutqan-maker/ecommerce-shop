"use client";

import { useEffect, useState, useTransition } from "react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, Languages, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const languages = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
] as const;

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [requestedLocale, setRequestedLocale] = useState<string | null>(null);
  const switchingLocale = requestedLocale && requestedLocale !== locale ? requestedLocale : null;
  const activeLocale = switchingLocale || locale;

  useEffect(() => {
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    document.body.dataset.localeSwitching = switchingLocale ? "true" : "false";
  }, [switchingLocale]);

  async function switchLocale(newLocale: string) {
    if (newLocale === locale || switchingLocale) return;
    setRequestedLocale(newLocale);

    const response = await fetch("/api/settings/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: newLocale }),
    });

    if (!response.ok) {
      setRequestedLocale(null);
      toast.error("Unable to change language. Please try again.");
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          disabled={Boolean(switchingLocale) || isPending}
          aria-label="Switch language"
          aria-busy={Boolean(switchingLocale) || isPending}
        >
          {switchingLocale || isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Languages className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => switchLocale(lang.code)}
            disabled={Boolean(switchingLocale)}
            className={activeLocale === lang.code ? "bg-accent" : ""}
          >
            <span className="mr-2">{lang.flag}</span>
            {lang.label}
            {switchingLocale === lang.code ? (
              <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin" />
            ) : locale === lang.code ? (
              <Check className="ml-auto h-3.5 w-3.5" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
