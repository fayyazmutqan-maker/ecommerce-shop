import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Truck,
  RotateCcw,
  ShieldCheck,
  Headphones,
  Clock,
  Award,
  Gift,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NewsletterForm } from "@/components/store/newsletter-form";
import { ProductCardGrid, type ProductGridLayout } from "@/components/store/product-card-grid";
import { CategoryCarousel, type CategoryGridLayout } from "@/components/store/category-carousel";
import { HeroSlideshow, type HeroSlide } from "@/components/store/hero-slideshow";
import { HeroCountdown } from "@/components/store/hero-countdown";
import { db } from "@/lib/db";
import {
  products,
  categories as categoriesTable,
  productImages,
  templates,
  templateSections,
} from "@/lib/schema";
import { eq, desc, asc, and, isNull, gte } from "drizzle-orm";
import { getLocale } from "next-intl/server";
import { applyTranslationsBatch } from "@/lib/translations";

// ─── Icon map for trust bar ───
const TRUST_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  truck: Truck,
  "rotate-ccw": RotateCcw,
  "shield-check": ShieldCheck,
  headphones: Headphones,
  clock: Clock,
  award: Award,
  gift: Gift,
  heart: Heart,
};

// ─── Hero gradient overlay map ───
const GRADIENT_OVERLAY: Record<string, string> = {
  bottom: "bg-linear-to-t from-black/60 via-black/20 to-transparent",
  top: "bg-linear-to-b from-black/60 via-black/20 to-transparent",
  left: "bg-linear-to-r from-black/60 via-black/20 to-transparent",
  right: "bg-linear-to-l from-black/60 via-black/20 to-transparent",
  radial: "bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.55))]",
  vignette: "bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.65))]",
};

// ─── Hero content animation map ───
const ANIM_CLASS: Record<string, string> = {
  "fade-up": "animate-fade-up",
  "fade-in": "animate-fade-in",
  "slide-left": "animate-slide-left",
  "slide-right": "animate-slide-right",
  zoom: "animate-zoom-in",
};

// ─── Types ───
interface TemplateSection {
  id: string;
  name: string;
  type: string;
  config: string | null;
  content: string | null;
  sortOrder: number;
  isVisible: boolean;
}

