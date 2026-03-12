import { db } from "@/lib/db";
import { categories } from "@/lib/schema";
import { eq, asc, isNull, and } from "drizzle-orm";
import { getLocale } from "next-intl/server";
import { applyTranslationsBatch } from "@/lib/translations";
import { BrowseSidebar } from "@/components/store/browse-sidebar";

export default async function BrowseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const allCategories = await db.query.categories.findMany({
    where: and(eq(categories.isActive, true), isNull(categories.parentId)),
    orderBy: [asc(categories.sortOrder)],
  });
  const locale = await getLocale();
  const tCategories = (await applyTranslationsBatch(
    "category",
    allCategories as Record<string, unknown>[],
    locale
  )) as typeof allCategories;

  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-10 lg:py-14">
      <div className="flex flex-col lg:flex-row gap-10 lg:gap-12">
        <BrowseSidebar
          initialCategories={tCategories.map((c) => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
          }))}
        />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
