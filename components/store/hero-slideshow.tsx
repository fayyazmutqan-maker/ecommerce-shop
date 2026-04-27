"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { shouldUseUnoptimizedImage } from "@/lib/image";

export interface HeroSlide {
  title: string;
  subtitle?: string;
  badge?: string;
  buttonText?: string;
  buttonLink?: string;
  secondaryButtonText?: string;
  secondaryButtonLink?: string;
  imageUrl?: string;
  videoUrl?: string;
}

export interface HeroSlideshowConfig {
  slides: HeroSlide[];
  style?: string;
  height?: string;
  alignment?: string;
  overlay?: boolean;
  overlayOpacity?: number;
  overlayGradient?: string;
  backgroundColor?: string;
  textColor?: string;
  autoplay?: boolean;
  autoplayInterval?: number;
  showArrows?: boolean;
  showDots?: boolean;
  transition?: string;
  parallax?: boolean;
  contentAnimation?: string;
  showProgress?: boolean;
}

const HEIGHT_CLASS: Record<string, string> = {
  small: "min-h-[40vh]",
  medium: "min-h-[55vh]",
  large: "min-h-[70vh]",
  full: "min-h-[90vh]",
};

const ALIGN_CLASS: Record<string, string> = {
  left: "text-left items-start",
  center: "text-center items-center",
  right: "text-right items-end",
};

const GRADIENT_OVERLAY: Record<string, string> = {
  none: "",
  bottom: "bg-linear-to-t from-black/70 via-black/20 to-transparent",
  top: "bg-linear-to-b from-black/70 via-black/20 to-transparent",
  left: "bg-linear-to-r from-black/70 via-black/20 to-transparent",
  right: "bg-linear-to-l from-black/70 via-black/20 to-transparent",
  radial: "bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.6))]",
  vignette: "bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.7))]",
};

const ANIMATION_CLASS: Record<string, string> = {
  none: "",
  "fade-up": "animate-fade-up",
  "fade-in": "animate-fade-in",
  "slide-left": "animate-slide-left",
  "slide-right": "animate-slide-right",
  zoom: "animate-zoom-in",
};

function SlideMedia({
  slide,
  overlay,
  overlayOpacity,
  overlayGradient,
  parallax,
  isActive,
  transition,
}: {
  slide: HeroSlide;
  overlay: boolean;
  overlayOpacity: number;
  overlayGradient: string;
  parallax: boolean;
  isActive: boolean;
  transition: string;
}) {
  const transitionClass = transition === "fade"
    ? `transition-opacity duration-700 ease-in-out ${isActive ? "opacity-100" : "opacity-0"}`
    : "";

  return (
    <>
      {slide.videoUrl ? (
        <video
          src={slide.videoUrl}
          autoPlay
          loop
          muted
          playsInline
          className={cn(
            "absolute inset-0 h-full w-full object-cover",
            transitionClass
          )}
        />
      ) : slide.imageUrl ? (
        <Image
          src={slide.imageUrl}
          alt={slide.title}
          fill
          className={cn(
            "object-cover",
            parallax && "will-change-transform",
            transitionClass
          )}
          style={parallax ? { transform: "translateZ(0)" } : undefined}
          priority
          unoptimized={shouldUseUnoptimizedImage(slide.imageUrl)}
        />
      ) : null}
      {overlay && (slide.imageUrl || slide.videoUrl) && (
        <div className="absolute inset-0 bg-black" style={{ opacity: overlayOpacity }} />
      )}
      {overlayGradient && overlayGradient !== "none" && (slide.imageUrl || slide.videoUrl) && (
        <div className={cn("absolute inset-0", GRADIENT_OVERLAY[overlayGradient] || "")} />
      )}
    </>
  );
}