function parseJSON(json: string | null): Record<string, unknown> {
  if (!json) return {};
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

// ─── Section: Hero Banner ───
function HeroSection({ config, content }: { config: Record<string, unknown>; content: Record<string, unknown> }) {
  // ── Parse content ──
  const title = (content.title as string) || "Welcome";
  const badge = (content.badge as string) || "";
  const subtitle = (content.subtitle as string) || "";
  const buttonText = (content.buttonText as string) || "";
  const buttonLink = (content.buttonLink as string) || "/products";
  const secondaryButtonText = (content.secondaryButtonText as string) || "";
  const secondaryButtonLink = (content.secondaryButtonLink as string) || "/collections";

  // ── Parse config ──
  const imageUrl = (config.imageUrl as string) || "";
  const videoUrl = (config.videoUrl as string) || "";
  const overlay = config.overlay !== false;
  const overlayOpacity = typeof config.overlayOpacity === "number" ? config.overlayOpacity : 0.4;
  const overlayGradient = (config.overlayGradient as string) || "none";
  const alignment = (config.alignment as string) || "center";
  const height = (config.height as string) || "large";
  const style = (config.style as string) || "default";
  const backgroundColor = (config.backgroundColor as string) || "";
  const textColor = (config.textColor as string) || "";
  const contentAnimation = (config.contentAnimation as string) || "none";
  const countdown = config.countdown as { enabled?: boolean; endDate?: string; label?: string; variant?: string } | undefined;

  // ── Carousel / slideshow mode ──
  const mode = (config.mode as string) || "single";
  const slides = Array.isArray(content.slides) ? (content.slides as HeroSlide[]) : [];

  if (mode === "carousel" && slides.length > 0) {
    return (
      <HeroSlideshow
        config={{
          slides,
          style,
          height,
          alignment,
          overlay,
          overlayOpacity,
          overlayGradient,
          backgroundColor,
          textColor,
          autoplay: config.autoplay !== false,
          autoplayInterval: (config.autoplayInterval as number) || 5000,
          showArrows: config.showArrows !== false,
          showDots: config.showDots !== false,
          transition: (config.transition as string) || "fade",
          parallax: config.parallax === true,
          contentAnimation,
          showProgress: config.showProgress !== false,
        }}
      />
    );
  }

  // ── Shared helpers ──
  const hasMedia = !!(imageUrl || videoUrl);
  const animClass = ANIM_CLASS[contentAnimation] || "";

  const heightClass: Record<string, string> = {
    small: "py-16 lg:py-20",
    medium: "py-20 lg:py-28",
    large: "py-24 lg:py-36",
    full: "min-h-[80vh] flex items-center",
  };
  const alignClass: Record<string, string> = {
    left: "text-left",
    center: "text-center mx-auto",
    right: "text-right ml-auto",
  };
  const hClass = heightClass[height] || heightClass.large;
  const aClass = alignClass[alignment] || alignClass.left;

  /** Render image or video background */
  const renderMedia = () =>
    videoUrl ? (
      <video
        src={videoUrl}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      />
    ) : imageUrl ? (
      <Image src={imageUrl} alt={title} fill className="object-cover" priority />
    ) : null;

  /** Render solid + gradient overlay */
  const renderOverlay = () => (
    <>
      {overlay && hasMedia && (
        <div className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity }} />
      )}
      {overlayGradient !== "none" && hasMedia && GRADIENT_OVERLAY[overlayGradient] && (
        <div className={`absolute inset-0 ${GRADIENT_OVERLAY[overlayGradient]}`} />
      )}
    </>
  );

  /** Render countdown timer */
  const renderCountdown = () =>
    countdown?.enabled && countdown.endDate ? (
      <div className="relative z-10 flex justify-center pt-4">
        <HeroCountdown
          endDate={countdown.endDate}
          label={countdown.label}
          variant={(countdown.variant as "default" | "minimal" | "badge") || (hasMedia && overlay ? "default" : "badge")}
        />
      </div>
    ) : null;

  // Shared content block renderer
  const renderContent = (extraTitleClass?: string, extraSubClass?: string, extraBtnClass?: string) => (
    <div className={`max-w-2xl space-y-8 ${aClass} ${animClass}`}>
      {badge && (
        <Badge
          variant="secondary"
          className="px-4 py-1.5 text-xs font-semibold tracking-wide uppercase"
        >
          {badge}
        </Badge>
      )}
      <h1 className={`text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08] ${extraTitleClass || ""}`}
          style={textColor ? { color: textColor } : undefined}>
        {title.split("\n").map((line, i) => (
          <span key={i}>
            {i > 0 && <br />}
            {i > 0 ? <span className="text-muted-foreground">{line}</span> : line}
          </span>
        ))}
      </h1>
      {subtitle && (
        <p className={`text-lg max-w-md leading-relaxed ${extraSubClass || "text-muted-foreground"} ${alignment === "center" ? "mx-auto" : ""}`}
           style={textColor ? { color: textColor, opacity: 0.8 } : undefined}>
          {subtitle}
        </p>
      )}
      <div className={`flex flex-col sm:flex-row gap-4 pt-2 ${alignment === "center" ? "justify-center" : alignment === "right" ? "justify-end" : ""}`}>
        {buttonText && (
          <Button size="lg" className="h-12 px-8 text-[15px]" asChild>
            <Link href={buttonLink}>
              {buttonText}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
        {secondaryButtonText && (
          <Button size="lg" variant="outline" className={`h-12 px-8 text-[15px] ${extraBtnClass || ""}`} asChild>
            <Link href={secondaryButtonLink}>{secondaryButtonText}</Link>
          </Button>
        )}
      </div>
      {renderCountdown()}
    </div>
  );

  // ── Style: Split (text left, image/video right) ──
  if (style === "split" && hasMedia) {
    return (
      <section className="relative overflow-hidden" style={backgroundColor ? { backgroundColor } : undefined}>
        <div className={`mx-auto max-w-7xl px-6 lg:px-8 ${hClass}`}>
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className={`space-y-8 ${animClass}`}>
              {badge && (
                <Badge variant="secondary" className="px-4 py-1.5 text-xs font-semibold tracking-wide uppercase">
                  {badge}
                </Badge>
              )}
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08]"
                  style={textColor ? { color: textColor } : undefined}>
                {title.split("\n").map((line, i) => (
                  <span key={i}>
                    {i > 0 && <br />}
                    {i > 0 ? <span className="text-muted-foreground">{line}</span> : line}
                  </span>
                ))}
              </h1>
              {subtitle && (
                <p className="text-lg max-w-md leading-relaxed text-muted-foreground"
                   style={textColor ? { color: textColor, opacity: 0.8 } : undefined}>
                  {subtitle}
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                {buttonText && (
                  <Button size="lg" className="h-12 px-8 text-[15px]" asChild>
                    <Link href={buttonLink}>
                      {buttonText}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                )}
                {secondaryButtonText && (
                  <Button size="lg" variant="outline" className="h-12 px-8 text-[15px]" asChild>
                    <Link href={secondaryButtonLink}>{secondaryButtonText}</Link>
                  </Button>
                )}
              </div>
              {renderCountdown()}
            </div>
            <div className="relative aspect-4/3 lg:aspect-square rounded-2xl overflow-hidden">
              {videoUrl ? (
                <video src={videoUrl} autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <Image src={imageUrl} alt={title} fill className="object-cover" priority />
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ── Style: Minimal (clean, no gradient, simple layout) ──
  if (style === "minimal") {
    return (
      <section className="relative" style={backgroundColor ? { backgroundColor } : undefined}>
        <div className={`mx-auto max-w-7xl px-6 lg:px-8 ${hClass}`}>
          <div className={`max-w-3xl space-y-6 ${aClass} ${animClass}`}>
            {badge && (
              <Badge variant="outline" className="px-3 py-1 text-xs font-medium tracking-wide uppercase border-foreground/20">
                {badge}
              </Badge>
            )}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.12]"
                style={textColor ? { color: textColor } : undefined}>
              {title.split("\n").map((line, i) => (
                <span key={i}>
                  {i > 0 && <br />}
                  {line}
                </span>
              ))}
            </h1>
            {subtitle && (
              <p className={`text-lg leading-relaxed text-muted-foreground ${alignment === "center" ? "mx-auto max-w-lg" : "max-w-md"}`}
                 style={textColor ? { color: textColor, opacity: 0.7 } : undefined}>
                {subtitle}
              </p>
            )}
            <div className={`flex flex-col sm:flex-row gap-3 pt-1 ${alignment === "center" ? "justify-center" : alignment === "right" ? "justify-end" : ""}`}>
              {buttonText && (
                <Button size="lg" className="h-11 px-7 text-sm" asChild>
                  <Link href={buttonLink}>{buttonText}</Link>
                </Button>
              )}
              {secondaryButtonText && (
                <Button size="lg" variant="ghost" className="h-11 px-7 text-sm underline-offset-4 hover:underline" asChild>
                  <Link href={secondaryButtonLink}>{secondaryButtonText}</Link>
                </Button>
              )}
            </div>
            {renderCountdown()}
          </div>
        </div>
      </section>
    );
  }

  // ── Style: Banner (full-width image/video, text overlay, bolder) ──
  if (style === "banner" && hasMedia) {
    return (
      <section className="relative overflow-hidden min-h-[60vh] lg:min-h-[70vh] flex items-center">
        {renderMedia()}
        {renderOverlay()}
        {/* fallback gradient if no explicit gradient overlay */}
        {overlayGradient === "none" && (
          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-black/20" />
        )}
        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8 w-full py-20">
          <div className={`max-w-2xl space-y-6 ${aClass} ${animClass}`}>
            {badge && (
              <Badge className="bg-white/20 text-white border-white/30 px-4 py-1.5 text-xs font-semibold tracking-wide uppercase backdrop-blur-sm">
                {badge}
              </Badge>
            )}
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] text-white drop-shadow-lg">
              {title.split("\n").map((line, i) => (
                <span key={i}>
                  {i > 0 && <br />}
                  {line}
                </span>
              ))}
            </h1>
            {subtitle && (
              <p className={`text-lg max-w-lg leading-relaxed text-white/90 drop-shadow ${alignment === "center" ? "mx-auto" : ""}`}>
                {subtitle}
              </p>
            )}
            <div className={`flex flex-col sm:flex-row gap-4 pt-2 ${alignment === "center" ? "justify-center" : alignment === "right" ? "justify-end" : ""}`}>
              {buttonText && (
                <Button size="lg" className="h-13 px-10 text-base bg-white text-black hover:bg-white/90" asChild>
                  <Link href={buttonLink}>
                    {buttonText}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
              {secondaryButtonText && (
                <Button size="lg" variant="outline" className="h-13 px-10 text-base border-white/50 text-white hover:bg-white/10" asChild>
                  <Link href={secondaryButtonLink}>{secondaryButtonText}</Link>
                </Button>
              )}
            </div>
            {renderCountdown()}
          </div>
        </div>
      </section>
    );
  }

  // ── Style: Card (content in a floating card over background) ──
  if (style === "card") {
    return (
      <section className="relative overflow-hidden bg-accent/30" style={backgroundColor ? { backgroundColor } : undefined}>
        {hasMedia && (
          <>
            {renderMedia()}
            {overlay && (
              <div className="absolute inset-0 bg-black/30" />
            )}
          </>
        )}
        <div className={`relative z-10 mx-auto max-w-7xl px-6 lg:px-8 ${hClass}`}>
          <div className={`${alignment === "center" ? "flex justify-center" : alignment === "right" ? "flex justify-end" : ""}`}>
            <div className={`bg-background/95 backdrop-blur-md rounded-2xl p-8 md:p-12 max-w-xl shadow-2xl border ${animClass}`}>
              <div className="space-y-6">
                {badge && (
                  <Badge variant="secondary" className="px-4 py-1.5 text-xs font-semibold tracking-wide uppercase">
                    {badge}
                  </Badge>
                )}
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.1]">
                  {title.split("\n").map((line, i) => (
                    <span key={i}>
                      {i > 0 && <br />}
                      {i > 0 ? <span className="text-muted-foreground">{line}</span> : line}
                    </span>
                  ))}
                </h1>
                {subtitle && (
                  <p className="text-base leading-relaxed text-muted-foreground">{subtitle}</p>
                )}
                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                  {buttonText && (
                    <Button size="lg" className="h-11 px-7 text-sm" asChild>
                      <Link href={buttonLink}>
                        {buttonText}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                  {secondaryButtonText && (
                    <Button size="lg" variant="outline" className="h-11 px-7 text-sm" asChild>
                      <Link href={secondaryButtonLink}>{secondaryButtonText}</Link>
                    </Button>
                  )}
                </div>
                {renderCountdown()}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ── Style: Default (gradient background with optional image/video) ──
  return (
    <section className="relative overflow-hidden bg-linear-to-b from-accent/60 via-background to-background" style={backgroundColor ? { backgroundColor } : undefined}>
      {hasMedia && (
        <>
          {renderMedia()}
          {renderOverlay()}
        </>
      )}
      <div className={`relative z-10 mx-auto max-w-7xl px-6 lg:px-8 ${hClass}`}>
        {renderContent(
          hasMedia && overlay ? "text-white" : "",
          hasMedia && overlay ? "text-white/80" : "text-muted-foreground",
          hasMedia && overlay ? "border-white/40 text-white hover:bg-white/10" : ""
        )}
      </div>
      {!hasMedia && (
        <div className="absolute top-0 right-0 w-1/2 h-full bg-[radial-gradient(ellipse_at_80%_20%,var(--accent),transparent_70%)] opacity-40 pointer-events-none" />
      )}
    </section>
  );
}

// ─── Section: Trust Bar ───
function TrustBarSection({ config, content }: { config: Record<string, unknown>; content: Record<string, unknown> }) {
  const items = (content.items as Array<{ icon?: string; title: string; description: string }>) || [];
  const style = (config.style as string) || "default";
  const columns = (config.columns as number) || items.length || 4;
  const iconStyle = (config.iconStyle as string) || "rounded";
  const showDescription = config.showDescription !== false;
  const backgroundColor = (config.backgroundColor as string) || "";
  const textColor = (config.textColor as string) || "";

  if (items.length === 0) return null;

  const colClass: Record<number, string> = {
    2: "grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-3",
    4: "grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-2 lg:grid-cols-5",
    6: "grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
  };

  const iconShapeClass: Record<string, string> = {
    rounded: "rounded-lg",
    circle: "rounded-full",
    square: "rounded-none",
    none: "hidden",
  };

  // ── Style: Cards (each item in its own card) ──
  if (style === "cards") {
    return (
      <section className="py-8 lg:py-12" style={backgroundColor ? { backgroundColor } : undefined}>
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className={`grid ${colClass[columns] || colClass[4]} gap-4 md:gap-6`}>
            {items.map((item) => {
              const Icon = TRUST_ICONS[item.icon || "shield-check"] || ShieldCheck;
              return (
                <div
                  key={item.title}
                  className="flex flex-col items-center text-center p-5 md:p-6 rounded-xl border bg-card shadow-sm"
                >
                  {iconStyle !== "none" && (
                    <div className={`flex h-12 w-12 items-center justify-center ${iconShapeClass[iconStyle] || iconShapeClass.rounded} bg-primary/10 mb-3`}>
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <p className="text-sm font-semibold" style={textColor ? { color: textColor } : undefined}>{item.title}</p>
                  {showDescription && item.description && (
                    <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  // ── Style: Minimal (icons + text in a row, no borders) ──
  if (style === "minimal") {
    return (
      <section className="py-6 lg:py-8" style={backgroundColor ? { backgroundColor } : undefined}>
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className={`flex flex-wrap justify-center gap-6 md:gap-10 lg:gap-14`}>
            {items.map((item) => {
              const Icon = TRUST_ICONS[item.icon || "shield-check"] || ShieldCheck;
              return (
                <div key={item.title} className="flex items-center gap-2.5">
                  {iconStyle !== "none" && (
                    <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-medium" style={textColor ? { color: textColor } : undefined}>{item.title}</p>
                    {showDescription && item.description && (
                      <p className="text-[11px] text-muted-foreground">{item.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  // ── Style: Banner (colored background strip) ──
  if (style === "banner") {
    return (
      <section
        className="bg-foreground text-background py-4 lg:py-5"
        style={backgroundColor ? { backgroundColor, color: textColor || undefined } : undefined}
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className={`grid ${colClass[columns] || colClass[4]} gap-4`}>
            {items.map((item) => {
              const Icon = TRUST_ICONS[item.icon || "shield-check"] || ShieldCheck;
              return (
                <div key={item.title} className="flex items-center gap-3 justify-center text-center">
                  {iconStyle !== "none" && (
                    <Icon className="h-4 w-4 shrink-0 opacity-80" />
                  )}
                  <div>
                    <p className="text-xs font-semibold">{item.title}</p>
                    {showDescription && item.description && (
                      <p className="text-[10px] opacity-70">{item.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  // ── Style: Centered (stacked icon + text, centered layout) ──
  if (style === "centered") {
    return (
      <section className="py-10 lg:py-14 border-y" style={backgroundColor ? { backgroundColor } : undefined}>
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className={`grid ${colClass[columns] || colClass[4]} gap-8`}>
            {items.map((item) => {
              const Icon = TRUST_ICONS[item.icon || "shield-check"] || ShieldCheck;
              return (
                <div key={item.title} className="flex flex-col items-center text-center space-y-2">
                  {iconStyle !== "none" && (
                    <div className={`flex h-14 w-14 items-center justify-center ${iconShapeClass[iconStyle] || iconShapeClass.rounded} bg-accent`}>
                      <Icon className="h-7 w-7 text-foreground" />
                    </div>
                  )}
                  <p className="text-sm font-semibold" style={textColor ? { color: textColor } : undefined}>{item.title}</p>
                  {showDescription && item.description && (
                    <p className="text-xs text-muted-foreground max-w-45">{item.description}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  // ── Style: Default (border row with icon boxes) ──
  return (
    <section className="border-y bg-card" style={backgroundColor ? { backgroundColor } : undefined}>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className={`grid ${colClass[columns] || colClass[4]}`}>
          {items.map((item) => {
            const Icon = TRUST_ICONS[item.icon || "shield-check"] || ShieldCheck;
            return (
              <div
                key={item.title}
                className="flex items-center gap-4 py-4 px-3 sm:py-6 sm:px-6 border-b lg:border-b-0 lg:border-l lg:first:border-l-0"
              >
                {iconStyle !== "none" && (
                  <div className={`flex h-10 w-10 items-center justify-center ${iconShapeClass[iconStyle] || iconShapeClass.rounded} bg-accent shrink-0`}>
                    <Icon className="h-5 w-5 text-foreground" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold" style={textColor ? { color: textColor } : undefined}>{item.title}</p>
                  {showDescription && item.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Section: Categories ───
async function CategoriesSection({ config, content }: { config: Record<string, unknown>; content: Record<string, unknown> }) {
  const limit = (config.limit as number) || 12;
  const title = (content.title as string) || "Shop by Category";
  const subtitle = (content.subtitle as string) || "";
  const layout: CategoryGridLayout = {
    display: (config.display as CategoryGridLayout["display"]) || "carousel",
    columns: (config.columns as number) || 6,
    gap: (config.gap as CategoryGridLayout["gap"]) || "normal",
    cardRatio: (config.cardRatio as CategoryGridLayout["cardRatio"]) || "square",
    showImage: config.showImage !== false,
    showCount: config.showCount === true,
  };

  const locale = await getLocale();
  const rawCategories = await db.query.categories.findMany({
    where: and(eq(categoriesTable.isActive, true), isNull(categoriesTable.parentId)),
    orderBy: [asc(categoriesTable.sortOrder)],
    limit,
  });
  const cats = await applyTranslationsBatch("category", rawCategories as Record<string, unknown>[], locale) as typeof rawCategories;

  if (cats.length === 0) return null;

  return (
    <section className="py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex items-end justify-between mb-12">
          <div>
            {subtitle && (
              <p className="text-sm font-semibold text-muted-foreground tracking-wide uppercase mb-2">
                {subtitle}
              </p>
            )}
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">{title}</h2>
          </div>
          <Button variant="ghost" className="text-sm font-medium" asChild>
            <Link href="/collections">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <CategoryCarousel categories={cats} layout={layout} />
      </div>
    </section>
  );
}

// ─── Section: Featured Products ───
async function FeaturedProductsSection({ config, content }: { config: Record<string, unknown>; content: Record<string, unknown> }) {
  const limit = (config.limit as number) || 8;
  const title = (content.title as string) || "Featured Products";
  const subtitle = (content.subtitle as string) || "";
  const viewAllLink = (content.viewAllLink as string) || "/products?featured=true";
  const layout: ProductGridLayout = {
    columns: (config.columns as number) || 4,
    gap: (config.gap as ProductGridLayout["gap"]) || "normal",
    cardRatio: (config.cardRatio as ProductGridLayout["cardRatio"]) || "portrait",
    showAddToCart: config.showAddToCart !== false,
    showWishlist: config.showWishlist !== false,
    showBadges: config.showBadges !== false,
  };

  const locale = await getLocale();
  const rawProducts = await db.query.products.findMany({
    where: and(eq(products.status, "ACTIVE"), eq(products.isFeatured, true)),
    with: { images: { orderBy: [asc(productImages.position)] } },
    limit,
    orderBy: [desc(products.createdAt)],
  });
  const featuredProducts = await applyTranslationsBatch("product", rawProducts as Record<string, unknown>[], locale) as typeof rawProducts;

  if (featuredProducts.length === 0) return null;

  return (
    <section className="py-20 lg:py-24 bg-accent/30">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex items-end justify-between mb-12">
          <div>
            {subtitle && (
              <p className="text-sm font-semibold text-muted-foreground tracking-wide uppercase mb-2">
                {subtitle}
              </p>
            )}
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">{title}</h2>
          </div>
          <Button variant="ghost" className="text-sm font-medium" asChild>
            <Link href={viewAllLink}>
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <ProductCardGrid
          products={featuredProducts.map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            price: Number(p.price),
            compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
            images: p.images.map((i) => i.url),
            isNew: false,
          }))}
          layout={layout}
        />
      </div>
    </section>
  );
}

// ─── Section: New Arrivals ───
async function NewArrivalsSection({ config, content }: { config: Record<string, unknown>; content: Record<string, unknown> }) {
  const limit = (config.limit as number) || 8;
  const title = (content.title as string) || "New Arrivals";
  const subtitle = (content.subtitle as string) || "";
  const viewAllLink = (content.viewAllLink as string) || "/products?sort=newest";
  const daysBack = (config.daysBack as number) || 0;
  const layout: ProductGridLayout = {
    columns: (config.columns as number) || 4,
    gap: (config.gap as ProductGridLayout["gap"]) || "normal",
    cardRatio: (config.cardRatio as ProductGridLayout["cardRatio"]) || "portrait",
    showAddToCart: config.showAddToCart !== false,
    showWishlist: config.showWishlist !== false,
    showBadges: config.showBadges !== false,
  };

  const locale = await getLocale();

  const whereConditions = [eq(products.status, "ACTIVE")];
  if (daysBack > 0) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysBack);
    whereConditions.push(gte(products.createdAt, cutoff));
  }

  const rawProducts = await db.query.products.findMany({
    where: and(...whereConditions),
    with: { images: { orderBy: [asc(productImages.position)] } },
    limit,
    orderBy: [desc(products.createdAt)],
  });
  const newProducts = await applyTranslationsBatch("product", rawProducts as Record<string, unknown>[], locale) as typeof rawProducts;

  if (newProducts.length === 0) return null;

  return (
    <section className="py-20 lg:py-24 bg-accent/30">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex items-end justify-between mb-12">
          <div>
            {subtitle && (
              <p className="text-sm font-semibold text-muted-foreground tracking-wide uppercase mb-2">
                {subtitle}
              </p>
            )}
            <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">{title}</h2>
          </div>
          <Button variant="ghost" className="text-sm font-medium" asChild>
            <Link href={viewAllLink}>
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <ProductCardGrid
          products={newProducts.map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            price: Number(p.price),
            compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
            images: p.images.map((i) => i.url),
            isNew: true,
          }))}
          layout={layout}
        />
      </div>
    </section>
  );
}

// ─── Section: Promo Banner ───
function PromoBannerSection({ config, content }: { config: Record<string, unknown>; content: Record<string, unknown> }) {
  const title = (content.title as string) || "";
  const subtitle = (content.subtitle as string) || "";
  const buttonText = (content.buttonText as string) || "";
  const buttonLink = (content.buttonLink as string) || "/products";
  const badge = (content.badge as string) || "";
  const imageUrl = (config.imageUrl as string) || "";
  const backgroundColor = (config.backgroundColor as string) || "";
  const textColor = (config.textColor as string) || "#ffffff";
  const alignment = (config.alignment as string) || "center";
  const style = (config.style as string) || "default";
  const height = (config.height as string) || "medium";
  const overlay = config.overlay !== false;
  const overlayOpacity = typeof config.overlayOpacity === "number" ? config.overlayOpacity : 0.4;

  if (!title) return null;

  const alignClass: Record<string, string> = {
    left: "text-left",
    center: "text-center mx-auto",
    right: "text-right ml-auto",
  };
  const aClass = alignClass[alignment] || alignClass.left;

  const heightClass: Record<string, string> = {
    small: "py-10 md:py-12",
    medium: "py-16 md:py-20",
    large: "py-20 md:py-28",
    full: "py-28 md:py-36",
  };
  const hClass = heightClass[height] || heightClass.medium;

  const hasCustomBg = backgroundColor || imageUrl;

  // Shared badge + title + subtitle + button renderer
  const renderPromoContent = (titleClass?: string, subClass?: string, badgeClass?: string) => (
    <>
      {badge && (
        <p className={`text-sm font-semibold tracking-wide uppercase mb-4 ${badgeClass || "opacity-70"}`}>
          {badge}
        </p>
      )}
      <h2 className={`text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight ${titleClass || ""}`}>
        {title.split("\n").map((line, i) => (
          <span key={i}>{i > 0 && <br />}{line}</span>
        ))}
      </h2>
      {subtitle && (
        <p className={`mt-4 text-base leading-relaxed max-w-md ${subClass || "opacity-70"}`}>
          {subtitle}
        </p>
      )}
      {buttonText && (
        <Button size="lg" variant="secondary" className="mt-8 h-12 px-8 text-[15px]" asChild>
          <Link href={buttonLink}>{buttonText}</Link>
        </Button>
      )}
    </>
  );

  // ── Style: Full Width (edge-to-edge image, no rounded corners) ──
  if (style === "fullwidth") {
    return (
      <section
        className={`relative overflow-hidden ${!hasCustomBg ? "bg-foreground text-background" : ""}`}
        style={hasCustomBg ? { backgroundColor: backgroundColor || undefined, color: textColor } : undefined}
      >
        {imageUrl && (
          <>
            <Image src={imageUrl} alt={title} fill className="object-cover" />
            {overlay && <div className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity }} />}
          </>
        )}
        <div className={`relative z-10 mx-auto max-w-7xl px-6 lg:px-8 ${hClass}`}>
          <div className={`max-w-xl ${aClass}`}>
            {renderPromoContent()}
          </div>
        </div>
        {!imageUrl && (
          <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_70%_50%,rgba(255,255,255,0.08),transparent_70%)]" />
        )}
      </section>
    );
  }

  // ── Style: Split (text + image side by side) ──
  if (style === "split" && imageUrl) {
    return (
      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div
            className={`relative rounded-2xl overflow-hidden ${!hasCustomBg ? "bg-foreground text-background" : ""}`}
            style={hasCustomBg ? { backgroundColor: backgroundColor || undefined, color: textColor } : undefined}
          >
            <div className="grid lg:grid-cols-2">
              <div className={`p-8 md:p-12 lg:p-16 flex flex-col justify-center ${hClass}`}>
                {renderPromoContent()}
              </div>
              <div className="relative min-h-75 lg:min-h-0">
                <Image src={imageUrl} alt={title} fill className="object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ── Style: Minimal (light border, no heavy background) ──
  if (style === "minimal") {
    return (
      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div
            className="relative rounded-2xl border-2 border-dashed border-foreground/20 overflow-hidden"
            style={backgroundColor ? { backgroundColor, color: textColor } : undefined}
          >
            <div className={`px-8 ${hClass} max-w-xl ${aClass}`}>
              {badge && (
                <Badge variant="outline" className="px-3 py-1 text-xs font-medium tracking-wide uppercase border-foreground/20 mb-4">
                  {badge}
                </Badge>
              )}
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
                {title.split("\n").map((line, i) => (
                  <span key={i}>{i > 0 && <br />}{line}</span>
                ))}
              </h2>
              {subtitle && (
                <p className="mt-3 text-base text-muted-foreground leading-relaxed max-w-md">
                  {subtitle}
                </p>
              )}
              {buttonText && (
                <Button size="lg" className="mt-6 h-11 px-7 text-sm" asChild>
                  <Link href={buttonLink}>{buttonText}</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ── Style: Banner (compact colored strip, no container padding) ──
  if (style === "banner") {
    return (
      <section
        className={`relative overflow-hidden ${!hasCustomBg ? "bg-foreground text-background" : ""}`}
        style={hasCustomBg ? { backgroundColor: backgroundColor || undefined, color: textColor } : undefined}
      >
        {imageUrl && (
          <>
            <Image src={imageUrl} alt={title} fill className="object-cover" />
            {overlay && <div className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity }} />}
          </>
        )}
        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8 py-6 md:py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {badge && (
                <span className="text-xs font-bold tracking-wider uppercase bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                  {badge}
                </span>
              )}
              <div>
                <p className="text-lg md:text-xl font-bold">{title}</p>
                {subtitle && <p className="text-sm opacity-70">{subtitle}</p>}
              </div>
            </div>
            {buttonText && (
              <Button size="sm" variant="secondary" className="shrink-0 px-6" asChild>
                <Link href={buttonLink}>{buttonText}</Link>
              </Button>
            )}
          </div>
        </div>
      </section>
    );
  }

  // ── Style: Card (content in a frosted card over image) ──
  if (style === "card") {
    return (
      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="relative rounded-2xl overflow-hidden min-h-87.5 flex items-center">
            {imageUrl ? (
              <>
                <Image src={imageUrl} alt={title} fill className="object-cover" />
                {overlay && <div className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity }} />}
              </>
            ) : (
              <div
                className={`absolute inset-0 ${!backgroundColor ? "bg-foreground" : ""}`}
                style={backgroundColor ? { backgroundColor } : undefined}
              />
            )}
            <div className={`relative z-10 w-full p-8 md:p-12 ${alignment === "center" ? "flex justify-center" : alignment === "right" ? "flex justify-end" : ""}`}>
              <div className="bg-background/95 backdrop-blur-md rounded-xl p-8 md:p-10 max-w-lg shadow-2xl border">
                {badge && (
                  <Badge variant="secondary" className="px-3 py-1 text-xs font-semibold tracking-wide uppercase mb-4">
                    {badge}
                  </Badge>
                )}
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight">
                  {title.split("\n").map((line, i) => (
                    <span key={i}>{i > 0 && <br />}{line}</span>
                  ))}
                </h2>
                {subtitle && (
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{subtitle}</p>
                )}
                {buttonText && (
                  <Button size="lg" className="mt-6 h-11 px-7 text-sm" asChild>
                    <Link href={buttonLink}>
                      {buttonText}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ── Style: Default (rounded card with optional image) ──
  return (
    <section className="py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div
          className={`relative rounded-2xl overflow-hidden ${!hasCustomBg ? "bg-foreground text-background" : ""}`}
          style={hasCustomBg ? {
            backgroundColor: backgroundColor || undefined,
            color: textColor,
          } : undefined}
        >
          {imageUrl && (
            <>
              <Image src={imageUrl} alt={title} fill className="object-cover" />
              {overlay && <div className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity }} />}
            </>
          )}
          <div className={`relative z-10 px-8 ${hClass} md:px-16 max-w-xl ${aClass}`}>
            {renderPromoContent()}
          </div>
          {!imageUrl && (
            <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_70%_50%,rgba(255,255,255,0.08),transparent_70%)]" />
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Section: Newsletter ───
function NewsletterSection({ content }: { content: Record<string, unknown> }) {
  const title = (content.title as string) || "Join Our Newsletter";
  const subtitle = (content.subtitle as string) || "";
  const disclaimer = (content.disclaimer as string) || "No spam, unsubscribe at any time.";

  return (
    <section className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-sm font-semibold text-muted-foreground tracking-wide uppercase mb-3">
            Stay Updated
          </p>
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight">{title}</h2>
          {subtitle && (
            <p className="text-muted-foreground mt-4 text-base leading-relaxed">{subtitle}</p>
          )}
          <div className="mt-8 max-w-md mx-auto">
            <NewsletterForm />
          </div>
          {disclaimer && (
            <p className="text-xs text-muted-foreground mt-4">{disclaimer}</p>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Section: Rich Text ───
function RichTextSection({ config, content }: { config: Record<string, unknown>; content: Record<string, unknown> }) {
  const html = (content.html as string) || "";
  const alignment = (config.alignment as string) || "left";
  const maxWidth = (config.maxWidth as string) || "medium";
  const padding = (config.padding as string) || "medium";

  if (!html) return null;

  const widthClass = {
    narrow: "max-w-xl",
    medium: "max-w-3xl",
    wide: "max-w-5xl",
    full: "max-w-7xl",
  }[maxWidth] || "max-w-3xl";

  const paddingClass = {
    small: "py-10 lg:py-12",
    medium: "py-16 lg:py-20",
    large: "py-20 lg:py-28",
  }[padding] || "py-16 lg:py-20";

  const alignClass = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  }[alignment] || "text-left";

  return (
    <section className={paddingClass}>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div
          className={`${widthClass} mx-auto ${alignClass} prose prose-neutral dark:prose-invert`}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </section>
  );
}

// ─── Section: Custom HTML ───
function CustomHtmlSection({ config, content }: { config: Record<string, unknown>; content: Record<string, unknown> }) {
  const html = (content.html as string) || "";
  const fullWidth = config.fullWidth === true;

  if (!html) return null;

  return (
    <section>
      {fullWidth ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-16">
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      )}
    </section>
  );
}

// ─── Main renderer ───
export async function renderTemplateSection(section: TemplateSection) {
  const config = parseJSON(section.config);
  const content = parseJSON(section.content);

  switch (section.type) {
    case "hero":
      return <HeroSection config={config} content={content} />;
    case "trust-bar":
      return <TrustBarSection config={config} content={content} />;
    case "categories":
      return <CategoriesSection config={config} content={content} />;
    case "featured-products":
      return <FeaturedProductsSection config={config} content={content} />;
    case "new-arrivals":
      return <NewArrivalsSection config={config} content={content} />;
    case "promo-banner":
      return <PromoBannerSection config={config} content={content} />;
    case "newsletter":
      return <NewsletterSection content={content} />;
    case "rich-text":
      return <RichTextSection config={config} content={content} />;
    case "custom-html":
      return <CustomHtmlSection config={config} content={content} />;
    default:
      return null;
  }
}

// ─── Fetch active template sections ───
export async function getActiveTemplateSections(): Promise<TemplateSection[]> {
  const activeTemplate = await db.query.templates.findFirst({
    where: eq(templates.isActive, true),
    with: { sections: { orderBy: [asc(templateSections.sortOrder)] } },
  });

  if (!activeTemplate) return [];

  return activeTemplate.sections.filter((s) => s.isVisible);
}

// ─── Fetch active template colors ───
export async function getActiveTemplateColors(): Promise<Record<string, string>> {
  const activeTemplate = await db.query.templates.findFirst({
    where: eq(templates.isActive, true),
    columns: { config: true },
  });

  if (!activeTemplate?.config) return {};

  try {
    const cfg = JSON.parse(activeTemplate.config);
    return cfg.colors || {};
  } catch {
    return {};
  }
}
