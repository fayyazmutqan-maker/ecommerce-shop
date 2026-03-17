import { getActiveTemplateSections, renderTemplateSection } from "@/components/store/template-renderer";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const sections = await getActiveTemplateSections();

  if (sections.length === 0) {
    const t = await getTranslations("errors");
    return (
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-4">{t("welcome")}</h1>
        <p className="text-muted-foreground">
          {t("noTemplate")}
        </p>
      </div>
    );
  }

  return (
    <div>
      {await Promise.all(
        sections.map(async (section) => (
          <div key={section.id}>
            {await renderTemplateSection(section)}
          </div>
        ))
      )}
    </div>
  );
}
