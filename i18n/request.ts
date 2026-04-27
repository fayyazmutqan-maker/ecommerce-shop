import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
export const defaultTimeZone = "Asia/Riyadh";

export default getRequestConfig(async () => {
  // Read locale from cookie, or detect from Accept-Language header
  const cookieStore = await cookies();
  const headersList = await headers();

  let locale: Locale = defaultLocale;
  const cookieLocale = cookieStore.get("locale")?.value;
  if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    locale = cookieLocale as Locale;
  } else {
    const acceptLang = headersList.get("accept-language") || "";
    if (acceptLang.includes("ar")) {
      locale = "ar";
    }
  }

  return {
    locale,
    timeZone: defaultTimeZone,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
