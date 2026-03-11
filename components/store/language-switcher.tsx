"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";

const languages = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
] as const;

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function switchLocale(newLocale: string) {
    // Set cookie via API
    await fetch("/api/settings/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: newLocale }),
    });

    // Update HTML dir attribute for RTL
    document.documentElement.dir = newLocale === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = newLocale;

    startTransition(() => {
      router.refresh();
    });
  }

  const currentLang = languages.find((l) => l.code === locale) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          disabled={isPending}
          aria-label="Switch language"
        >
          <Languages className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => switchLocale(lang.code)}
            className={locale === lang.code ? "bg-accent" : ""}
          >
            <span className="mr-2">{lang.flag}</span>
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
