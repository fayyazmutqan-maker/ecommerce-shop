import { db } from "@/lib/db";
import { categories } from "@/lib/schema";
import { eq, asc, and, isNull } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { applyTranslationsBatch } from "@/lib/translations";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/store/breadcrumbs";

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const rawCategoryList = await db.query.categories.findMany({
    where: and(eq(categories.isActive, true), isNull(categories.parentId)),
    with: {
      children: { where: eq(categories.isActive, true) },
      products: true,
    },
    orderBy: [asc(categories.sortOrder)],
  });

  // Apply locale translations
  const locale = await getLocale();
  const t = await getTranslations("collectionsPage");
  const tCommon = await getTranslations("common");
  const categoryList = await applyTranslationsBatch("category", rawCategoryList as Record<string, unknown>[], locale) as typeof rawCategoryList;

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 lg:py-14">
      <Breadcrumbs items={[{ label: tCommon("collections") }]} />

      <div className="mb-12">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">{t("browse")}</p>
        <h1 className="text-3xl lg:text-4xl font-bold">{tCommon("collections")}</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {categoryList.map((cat) => (
          <Link key={cat.id} href={`/collections/${cat.slug}`}>
            <Card className="group overflow-hidden border shadow-none hover:shadow-lg hover:border-foreground/20 transition-all duration-300">
              <div className="aspect-[16/10] bg-accent/50 relative overflow-hidden">
                {cat.image ? (
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-accent">
                    <span className="text-5xl font-bold text-foreground/10">
                      {cat.name[0]}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-end p-6">
                  <div>
                    <h2 className="text-white text-xl font-bold">{cat.name}</h2>
                    <p className="text-white/80 text-sm mt-1">
                      {t("products", { count: cat.products.length })}
                    </p>
                  </div>
                </div>
              </div>
              {cat.description && (
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {cat.description}
                  </p>
                </CardContent>
              )}
            </Card>
          </Link>
        ))}
      </div>

      {categoryList.length === 0 && (
        <div className="text-center py-28">
          <p className="text-muted-foreground font-medium">{t("noCollections")}</p>
        </div>
      )}
    </div>
  );
}
