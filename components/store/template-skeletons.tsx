import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/db";
import { templates, templateSections } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";

// ─── Hero Skeleton by style ───

function HeroSkeletonDefault({ height = "large", alignment = "center" }: { height?: string; alignment?: string }) {
  const hClass = height === "small" ? "py-16 lg:py-20" : height === "medium" ? "py-20 lg:py-28" : height === "full" ? "min-h-[80vh] flex items-center" : "py-24 lg:py-36";
  const aClass = alignment === "left" ? "" : alignment === "right" ? "ml-auto" : "mx-auto text-center";
  return (
    <section className="relative overflow-hidden bg-linear-to-b from-accent/60 via-background to-background">
      <div className={`mx-auto max-w-7xl px-6 lg:px-8 ${hClass}`}>
        <div className={`max-w-2xl space-y-8 ${aClass}`}>
          <Skeleton className="h-7 w-44 rounded-full" />
          <div className="space-y-3">
            <Skeleton className="h-14 md:h-16 lg:h-20 w-80 md:w-105 max-w-full" />
            <Skeleton className="h-14 md:h-16 lg:h-20 w-64 md:w-85 max-w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-96 max-w-full" />
            <Skeleton className="h-5 w-72 max-w-full" />
          </div>
          <div className={`flex gap-4 pt-2 ${alignment === "center" ? "justify-center" : alignment === "right" ? "justify-end" : ""}`}>
            <Skeleton className="h-12 w-36 rounded-md" />
            <Skeleton className="h-12 w-44 rounded-md" />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroSkeletonSplit({ height = "large" }: { height?: string }) {
  const hClass = height === "small" ? "py-16 lg:py-20" : height === "medium" ? "py-20 lg:py-28" : height === "full" ? "min-h-[80vh] flex items-center" : "py-24 lg:py-36";
  return (
    <section className="relative overflow-hidden">
      <div className={`mx-auto max-w-7xl px-6 lg:px-8 ${hClass}`}>
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div className="space-y-8">
            <Skeleton className="h-7 w-32 rounded-full" />
            <div className="space-y-3">
              <Skeleton className="h-14 md:h-16 lg:h-20 w-full max-w-md" />
              <Skeleton className="h-14 md:h-16 lg:h-20 w-3/4 max-w-sm" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-full max-w-sm" />
              <Skeleton className="h-5 w-3/4 max-w-xs" />
            </div>
            <div className="flex gap-4 pt-2">
              <Skeleton className="h-12 w-36 rounded-md" />
              <Skeleton className="h-12 w-36 rounded-md" />
            </div>
          </div>
          <Skeleton className="aspect-4/3 lg:aspect-square w-full rounded-2xl" />
        </div>
      </div>
    </section>
  );
}

function HeroSkeletonBanner({ alignment = "center" }: { alignment?: string }) {
  const aClass = alignment === "left" ? "" : alignment === "right" ? "ml-auto" : "mx-auto text-center";
  return (
    <section className="relative overflow-hidden min-h-[60vh] lg:min-h-[70vh] flex items-center bg-muted">
      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8 w-full py-20">
        <div className={`max-w-2xl space-y-6 ${aClass}`}>
          <Skeleton className="h-7 w-36 rounded-full bg-white/20" />
          <div className="space-y-3">
            <Skeleton className="h-16 md:h-20 lg:h-24 w-96 max-w-full bg-white/15" />
            <Skeleton className="h-16 md:h-20 lg:h-24 w-72 max-w-full bg-white/15" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-96 max-w-full bg-white/10" />
          </div>
          <div className={`flex gap-4 pt-2 ${alignment === "center" ? "justify-center" : alignment === "right" ? "justify-end" : ""}`}>
            <Skeleton className="h-13 w-40 rounded-md bg-white/20" />
            <Skeleton className="h-13 w-40 rounded-md bg-white/10" />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroSkeletonMinimal({ height = "large", alignment = "center" }: { height?: string; alignment?: string }) {
  const hClass = height === "small" ? "py-16 lg:py-20" : height === "medium" ? "py-20 lg:py-28" : height === "full" ? "min-h-[80vh] flex items-center" : "py-24 lg:py-36";
  const aClass = alignment === "left" ? "" : alignment === "right" ? "ml-auto" : "mx-auto text-center";
  return (
    <section className="relative">
      <div className={`mx-auto max-w-7xl px-6 lg:px-8 ${hClass}`}>
        <div className={`max-w-3xl space-y-6 ${aClass}`}>
          <Skeleton className="h-6 w-28 rounded-full" />
          <div className="space-y-3">
            <Skeleton className="h-12 md:h-14 lg:h-16 w-96 max-w-full" />
            <Skeleton className="h-12 md:h-14 lg:h-16 w-72 max-w-full" />
          </div>
          <Skeleton className="h-5 w-80 max-w-full" />
          <div className={`flex gap-3 pt-1 ${alignment === "center" ? "justify-center" : alignment === "right" ? "justify-end" : ""}`}>
            <Skeleton className="h-11 w-32 rounded-md" />
            <Skeleton className="h-11 w-32 rounded-md" />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroSkeletonCard({ height = "large", alignment = "center" }: { height?: string; alignment?: string }) {
  const hClass = height === "small" ? "py-16 lg:py-20" : height === "medium" ? "py-20 lg:py-28" : height === "full" ? "min-h-[80vh] flex items-center" : "py-24 lg:py-36";
  return (
    <section className="relative overflow-hidden bg-accent/30">
      <div className={`relative z-10 mx-auto max-w-7xl px-6 lg:px-8 ${hClass}`}>
        <div className={`${alignment === "center" ? "flex justify-center" : alignment === "right" ? "flex justify-end" : ""}`}>
          <div className="bg-background/95 backdrop-blur-md rounded-2xl p-8 md:p-12 max-w-xl shadow-2xl border">
            <div className="space-y-6">
              <Skeleton className="h-7 w-36 rounded-full" />
              <div className="space-y-3">
                <Skeleton className="h-12 md:h-14 w-full max-w-md" />
                <Skeleton className="h-12 md:h-14 w-3/4" />
              </div>
              <Skeleton className="h-5 w-full" />
              <div className="flex gap-3 pt-1">
                <Skeleton className="h-11 w-32 rounded-md" />
                <Skeleton className="h-11 w-32 rounded-md" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroSkeletonCarousel({ height = "large" }: { height?: string }) {
  const hClass = height === "small" ? "min-h-[40vh]" : height === "medium" ? "min-h-[55vh]" : height === "full" ? "min-h-[90vh]" : "min-h-[70vh]";
  return (
    <section className={`relative overflow-hidden flex items-center bg-muted/50 ${hClass}`}>
      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8 w-full py-20">
        <div className="flex flex-col items-center gap-6 max-w-2xl mx-auto text-center">
          <Skeleton className="h-7 w-40 rounded-full" />
          <div className="space-y-3 w-full flex flex-col items-center">
            <Skeleton className="h-14 md:h-16 lg:h-20 w-96 max-w-full" />
            <Skeleton className="h-14 md:h-16 lg:h-20 w-72 max-w-full" />
          </div>
          <Skeleton className="h-5 w-80 max-w-full" />
          <div className="flex gap-4 pt-2">
            <Skeleton className="h-12 w-36 rounded-md" />
            <Skeleton className="h-12 w-44 rounded-md" />
          </div>
        </div>
      </div>
      {/* Dot indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        <Skeleton className="h-2.5 w-8 rounded-full" />
        <Skeleton className="h-2.5 w-2.5 rounded-full" />
        <Skeleton className="h-2.5 w-2.5 rounded-full" />
      </div>
    </section>
  );
}

function HeroSkeleton({ config }: { config: Record<string, unknown> }) {
  const style = (config.style as string) || "default";
  const height = (config.height as string) || "large";
  const alignment = (config.alignment as string) || "center";
  const mode = (config.mode as string) || "single";

  if (mode === "carousel") return <HeroSkeletonCarousel height={height} />;

  switch (style) {
    case "split":
      return <HeroSkeletonSplit height={height} />;
    case "banner":
      return <HeroSkeletonBanner alignment={alignment} />;
    case "minimal":
      return <HeroSkeletonMinimal height={height} alignment={alignment} />;
    case "card":
      return <HeroSkeletonCard height={height} alignment={alignment} />;
    default:
      return <HeroSkeletonDefault height={height} alignment={alignment} />;
  }
}

// ─── Trust Bar Skeleton by style ───

function TrustBarSkeleton({ config }: { config: Record<string, unknown> }) {
  const style = (config.style as string) || "default";
  const columns = (config.columns as number) || 4;
  const iconStyle = (config.iconStyle as string) || "rounded";
  const showDescription = config.showDescription !== false;
  const colClass = columns <= 2 ? "grid-cols-1 sm:grid-cols-2" : columns === 3 ? "grid-cols-1 sm:grid-cols-3" : columns >= 5 ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" : "grid-cols-2 lg:grid-cols-4";
  const iconCls = iconStyle === "circle" ? "rounded-full" : iconStyle === "square" ? "rounded-sm" : iconStyle === "none" ? "hidden" : "rounded-lg";

  if (style === "cards") {
    return (
      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className={`grid ${colClass} gap-4`}>
            {Array.from({ length: columns }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-3 p-6 rounded-xl border bg-card">
                <Skeleton className={`h-12 w-12 ${iconCls}`} />
                <Skeleton className="h-4 w-24" />
                {showDescription && <Skeleton className="h-3 w-32" />}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (style === "minimal") {
    return (
      <section className="py-8 lg:py-10 border-y">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className={`flex flex-wrap justify-center gap-8`}>
            {Array.from({ length: columns }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className={`h-5 w-5 ${iconCls}`} />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (style === "banner") {
    return (
      <section className="py-6 bg-muted">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className={`grid ${colClass} gap-4`}>
            {Array.from({ length: columns }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-3">
                <Skeleton className={`h-10 w-10 ${iconCls}`} />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  {showDescription && <Skeleton className="h-3 w-32" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (style === "centered") {
    return (
      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className={`grid ${colClass} gap-6`}>
            {Array.from({ length: columns }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-3 text-center">
                <Skeleton className={`h-12 w-12 ${iconCls}`} />
                <Skeleton className="h-4 w-24" />
                {showDescription && <Skeleton className="h-3 w-32" />}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // default: border-row
  return (
    <section className="border-y bg-card">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className={`grid ${colClass}`}>
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-4 px-3 sm:py-6 sm:px-6 border-b lg:border-b-0 lg:border-l lg:first:border-l-0">
              <Skeleton className={`h-10 w-10 shrink-0 ${iconCls}`} />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-24" />
                {showDescription && <Skeleton className="h-3 w-32" />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Categories Skeleton ───

function CategoriesSkeleton({ config }: { config: Record<string, unknown> }) {
  const display = (config.display as string) || "carousel";
  const columns = (config.columns as number) || 6;
  const limit = (config.limit as number) || 6;
  const cardRatio = (config.cardRatio as string) || "square";
  const ratioClass = cardRatio === "portrait" ? "aspect-3/4" : cardRatio === "circle" ? "aspect-square rounded-full" : "aspect-square";
  const colClass = `grid-cols-2 sm:grid-cols-3 lg:grid-cols-${Math.min(columns, 6)}`;

  if (display === "grid") {
    return (
      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-9 w-56" />
            </div>
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
          <div className={`grid ${colClass} gap-4`}>
            {Array.from({ length: limit }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className={`w-full ${ratioClass} rounded-lg`} />
                <Skeleton className="h-4 w-3/4 mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // carousel
  return (
    <section className="py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex items-end justify-between mb-12">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-9 w-56" />
          </div>
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: Math.min(limit, 6) }).map((_, i) => (
            <div key={i} className="shrink-0 w-40 space-y-2">
              <Skeleton className={`w-full ${ratioClass} rounded-lg`} />
              <Skeleton className="h-4 w-3/4 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Product Grid Skeleton ───

function ProductGridSkeleton({ config, bg }: { config: Record<string, unknown>; bg?: boolean }) {
  const limit = (config.limit as number) || 8;
  const columns = (config.columns as number) || 4;
  const cardRatio = (config.cardRatio as string) || "portrait";
  const gap = (config.gap as string) || "normal";
  const ratioClass = cardRatio === "square" ? "aspect-square" : cardRatio === "landscape" ? "aspect-4/3" : cardRatio === "wide" ? "aspect-video" : "aspect-3/4";
  const gapClass = gap === "tight" ? "gap-3" : gap === "loose" ? "gap-8" : "gap-6";
  const colClass = columns === 1 ? "grid-cols-1" : columns === 2 ? "grid-cols-1 sm:grid-cols-2" : columns === 3 ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3" : columns === 5 ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" : columns === 6 ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";

  return (
    <section className={`py-20 lg:py-24 ${bg ? "bg-accent/30" : ""}`}>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex items-end justify-between mb-12">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-9 w-52" />
          </div>
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
        <div className={`grid ${colClass} ${gapClass}`}>
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className={`w-full ${ratioClass} rounded-lg`} />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Promo Banner Skeleton ───

function PromoBannerSkeleton({ config }: { config: Record<string, unknown> }) {
  const style = (config.style as string) || "default";

  if (style === "fullwidth" || style === "banner") {
    return (
      <section className="py-8 lg:py-12">
        <Skeleton className="w-full h-48 md:h-64" />
      </section>
    );
  }

  if (style === "split") {
    return (
      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 rounded-2xl border overflow-hidden">
            <div className="p-8 md:p-12 space-y-4 flex flex-col justify-center">
              <Skeleton className="h-7 w-32 rounded-full" />
              <Skeleton className="h-10 w-80 max-w-full" />
              <Skeleton className="h-5 w-64 max-w-full" />
              <Skeleton className="h-11 w-36 rounded-md" />
            </div>
            <Skeleton className="aspect-4/3 md:aspect-auto w-full" />
          </div>
        </div>
      </section>
    );
  }

  if (style === "card") {
    return (
      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="relative rounded-2xl overflow-hidden bg-muted min-h-64 flex items-center justify-center">
            <div className="bg-background/90 rounded-xl p-8 max-w-md space-y-4 text-center">
              <Skeleton className="h-7 w-32 rounded-full mx-auto" />
              <Skeleton className="h-8 w-64 mx-auto" />
              <Skeleton className="h-5 w-48 mx-auto" />
              <Skeleton className="h-11 w-36 rounded-md mx-auto" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (style === "minimal") {
    return (
      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="border-2 border-dashed rounded-2xl p-8 md:p-12 text-center space-y-4">
            <Skeleton className="h-7 w-32 rounded-full mx-auto" />
            <Skeleton className="h-8 w-72 mx-auto" />
            <Skeleton className="h-5 w-56 mx-auto" />
            <Skeleton className="h-11 w-36 rounded-md mx-auto" />
          </div>
        </div>
      </section>
    );
  }

  // default rounded card
  return (
    <section className="py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <Skeleton className="w-full h-64 md:h-80 rounded-2xl" />
      </div>
    </section>
  );
}

// ─── Newsletter Skeleton ───

function NewsletterSkeleton() {
  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-xl text-center space-y-4">
          <Skeleton className="h-4 w-24 mx-auto" />
          <Skeleton className="h-9 w-64 mx-auto" />
          <Skeleton className="h-5 w-80 mx-auto max-w-full" />
          <div className="flex gap-3 mt-8 max-w-md mx-auto">
            <Skeleton className="h-10 flex-1 rounded-md" />
            <Skeleton className="h-10 w-28 rounded-md" />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Rich Text Skeleton ───

function RichTextSkeleton() {
  return (
    <section className="py-16 lg:py-20">
      <div className="mx-auto max-w-3xl px-6 lg:px-8 space-y-4 text-center">
        <Skeleton className="h-8 w-56 mx-auto" />
        <Skeleton className="h-5 w-full max-w-lg mx-auto" />
        <Skeleton className="h-5 w-full max-w-md mx-auto" />
        <Skeleton className="h-5 w-3/4 mx-auto" />
      </div>
    </section>
  );
}

// ─── Custom HTML Skeleton ───

function CustomHtmlSkeleton() {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <Skeleton className="w-full h-48 rounded-lg" />
      </div>
    </section>
  );
}

// ─── Section Skeleton Router ───

function renderSectionSkeleton(type: string, config: Record<string, unknown>, index: number) {
  // Alternate backgrounds for product grids
  const bg = index % 2 === 1;
  switch (type) {
    case "hero":
      return <HeroSkeleton config={config} />;
    case "trust-bar":
      return <TrustBarSkeleton config={config} />;
    case "categories":
      return <CategoriesSkeleton config={config} />;
    case "featured-products":
      return <ProductGridSkeleton config={config} bg={bg} />;
    case "new-arrivals":
      return <ProductGridSkeleton config={config} bg={bg} />;
    case "promo-banner":
      return <PromoBannerSkeleton config={config} />;
    case "newsletter":
      return <NewsletterSkeleton />;
    case "rich-text":
      return <RichTextSkeleton />;
    case "custom-html":
      return <CustomHtmlSkeleton />;
    default:
      return null;
  }
}

// ─── Static Fallback (when DB is unavailable) ───

function StaticFallbackSkeleton() {
  return (
    <div>
      <HeroSkeletonDefault />
      <TrustBarSkeleton config={{ style: "default", columns: 4 }} />
      <ProductGridSkeleton config={{ limit: 8, columns: 4 }} bg={false} />
      <CategoriesSkeleton config={{ display: "carousel", limit: 6 }} />
      <PromoBannerSkeleton config={{}} />
      <ProductGridSkeleton config={{ limit: 4, columns: 4 }} bg />
      <NewsletterSkeleton />
    </div>
  );
}

// ─── Main Dynamic Skeleton ───

export async function TemplateSkeleton() {
  let activeTemplate:
    | {
        id: string;
        sections: {
          id: string;
          type: string;
          config: string | null;
          isVisible: boolean;
        }[];
      }
    | undefined;

  try {
    activeTemplate = await db.query.templates.findFirst({
      where: eq(templates.isActive, true),
      columns: { id: true },
      with: {
        sections: {
          orderBy: [asc(templateSections.sortOrder)],
          columns: { id: true, type: true, config: true, isVisible: true },
        },
      },
    });
  } catch {
    return <StaticFallbackSkeleton />;
  }

  if (!activeTemplate || activeTemplate.sections.length === 0) {
    return <StaticFallbackSkeleton />;
  }

  const visibleSections = activeTemplate.sections.filter((s) => s.isVisible);

  return (
    <div>
      {visibleSections.map((section, index) => {
        let config: Record<string, unknown> = {};
        try {
          config = section.config ? JSON.parse(section.config) : {};
        } catch {
          /* empty */
        }
        return (
          <div key={section.id}>
            {renderSectionSkeleton(section.type, config, index)}
          </div>
        );
      })}
    </div>
  );
}
