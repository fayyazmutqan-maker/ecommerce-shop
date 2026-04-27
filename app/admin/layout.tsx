import { redirect } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";
import { Providers } from "@/components/providers";
import { auth } from "@/lib/auth";
import { getLocale, getMessages } from "next-intl/server";
import { defaultTimeZone } from "@/i18n/request";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/admin");
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") {
    redirect("/");
  }

  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <Providers locale={locale} messages={messages as Record<string, unknown>} timeZone={defaultTimeZone}>
      <SidebarProvider>
        <AdminSidebar />
        <SidebarInset>
          <AdminHeader />
          <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </Providers>
  );
}
