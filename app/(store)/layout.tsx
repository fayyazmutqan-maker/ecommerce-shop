import { StoreNavbar } from "@/components/store/store-navbar";
import { StoreFooter } from "@/components/store/store-footer";
import { AbandonedCartTracker } from "@/components/store/abandoned-cart-tracker";
import { Providers } from "@/components/providers";
import { getLocale, getMessages } from "next-intl/server";
import { getActiveTemplateColors } from "@/components/store/template-renderer";

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locale, messages, templateColors] = await Promise.all([
    getLocale(),
    getMessages(),
    getActiveTemplateColors(),
  ]);

  const colorOverrides = Object.entries(templateColors).reduce(
    (acc, [key, value]) => {
      acc[`--${key}`] = value;
      return acc;
    },
    {} as Record<string, string>
  );

  return (
    <Providers locale={locale} messages={messages as Record<string, unknown>}>
      <div className="flex min-h-screen flex-col" style={colorOverrides}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground"
        >
          Skip to content
        </a>
        <StoreNavbar />
        <main id="main-content" className="flex-1">{children}</main>
        <StoreFooter />
        <AbandonedCartTracker />
      </div>
    </Providers>
  );
}
