"use client";

import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "next-themes";
import { WishlistProvider } from "@/hooks/use-wishlist";

export function Providers({
  children,
  locale,
  messages,
  timeZone,
}: {
  children: React.ReactNode;
  locale?: string;
  messages?: Record<string, unknown>;
  timeZone?: string;
}) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <WishlistProvider>
          {children}
        </WishlistProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
