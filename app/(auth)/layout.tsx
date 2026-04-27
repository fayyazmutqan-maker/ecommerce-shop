import { Providers } from "@/components/providers";
import { getLocale, getMessages } from "next-intl/server";
import { defaultTimeZone } from "@/i18n/request";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <Providers locale={locale} messages={messages as Record<string, unknown>} timeZone={defaultTimeZone}>
      {children}
    </Providers>
  );
}
