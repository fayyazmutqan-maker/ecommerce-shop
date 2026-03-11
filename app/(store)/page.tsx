import { getActiveTemplateSections, renderTemplateSection } from "@/components/store/template-renderer";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const sections = await getActiveTemplateSections();

  if (sections.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Welcome</h1>
        <p className="text-muted-foreground">
          No active template found. Please activate a template in the admin panel.
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