function SlideContent({
  slide,
  alignment,
  textColor,
  contentAnimation,
  isActive,
  hasMedia,
  overlay,
}: {
  slide: HeroSlide;
  alignment: string;
  textColor: string;
  contentAnimation: string;
  isActive: boolean;
  hasMedia: boolean;
  overlay: boolean;
}) {
  const aClass = ALIGN_CLASS[alignment] || ALIGN_CLASS.center;
  const animClass = isActive && contentAnimation !== "none"
    ? ANIMATION_CLASS[contentAnimation] || ""
    : "";
  const isLight = hasMedia && overlay;

  return (
    <div
      className={cn("flex flex-col gap-6 max-w-2xl", aClass, animClass)}
      key={isActive ? "active" : "inactive"}
    >
      {slide.badge && (
        <Badge
          variant={isLight ? "default" : "secondary"}
          className={cn(
            "px-4 py-1.5 text-xs font-semibold tracking-wide uppercase w-fit",
            isLight && "bg-white/20 text-white border-white/30 backdrop-blur-sm",
            alignment === "center" && "mx-auto"
          )}
        >
          {slide.badge}
        </Badge>
      )}
      <h1
        className={cn(
          "text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08]",
          isLight && "text-white drop-shadow-lg"
        )}
        style={textColor ? { color: textColor } : undefined}
      >
        {slide.title.split("\n").map((line, i) => (
          <span key={i}>
            {i > 0 && <br />}
            {i > 0 ? (
              <span className={isLight ? "text-white/70" : "text-muted-foreground"}>
                {line}
              </span>
            ) : line}
          </span>
        ))}
      </h1>
      {slide.subtitle && (
        <p
          className={cn(
            "text-lg max-w-md leading-relaxed",
            isLight ? "text-white/85" : "text-muted-foreground",
            alignment === "center" && "mx-auto"
          )}
          style={textColor ? { color: textColor, opacity: 0.8 } : undefined}
        >
          {slide.subtitle}
        </p>
      )}
      <div
        className={cn(
          "flex flex-col sm:flex-row gap-4 pt-2",
          alignment === "center" && "justify-center",
          alignment === "right" && "justify-end"
        )}
      >
        {slide.buttonText && (
          <Button
            size="lg"
            className={cn(
              "h-12 px-8 text-[15px]",
              isLight && "bg-white text-black hover:bg-white/90"
            )}
            asChild
          >
            <Link href={slide.buttonLink || "/products"}>
              {slide.buttonText}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
        {slide.secondaryButtonText && (
          <Button
            size="lg"
            variant="outline"
            className={cn(
              "h-12 px-8 text-[15px]",
              isLight && "border-white/40 text-white hover:bg-white/10"
            )}
            asChild
          >
            <Link href={slide.secondaryButtonLink || "/collections"}>
              {slide.secondaryButtonText}
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

export function HeroSlideshow({ config }: { config: HeroSlideshowConfig }) {
  const {
    slides,
    height = "large",
    alignment = "center",
    overlay = true,
    overlayOpacity = 0.4,
    overlayGradient = "none",
    backgroundColor = "",
    textColor = "",
    autoplay = true,
    autoplayInterval = 5000,
    showArrows = true,
    showDots = true,
    transition = "fade",
    parallax = false,
    contentAnimation = "fade-up",
    showProgress = true,
  } = config;

  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  const total = slides.length;
  const hClass = HEIGHT_CLASS[height] || HEIGHT_CLASS.large;

  const goTo = useCallback((index: number) => {
    setCurrent((index + total) % total);
    setProgress(0);
  }, [total]);

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  // Autoplay + progress
  useEffect(() => {
    if (!autoplay || isPaused || total <= 1) return;
    const interval = 50; // update progress every 50ms
    const steps = autoplayInterval / interval;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      setProgress((step / steps) * 100);
      if (step >= steps) {
        setCurrent((c) => (c + 1) % total);
        step = 0;
        setProgress(0);
      }
    }, interval);
    return () => clearInterval(timer);
  }, [autoplay, isPaused, autoplayInterval, total, current]);

  // Keyboard navigation
  useEffect(() => {
    if (total <= 1) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev, total]);

  const slide = slides[current];
  if (!slide) return null;

  const hasMedia = !!(slide.imageUrl || slide.videoUrl);

  return (
    <section
      className={cn("relative overflow-hidden flex items-center", hClass)}
      style={backgroundColor ? { backgroundColor } : undefined}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Hero slideshow"
    >
      {/* Background media for all slides (stacked for fade transitions) */}
      {transition === "fade" ? (
        slides.map((s, i) => (
          <div key={i} className="absolute inset-0">
            <SlideMedia
              slide={s}
              overlay={overlay}
              overlayOpacity={overlayOpacity}
              overlayGradient={overlayGradient}
              parallax={parallax}
              isActive={i === current}
              transition="fade"
            />
          </div>
        ))
      ) : (
        <SlideMedia
          slide={slide}
          overlay={overlay}
          overlayOpacity={overlayOpacity}
          overlayGradient={overlayGradient}
          parallax={parallax}
          isActive={true}
          transition="slide"
        />
      )}

      {/* No-media gradient fallback */}
      {!hasMedia && !backgroundColor && (
        <div className="absolute inset-0 bg-linear-to-b from-accent/60 via-background to-background" />
      )}

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8 w-full py-20">
        <SlideContent
          slide={slide}
          alignment={alignment}
          textColor={textColor}
          contentAnimation={contentAnimation}
          isActive={true}
          hasMedia={hasMedia}
          overlay={overlay}
        />
      </div>

      {/* Navigation Arrows */}
      {showArrows && total > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 z-20 h-10 w-10 md:h-12 md:w-12 rounded-full bg-background/80 backdrop-blur-sm border shadow-lg flex items-center justify-center hover:bg-background transition-colors opacity-0 hover:opacity-100 focus:opacity-100 group-hover:opacity-100 [section:hover_&]:opacity-80"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 z-20 h-10 w-10 md:h-12 md:w-12 rounded-full bg-background/80 backdrop-blur-sm border shadow-lg flex items-center justify-center hover:bg-background transition-colors opacity-0 hover:opacity-100 focus:opacity-100 group-hover:opacity-100 [section:hover_&]:opacity-80"
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Dots + Play/Pause */}
      {total > 1 && (showDots || autoplay) && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
          {autoplay && (
            <button
              onClick={() => setIsPaused((p) => !p)}
              className="h-8 w-8 rounded-full bg-background/60 backdrop-blur-sm flex items-center justify-center hover:bg-background/80 transition-colors"
              aria-label={isPaused ? "Play slideshow" : "Pause slideshow"}
            >
              {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </button>
          )}
          {showDots && (
            <div className="flex items-center gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={cn(
                    "relative h-2.5 rounded-full transition-all duration-300 overflow-hidden",
                    i === current ? "w-8 bg-white/40" : "w-2.5 bg-white/30 hover:bg-white/50"
                  )}
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={i === current}
                >
                  {i === current && showProgress && autoplay && (
                    <div
                      className="absolute inset-y-0 left-0 bg-white rounded-full transition-[width] duration-100 ease-linear"
                      style={{ width: `${progress}%` }}
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Progress bar at bottom */}
      {total > 1 && showProgress && autoplay && !showDots && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-20">
          <div
            className="h-full bg-white/50 transition-[width] duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </section>
  );
}
