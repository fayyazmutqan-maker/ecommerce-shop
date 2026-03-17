import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import { Noto_Sans_Arabic } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { AuthSessionProvider } from "@/components/session-provider";
import { getLocale } from "next-intl/server";
import "./globals.css";

const fontSans = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

const fontArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-arabic",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "ShopFlow - Modern Ecommerce Platform",
    template: "%s | ShopFlow",
  },
  description:
    "A comprehensive ecommerce platform with premium products, fast shipping, and exceptional customer service. Free shipping on orders over SAR 200.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "ShopFlow",
    title: "ShopFlow - Modern Ecommerce Platform",
    description:
      "A comprehensive ecommerce platform with premium products, fast shipping, and exceptional customer service.",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className={`${fontSans.variable} ${fontMono.variable} ${fontArabic.variable} antialiased`}>
        <AuthSessionProvider>
          {children}
        </AuthSessionProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}