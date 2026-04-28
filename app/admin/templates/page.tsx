"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageUpload } from "@/components/ui/image-upload";
import { ColorPicker } from "@/components/ui/color-picker";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Plus,
  Palette,
  Check,
  Edit,
  Trash2,
  GripVertical,
  Loader2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  LayoutTemplate,
  ImageIcon,
  ShoppingBag,
  Star,
  Megaphone,
  Mail,
  ShieldCheck,
  Grid3X3,
  Type,
  Code,
  HelpCircle,
  ChevronDown,
  Copy,
  Info,
  Download,
  Upload,
  Video,
  Timer,
  Layers,
  Sparkles,
} from "lucide-react";

// ─── Section Type Definitions ───
const SECTION_TYPES = [
  { value: "hero", icon: ImageIcon },
  { value: "trust-bar", icon: ShieldCheck },
  { value: "categories", icon: Grid3X3 },
  { value: "featured-products", icon: Star },
  { value: "new-arrivals", icon: ShoppingBag },
  { value: "promo-banner", icon: Megaphone },
  { value: "newsletter", icon: Mail },
  { value: "rich-text", icon: Type },
  { value: "custom-html", icon: Code },
] as const;

function SectionTypeIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case "hero":
      return <ImageIcon className={className} />;
    case "trust-bar":
      return <ShieldCheck className={className} />;
    case "categories":
      return <Grid3X3 className={className} />;
    case "featured-products":
      return <Star className={className} />;
    case "new-arrivals":
      return <ShoppingBag className={className} />;
    case "promo-banner":
      return <Megaphone className={className} />;
    case "newsletter":
      return <Mail className={className} />;
    case "rich-text":
      return <Type className={className} />;
    case "custom-html":
      return <Code className={className} />;
    default:
      return <LayoutTemplate className={className} />;
  }
}

// ─── Section Help Documentation ───
const SECTION_HELP: Record<string, {
  overview: string;
  configKeys: { key: string; type: string; description: string; required?: boolean }[];
  contentKeys: { key: string; type: string; description: string; required?: boolean }[];
  configExample: string;
  contentExample: string;
  tips: string[];
}> = {
  hero: {
    overview: "The Hero Banner is the main visual section at the top of your storefront. Choose from 5 styles, enable carousel/slideshow mode with multiple slides, add video backgrounds, countdown timers, and content animations. Use the visual controls above the JSON fields for easy configuration.",
    configKeys: [
      { key: "style", type: "string", description: "Hero style: 'default' (gradient), 'minimal' (clean), 'split' (text + image), 'banner' (full-width image), or 'card' (floating card). Default: 'default'", required: false },
      { key: "mode", type: "string", description: "Display mode: 'single' (one slide) or 'carousel' (multiple slides). Default: 'single'", required: false },
      { key: "imageUrl", type: "string", description: "URL of the background/hero image (single mode). Use the image uploader or paste a URL.", required: false },
      { key: "videoUrl", type: "string", description: "MP4 video URL for video background (replaces image). Must be a direct MP4 link.", required: false },
      { key: "overlay", type: "boolean", description: "Whether to show a dark overlay on media for text readability.", required: false },
      { key: "overlayOpacity", type: "number", description: "Opacity of the overlay (0 to 1). Default: 0.4", required: false },
      { key: "overlayGradient", type: "string", description: "Gradient overlay direction: 'none', 'bottom', 'top', 'left', 'right', 'radial', or 'vignette'. Default: 'none'", required: false },
      { key: "alignment", type: "string", description: "Text alignment: 'left', 'center', or 'right'. Default: 'center'", required: false },
      { key: "height", type: "string", description: "Section height: 'small', 'medium', 'large', or 'full'. Default: 'large'", required: false },
      { key: "contentAnimation", type: "string", description: "Content entrance animation: 'none', 'fade-up', 'fade-in', 'slide-left', 'slide-right', or 'zoom'. Default: 'none'", required: false },
      { key: "backgroundColor", type: "string", description: "Custom background color (hex). Overrides default gradient.", required: false },
      { key: "textColor", type: "string", description: "Custom text color (hex). Overrides default text color.", required: false },
      { key: "countdown", type: "object", description: "Countdown timer: { enabled: boolean, endDate: ISO string, label?: string, variant?: 'default'|'minimal'|'badge' }", required: false },
      { key: "autoplay", type: "boolean", description: "Carousel: auto-rotate slides. Default: true", required: false },
      { key: "autoplayInterval", type: "number", description: "Carousel: rotation interval in ms. Default: 5000", required: false },
      { key: "showArrows", type: "boolean", description: "Carousel: show prev/next arrows. Default: true", required: false },
      { key: "showDots", type: "boolean", description: "Carousel: show dot navigation. Default: true", required: false },
      { key: "showProgress", type: "boolean", description: "Carousel: show progress indicator on active dot. Default: true", required: false },
      { key: "transition", type: "string", description: "Carousel: slide transition type: 'fade' or 'slide'. Default: 'fade'", required: false },
    ],
    contentKeys: [
      { key: "title", type: "string", description: "Main heading text (single mode). Use \\n for line breaks.", required: true },
      { key: "subtitle", type: "string", description: "Supporting text below the heading (single mode).", required: false },
      { key: "badge", type: "string", description: "Optional badge text above the heading (e.g. 'New Collection').", required: false },
      { key: "buttonText", type: "string", description: "Label for the CTA button (single mode).", required: false },
      { key: "buttonLink", type: "string", description: "URL the CTA button links to.", required: false },
      { key: "secondaryButtonText", type: "string", description: "Label for an optional secondary button.", required: false },
      { key: "secondaryButtonLink", type: "string", description: "URL the secondary button links to.", required: false },
      { key: "slides", type: "array", description: "Carousel slides array. Each slide: { title, subtitle?, badge?, buttonText?, buttonLink?, secondaryButtonText?, secondaryButtonLink?, imageUrl?, videoUrl? }", required: false },
    ],
    configExample: JSON.stringify({ style: "default", mode: "single", imageUrl: "", videoUrl: "", overlay: true, overlayOpacity: 0.4, overlayGradient: "none", alignment: "center", height: "large", contentAnimation: "fade-up", backgroundColor: "", textColor: "", countdown: { enabled: false, endDate: "", label: "" } }, null, 2),
    contentExample: JSON.stringify({ title: "Welcome to Our Store", subtitle: "Discover amazing products at great prices", badge: "New Season", buttonText: "Shop Now", buttonLink: "/products", secondaryButtonText: "Learn More", secondaryButtonLink: "/about" }, null, 2),
    tips: [
      "Choose a style using the visual controls — each has a unique layout and feel.",
      "Set mode to 'Carousel' to create a multi-slide hero with auto-rotation, arrows, and dots.",
      "In carousel mode, manage slides using the visual slide editor — each slide has its own title, image/video, and buttons.",
      "Add a video URL (MP4) for a video background — great for lifestyle brands. Video replaces the image.",
      "'Split' style requires media — it places text on the left and image/video on the right.",
      "'Banner' style creates a bold full-width hero with large text overlay.",
      "Use Content Animation (e.g. 'fade-up') for a polished entrance effect on page load.",
      "Enable the Countdown Timer for flash sales or product launches — it auto-updates in real time.",
      "Overlay Gradient options (bottom, radial, vignette) create more cinematic looks than a flat overlay.",
      "Upload images using the image uploader — it auto-fills imageUrl. Use at least 1920×800px for best results.",
    ],
  },
  "trust-bar": {
    overview: "The Trust Bar displays a row of feature badges that build customer confidence. Choose from 5 different styles and customize columns, icon shape, colors, and more. Use the visual controls above the JSON fields for easy configuration.",
    configKeys: [
      { key: "style", type: "string", description: "Visual style: 'default' (border row), 'cards', 'minimal' (inline), 'banner' (colored strip), or 'centered' (stacked). Default: 'default'", required: false },
      { key: "columns", type: "number", description: "Number of columns (2–6). Default: 4", required: false },
      { key: "iconStyle", type: "string", description: "Icon container shape: 'rounded', 'circle', 'square', or 'none'. Default: 'rounded'", required: false },
      { key: "showDescription", type: "boolean", description: "Show item descriptions. Default: true", required: false },
      { key: "backgroundColor", type: "string", description: "Custom background color (hex). Default: theme default", required: false },
      { key: "textColor", type: "string", description: "Custom text color (hex). Default: theme default", required: false },
    ],
    contentKeys: [
      { key: "items", type: "array", description: "Array of trust items, each with icon, title, and description.", required: true },
    ],
    configExample: JSON.stringify({ style: "default", columns: 4, iconStyle: "rounded", showDescription: true, backgroundColor: "", textColor: "" }, null, 2),
    contentExample: JSON.stringify({ items: [
      { icon: "truck", title: "Free Shipping", description: "On orders over $50" },
      { icon: "rotate-ccw", title: "Easy Returns", description: "30-day return policy" },
      { icon: "shield-check", title: "Secure Payment", description: "SSL encrypted checkout" },
      { icon: "headphones", title: "24/7 Support", description: "Always here to help" },
    ] }, null, 2),
    tips: [
      "Use the visual controls above to choose style, columns, and icon shape.",
      "Available icons: 'truck', 'rotate-ccw', 'shield-check', 'headphones', 'clock', 'award', 'gift', 'heart'.",
      "'Cards' style works great with 3–4 items for a highlighted look.",
      "'Banner' style creates a bold colored strip — try with custom background color.",
      "'Minimal' style is compact and clean — good for narrow trust bars.",
      "Set icon style to 'none' to show text only without icons.",
    ],
  },
  categories: {
    overview: "The Categories section displays your product categories in a grid or carousel layout, helping customers navigate your store. Use the visual layout controls above the JSON fields to easily customize the display.",
    configKeys: [
      { key: "display", type: "string", description: "Display mode: 'carousel' (scrollable) or 'grid' (static). Default: 'carousel'", required: false },
      { key: "columns", type: "number", description: "Grid columns or carousel visible items (2–6). Default: 6", required: false },
      { key: "gap", type: "string", description: "Grid spacing: 'tight', 'normal', or 'loose'. Default: 'normal'", required: false },
      { key: "cardRatio", type: "string", description: "Card image shape: 'square', 'portrait', or 'circle'. Default: 'square'", required: false },
      { key: "showImage", type: "boolean", description: "Show category images. Default: true", required: false },
      { key: "showCount", type: "boolean", description: "Show product count per category. Default: false", required: false },
      { key: "limit", type: "number", description: "Maximum categories to show. Default: 12", required: false },
    ],
    contentKeys: [
      { key: "title", type: "string", description: "Section heading. Default: 'Shop by Category'", required: false },
      { key: "subtitle", type: "string", description: "Supporting text below heading.", required: false },
    ],
    configExample: JSON.stringify({ display: "carousel", columns: 6, gap: "normal", cardRatio: "square", showImage: true, showCount: false, limit: 12 }, null, 2),
    contentExample: JSON.stringify({ title: "Shop by Category", subtitle: "Browse our collections" }, null, 2),
    tips: [
      "Categories are pulled automatically from your store's category list.",
      "Use the visual controls above to configure display mode, columns, and card shape.",
      "Use 'carousel' for stores with many categories, 'grid' for a fixed layout.",
      "'Circle' card shape works great for a modern, social-media-inspired look.",
      "Ensure categories have images uploaded for best visual results.",
    ],
  },
  "featured-products": {
    overview: "Displays a curated grid of your featured/highlighted products. Products marked as 'featured' in the product editor will appear here. Use the visual layout controls above the JSON fields to easily customize the grid.",
    configKeys: [
      { key: "limit", type: "number", description: "Number of products to display. Default: 8", required: false },
      { key: "columns", type: "number", description: "Grid columns (1–6). Default: 4", required: false },
      { key: "gap", type: "string", description: "Grid spacing: 'tight', 'normal', or 'loose'. Default: 'normal'", required: false },
      { key: "cardRatio", type: "string", description: "Card image ratio: 'square', 'portrait', 'landscape', or 'wide'. Default: 'portrait'", required: false },
      { key: "showAddToCart", type: "boolean", description: "Show Add to Cart button on cards. Default: true", required: false },
      { key: "showWishlist", type: "boolean", description: "Show wishlist/heart button on cards. Default: true", required: false },
      { key: "showBadges", type: "boolean", description: "Show New/Sale badges on cards. Default: true", required: false },
    ],
    contentKeys: [
      { key: "title", type: "string", description: "Section heading. Default: 'Featured Products'", required: false },
      { key: "subtitle", type: "string", description: "Supporting text below heading.", required: false },
      { key: "viewAllLink", type: "string", description: "URL for 'View All' button. Default: '/products'", required: false },
    ],
    configExample: JSON.stringify({ limit: 8, columns: 4, gap: "normal", cardRatio: "portrait", showAddToCart: true, showWishlist: true, showBadges: true }, null, 2),
    contentExample: JSON.stringify({ title: "Featured Products", subtitle: "Hand-picked for you", viewAllLink: "/products?featured=true" }, null, 2),
    tips: [
      "Mark products as 'featured' in Products → Edit to include them here.",
      "Use the visual controls above to configure columns, spacing, and card appearance.",
      "8 products (2 rows of 4) is the recommended default.",
      "Card Ratio: 'portrait' works best for clothing, 'square' for accessories, 'landscape' for electronics.",
    ],
  },
  "new-arrivals": {
    overview: "Shows the most recently added products in your store, automatically sorted by creation date. Use the visual layout controls above the JSON fields to easily customize the grid.",
    configKeys: [
      { key: "limit", type: "number", description: "Number of products to display. Default: 8", required: false },
      { key: "columns", type: "number", description: "Grid columns (1–6). Default: 4", required: false },
      { key: "gap", type: "string", description: "Grid spacing: 'tight', 'normal', or 'loose'. Default: 'normal'", required: false },
      { key: "cardRatio", type: "string", description: "Card image ratio: 'square', 'portrait', 'landscape', or 'wide'. Default: 'portrait'", required: false },
      { key: "showAddToCart", type: "boolean", description: "Show Add to Cart button on cards. Default: true", required: false },
      { key: "showWishlist", type: "boolean", description: "Show wishlist/heart button on cards. Default: true", required: false },
      { key: "showBadges", type: "boolean", description: "Show New/Sale badges on cards. Default: true", required: false },
      { key: "daysBack", type: "number", description: "Only show products added within this many days. Default: 30", required: false },
    ],
    contentKeys: [
      { key: "title", type: "string", description: "Section heading. Default: 'New Arrivals'", required: false },
      { key: "subtitle", type: "string", description: "Supporting text below heading.", required: false },
      { key: "viewAllLink", type: "string", description: "URL for 'View All' button. Default: '/products?sort=newest'", required: false },
    ],
    configExample: JSON.stringify({ limit: 8, columns: 4, gap: "normal", cardRatio: "portrait", showAddToCart: true, showWishlist: true, showBadges: true, daysBack: 30 }, null, 2),
    contentExample: JSON.stringify({ title: "New Arrivals", subtitle: "The latest additions to our collection", viewAllLink: "/products?sort=newest" }, null, 2),
    tips: [
      "Products appear here automatically when added to your store.",
      "Use the visual controls above to configure columns, spacing, and card appearance.",
      "Use daysBack to keep the section fresh and avoid showing old products.",
    ],
  },
  "promo-banner": {
    overview: "A promotional banner section — great for sales, seasonal campaigns, or announcements. Choose from 6 different styles and customize height, alignment, colors, and overlay. Use the visual controls above the JSON fields for easy configuration.",
    configKeys: [
      { key: "style", type: "string", description: "Banner style: 'default' (rounded card), 'fullwidth' (edge-to-edge), 'split' (text + image), 'minimal' (dashed border), 'banner' (compact strip), or 'card' (floating card). Default: 'default'", required: false },
      { key: "imageUrl", type: "string", description: "Background image URL. Use the image uploader or paste a URL.", required: false },
      { key: "overlay", type: "boolean", description: "Show dark overlay on image. Default: true", required: false },
      { key: "overlayOpacity", type: "number", description: "Overlay opacity (0 to 1). Default: 0.4", required: false },
      { key: "height", type: "string", description: "Section height: 'small', 'medium', 'large', or 'full'. Default: 'medium'", required: false },
      { key: "backgroundColor", type: "string", description: "Background color (hex). Used when no image is set.", required: false },
      { key: "textColor", type: "string", description: "Text color (hex). Default: '#ffffff'", required: false },
      { key: "alignment", type: "string", description: "Text alignment: 'left', 'center', or 'right'. Default: 'center'", required: false },
    ],
    contentKeys: [
      { key: "title", type: "string", description: "Promo heading (e.g. 'Summer Sale — Up to 50% Off'). Use \\n for line breaks.", required: true },
      { key: "subtitle", type: "string", description: "Supporting text or details.", required: false },
      { key: "buttonText", type: "string", description: "CTA button label.", required: false },
      { key: "buttonLink", type: "string", description: "CTA button URL.", required: false },
      { key: "badge", type: "string", description: "Optional small badge text (e.g. 'Limited Time').", required: false },
    ],
    configExample: JSON.stringify({ style: "default", imageUrl: "", overlay: true, overlayOpacity: 0.4, height: "medium", backgroundColor: "", textColor: "#ffffff", alignment: "center" }, null, 2),
    contentExample: JSON.stringify({ title: "Summer Sale — Up to 50% Off", subtitle: "Don't miss our biggest sale of the year", buttonText: "Shop Sale", buttonLink: "/collections/sale", badge: "Limited Time" }, null, 2),
    tips: [
      "Choose a style using the visual controls — each has a unique layout.",
      "'Split' requires an image — text on left, image on right.",
      "'Banner' creates a compact horizontal strip — great for announcement bars.",
      "'Card' puts content in a frosted glass card over background.",
      "'Minimal' has a dashed border for a light, clean feel.",
      "Upload an image using the image uploader — it auto-fills the imageUrl.",
    ],
  },
  newsletter: {
    overview: "A newsletter subscription section with heading, subtitle, and email signup form. Emails are collected in your Newsletter subscribers list.",
    configKeys: [
      { key: "backgroundColor", type: "string", description: "Section background color (hex). Default: theme default", required: false },
      { key: "style", type: "string", description: "Visual style: 'default', 'minimal', or 'card'. Default: 'default'", required: false },
    ],
    contentKeys: [
      { key: "title", type: "string", description: "Section heading. Default: 'Stay Updated'", required: true },
      { key: "subtitle", type: "string", description: "Supporting text encouraging signups.", required: false },
      { key: "disclaimer", type: "string", description: "Small print text below the form.", required: false },
      { key: "buttonText", type: "string", description: "Submit button label. Default: 'Subscribe'", required: false },
    ],
    configExample: JSON.stringify({ backgroundColor: "", style: "default" }, null, 2),
    contentExample: JSON.stringify({ title: "Stay Updated", subtitle: "Subscribe to our newsletter for exclusive deals and updates", disclaimer: "No spam, unsubscribe anytime.", buttonText: "Subscribe" }, null, 2),
    tips: [
      "Subscribers appear in your admin under Newsletter → Subscribers.",
      "Add a discount incentive in the subtitle (e.g. 'Get 10% off your first order').",
    ],
  },
  "rich-text": {
    overview: "A flexible content block for custom text, announcements, or storytelling. Supports HTML in the Content field.",
    configKeys: [
      { key: "maxWidth", type: "string", description: "Content max width: 'narrow', 'medium', 'wide', or 'full'. Default: 'medium'", required: false },
      { key: "alignment", type: "string", description: "Text alignment: 'left', 'center', or 'right'. Default: 'left'", required: false },
      { key: "backgroundColor", type: "string", description: "Section background color (hex). Default: transparent", required: false },
      { key: "padding", type: "string", description: "Vertical padding: 'small', 'medium', or 'large'. Default: 'medium'", required: false },
    ],
    contentKeys: [
      { key: "html", type: "string", description: "HTML content to render. Supports headings, paragraphs, lists, links, and images.", required: true },
    ],
    configExample: JSON.stringify({ maxWidth: "medium", alignment: "center", padding: "medium" }, null, 2),
    contentExample: JSON.stringify({ html: "<h2>About Our Brand</h2><p>We are dedicated to bringing you the finest products with exceptional quality and service.</p>" }, null, 2),
    tips: [
      "Use the Content field (not Config) for your HTML content.",
      "You can also paste plain text in the Content field — it doesn't have to be HTML.",
      "Keep HTML simple: h2, h3, p, ul, ol, li, a, strong, em, img tags.",
    ],
  },
  "custom-html": {
    overview: "Embed raw HTML code directly into your storefront. Use this for third-party widgets, custom scripts, or advanced layouts.",
    configKeys: [
      { key: "fullWidth", type: "boolean", description: "Render at full page width (no container). Default: false", required: false },
    ],
    contentKeys: [
      { key: "html", type: "string", description: "Raw HTML code to embed. Can include <style> and layout elements.", required: true },
    ],
    configExample: JSON.stringify({ fullWidth: false }, null, 2),
    contentExample: JSON.stringify({ html: "<div style=\"padding: 2rem; text-align: center; background: #f8fafc;\"><h2>Custom Section</h2><p>Your custom HTML here</p></div>" }, null, 2),
    tips: [
      "Script tags are stripped for security — use this for layout/visual content only.",
      "Test on mobile — custom HTML may need responsive adjustments.",
      "Use fullWidth: true if your HTML handles its own container width.",
    ],
  },
};

function getSectionHelp(type: string) {
  return SECTION_HELP[type] || null;
}

// ─── Section Help Panel (inline in SectionRow) ───
function SectionHelpPanel({ type }: { type: string }) {
  const t = useTranslations("admin.templates");
  const help = getSectionHelp(type);
  if (!help) return null;

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(t("toasts.copiedToClipboard", { label }));
    });
  }

  return (
    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-2">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-800 dark:text-blue-300">{help.overview}</p>
      </div>

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="h-8 w-full">
          <TabsTrigger value="config" className="text-xs h-7 flex-1">{t("helpDialog.configTab")}</TabsTrigger>
          <TabsTrigger value="content" className="text-xs h-7 flex-1">{t("helpDialog.contentTab")}</TabsTrigger>
          <TabsTrigger value="tips" className="text-xs h-7 flex-1">{t("helpDialog.tipsTab")}</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="mt-2 space-y-2">
          {help.configKeys.length > 0 ? (
            <>
              <div className="space-y-1">
                {help.configKeys.map((k) => (
                  <div key={k.key} className="text-xs">
                    <span className="font-mono font-semibold text-blue-700 dark:text-blue-300">{k.key}</span>
                    <span className="text-muted-foreground"> ({k.type}){k.required ? ' *' : ''}</span>
                    <span className="text-muted-foreground"> — {k.description}</span>
                  </div>
                ))}
              </div>
              <div className="relative">
                <pre className="bg-muted rounded p-2 text-[11px] font-mono overflow-x-auto whitespace-pre">{help.configExample}</pre>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6"
                  onClick={() => copyToClipboard(help.configExample, "Config")}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">{t("helpDialog.noConfig")}</p>
          )}
        </TabsContent>

        <TabsContent value="content" className="mt-2 space-y-2">
          {help.contentKeys.length > 0 ? (
            <>
              <div className="space-y-1">
                {help.contentKeys.map((k) => (
                  <div key={k.key} className="text-xs">
                    <span className="font-mono font-semibold text-blue-700 dark:text-blue-300">{k.key}</span>
                    <span className="text-muted-foreground"> ({k.type}){k.required ? ' *' : ''}</span>
                    <span className="text-muted-foreground"> — {k.description}</span>
                  </div>
                ))}
              </div>
              <div className="relative">
                <pre className="bg-muted rounded p-2 text-[11px] font-mono overflow-x-auto whitespace-pre">{help.contentExample}</pre>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6"
                  onClick={() => copyToClipboard(help.contentExample, "Content")}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">{t("helpDialog.plainContent")}</p>
          )}
        </TabsContent>

        <TabsContent value="tips" className="mt-2">
          <ul className="space-y-1">
            {help.tips.map((tip, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                <span className="text-blue-500 mt-0.5">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Help Dialog (all sections overview) ───
function TemplateHelpDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("admin.templates");
  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(t("toasts.copiedToClipboard", { label }));
    });
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] grid-rows-[auto_1fr_auto] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            {t("helpDialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t("helpDialog.description1")}
            {" "}{t("helpDialog.description2")}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto -mx-5 px-5">
          <div className="space-y-3 pb-4">
            {SECTION_TYPES.map((st) => {
              const help = getSectionHelp(st.value);
              if (!help) return null;
              return (
                <Collapsible key={st.value}>
                  <CollapsibleTrigger className="flex items-center gap-3 w-full p-3 rounded-lg data-[state=open]:rounded-b-none border hover:bg-muted/50 transition-colors text-left group">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted shrink-0">
                      <st.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{t(`sectionTypes.${st.value}`)}</p>
                      <p className="text-xs text-muted-foreground truncate">{t(`sectionDescriptions.${st.value}`)}</p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 shrink-0" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border border-t-0 rounded-b-lg p-4 space-y-4">
                      <p className="text-sm text-muted-foreground">{help.overview}</p>

                      {/* Config Keys */}
                      {help.configKeys.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold mb-2">{t("helpDialog.configNote")}</p>
                          <div className="space-y-1 mb-2">
                            {help.configKeys.map((k) => (
                              <div key={k.key} className="text-xs">
                                <code className="font-mono bg-muted px-1 rounded text-blue-700 dark:text-blue-300">{k.key}</code>
                                <span className="text-muted-foreground"> ({k.type}){k.required ? ` ${t("helpDialog.required")}` : ''} — {k.description}</span>
                              </div>
                            ))}
                          </div>
                          <div className="relative">
                            <pre className="bg-muted rounded p-3 text-xs font-mono overflow-x-auto whitespace-pre">{help.configExample}</pre>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute top-1.5 right-1.5 h-7 w-7"
                              onClick={() => copyToClipboard(help.configExample, `${t(`sectionTypes.${st.value}`)} config`)}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Content Keys */}
                      {help.contentKeys.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold mb-2">{t("helpDialog.contentNote")}</p>
                          <div className="space-y-1 mb-2">
                            {help.contentKeys.map((k) => (
                              <div key={k.key} className="text-xs">
                                <code className="font-mono bg-muted px-1 rounded text-blue-700 dark:text-blue-300">{k.key}</code>
                                <span className="text-muted-foreground"> ({k.type}){k.required ? ` ${t("helpDialog.required")}` : ''} — {k.description}</span>
                              </div>
                            ))}
                          </div>
                          <div className="relative">
                            <pre className="bg-muted rounded p-3 text-xs font-mono overflow-x-auto whitespace-pre">{help.contentExample}</pre>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute top-1.5 right-1.5 h-7 w-7"
                              onClick={() => copyToClipboard(help.contentExample, `${t(`sectionTypes.${st.value}`)} content`)}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Tips */}
                      <div>
                        <p className="text-xs font-semibold mb-1.5">{t("helpDialog.tipsTab")}</p>
                        <ul className="space-y-1">
                          {help.tips.map((tip, i) => (
                            <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                              <span className="text-primary mt-0.5">•</span>
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("helpDialog.close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Types ───
interface TemplateSection {
  id?: string;
  name: string;
  type: string;
  config: string | null;
  content: string | null;
  sortOrder: number;
  isVisible: boolean;
}

interface Template {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  thumbnail: string | null;
  isActive: boolean;
  isDefault: boolean;
  config: string | null;
  sections: TemplateSection[];
  createdAt: string;
  updatedAt: string;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─── Section Editor Row ───
function SectionRow({
  section,
  index,
  total,
  onUpdate,
  onRemove,
  onMove,
}: {
  section: TemplateSection;
  index: number;
  total: number;
  onUpdate: (s: TemplateSection) => void;
  onRemove: () => void;
  onMove: (dir: "up" | "down") => void;
}) {
  const t = useTranslations("admin.templates");
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border rounded-lg">
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
        <SectionTypeIcon type={section.type} className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{section.name || t("section.untitled")}</p>
          <p className="text-xs text-muted-foreground">{t(`sectionTypes.${section.type}`)}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!section.isVisible && <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => { e.stopPropagation(); onMove("up"); }}
            disabled={index === 0}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => { e.stopPropagation(); onMove("down"); }}
            disabled={index === total - 1}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {expanded && (
        <div className="border-t p-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>{t("section.sectionName")}</Label>
              <Input
                value={section.name}
                onChange={(e) => onUpdate({ ...section, name: e.target.value })}
                placeholder={t("section.sectionNamePlaceholder")}
              />
            </div>
            <div>
              <Label>{t("section.sectionType")}</Label>
              <Select value={section.type} onValueChange={(v) => onUpdate({ ...section, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SECTION_TYPES.map((st) => (
                    <SelectItem key={st.value} value={st.value}>
                      <span className="flex items-center gap-2">
                        <st.icon className="h-3.5 w-3.5" />
                        {t(`sectionTypes.${st.value}`)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {(section.type === "hero" || section.type === "promo-banner") && (
            <div>
              <Label>Image</Label>
              <p className="text-xs text-muted-foreground mb-2">
                {t("section.backgroundImage")}
              </p>
              <ImageUpload
                value={(() => {
                  try {
                    const cfg = JSON.parse(section.config || "{}");
                    return cfg.imageUrl ? [cfg.imageUrl] : [];
                  } catch {
                    return [];
                  }
                })()}
                onChange={(urls) => {
                  try {
                    const cfg = JSON.parse(section.config || "{}");
                    cfg.imageUrl = urls[0] || null;
                    onUpdate({ ...section, config: JSON.stringify(cfg, null, 2) });
                  } catch {
                    onUpdate({ ...section, config: JSON.stringify({ imageUrl: urls[0] || null }, null, 2) });
                  }
                }}
                folder="templates"
                maxImages={1}
              />
            </div>
          )}
          {section.type === "hero" && (() => {
            const cfg = (() => { try { return JSON.parse(section.config || "{}"); } catch { return {}; } })();
            const cnt = (() => { try { return JSON.parse(section.content || "{}"); } catch { return {}; } })();
            const updateCfg = (patch: Record<string, unknown>) => {
              const merged = { ...cfg, ...patch };
              onUpdate({ ...section, config: JSON.stringify(merged, null, 2) });
            };
            const updateCnt = (patch: Record<string, unknown>) => {
              const merged = { ...cnt, ...patch };
              onUpdate({ ...section, content: JSON.stringify(merged, null, 2) });
            };
            const isCarousel = cfg.mode === "carousel";
            const slides = Array.isArray(cnt.slides) ? (cnt.slides as Record<string, string>[]) : [];
            const countdown = (cfg.countdown || {}) as Record<string, unknown>;
            const updateCountdown = (patch: Record<string, unknown>) => {
              updateCfg({ countdown: { ...countdown, ...patch } });
            };
            return (
              <div className="space-y-5 p-3 bg-muted/30 rounded-lg border">
                {/* ── Style & Layout ── */}
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("section.heroStyleLayout")}</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <Label className="text-xs">{t("section.style")}</Label>
                    <Select value={cfg.style ?? "default"} onValueChange={(v) => updateCfg({ style: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">{t("section.styleDefault")}</SelectItem>
                        <SelectItem value="minimal">{t("section.styleMinimal")}</SelectItem>
                        <SelectItem value="split">{t("section.styleSplit")}</SelectItem>
                        <SelectItem value="banner">{t("section.styleBanner")}</SelectItem>
                        <SelectItem value="card">{t("section.styleCard")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {cfg.style === "split" ? "Text on left, image on right" :
                       cfg.style === "minimal" ? "Clean layout, no gradients" :
                       cfg.style === "banner" ? "Full-width image with bold overlay text" :
                       cfg.style === "card" ? "Content in a floating card over background" :
                       "Gradient background with optional image"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs">{t("section.mode")}</Label>
                    <Select value={cfg.mode ?? "single"} onValueChange={(v) => updateCfg({ mode: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">{t("section.modeSingle")}</SelectItem>
                        <SelectItem value="carousel">{t("section.modeCarousel")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {isCarousel ? t("section.modeCarouselDesc") : t("section.modeSingleDesc")}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs">{t("section.height")}</Label>
                    <Select value={cfg.height ?? "large"} onValueChange={(v) => updateCfg({ height: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">{t("section.heightSmall")}</SelectItem>
                        <SelectItem value="medium">{t("section.heightMedium")}</SelectItem>
                        <SelectItem value="large">{t("section.heightLarge")}</SelectItem>
                        <SelectItem value="full">{t("section.heightFull")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">{t("section.alignment")}</Label>
                    <Select value={cfg.alignment ?? "center"} onValueChange={(v) => updateCfg({ alignment: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">{t("section.alignLeft")}</SelectItem>
                        <SelectItem value="center">{t("section.alignCenter")}</SelectItem>
                        <SelectItem value="right">{t("section.alignRight")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">{t("section.overlayOpacity")}</Label>
                    <Input
                      type="number"
                      min={0}
                      max={1}
                      step={0.1}
                      value={cfg.overlayOpacity ?? 0.4}
                      onChange={(e) => updateCfg({ overlayOpacity: parseFloat(e.target.value) || 0.4 })}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">{t("section.overlayOpacityHelp")}</p>
                  </div>
                  <div>
                    <Label className="text-xs">{t("section.overlayGradient")}</Label>
                    <Select value={cfg.overlayGradient ?? "none"} onValueChange={(v) => updateCfg({ overlayGradient: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("section.gradientNone")}</SelectItem>
                        <SelectItem value="bottom">{t("section.gradientBottom")}</SelectItem>
                        <SelectItem value="top">{t("section.gradientTop")}</SelectItem>
                        <SelectItem value="left">{t("section.gradientLeft")}</SelectItem>
                        <SelectItem value="right">{t("section.gradientRight")}</SelectItem>
                        <SelectItem value="radial">{t("section.gradientRadial")}</SelectItem>
                        <SelectItem value="vignette">{t("section.gradientVignette")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">{t("section.backgroundColor")}</Label>
                    <Input
                      type="text"
                      value={cfg.backgroundColor ?? ""}
                      onChange={(e) => updateCfg({ backgroundColor: e.target.value || "" })}
                      placeholder={t("section.backgroundColorPlaceholder")}
                      className="font-mono text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{t("section.textColor")}</Label>
                    <Input
                      type="text"
                      value={cfg.textColor ?? ""}
                      onChange={(e) => updateCfg({ textColor: e.target.value || "" })}
                      placeholder={t("section.textColorPlaceholder")}
                      className="font-mono text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Video className="h-3 w-3" /> {t("section.videoUrl")}</Label>
                    <Input
                      type="url"
                      value={cfg.videoUrl ?? ""}
                      onChange={(e) => updateCfg({ videoUrl: e.target.value || "" })}
                      placeholder="https://example.com/video.mp4"
                      className="font-mono text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">{t("section.videoUrlHelp")}</p>
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1"><Sparkles className="h-3 w-3" /> {t("section.contentAnimation")}</Label>
                    <Select value={cfg.contentAnimation ?? "none"} onValueChange={(v) => updateCfg({ contentAnimation: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("section.animNone")}</SelectItem>
                        <SelectItem value="fade-up">{t("section.animFadeUp")}</SelectItem>
                        <SelectItem value="fade-in">{t("section.animFadeIn")}</SelectItem>
                        <SelectItem value="slide-left">{t("section.animSlideLeft")}</SelectItem>
                        <SelectItem value="slide-right">{t("section.animSlideRight")}</SelectItem>
                        <SelectItem value="zoom">{t("section.animZoomIn")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={cfg.overlay !== false}
                      onCheckedChange={(v) => updateCfg({ overlay: v })}
                    />
                    <Label className="text-xs">{t("section.imageOverlay")}</Label>
                  </div>
                </div>

                {/* ── Carousel Settings ── */}
                {isCarousel && (
                  <div className="space-y-3 pt-2 border-t">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> {t("section.carouselSettings")}</p>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <Label className="text-xs">{t("section.transition")}</Label>
                        <Select value={cfg.transition ?? "fade"} onValueChange={(v) => updateCfg({ transition: v })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fade">{t("section.transitionFade")}</SelectItem>
                            <SelectItem value="slide">{t("section.transitionSlide")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">{t("section.autoplayInterval")}</Label>
                        <Input
                          type="number"
                          min={1000}
                          max={30000}
                          step={500}
                          value={cfg.autoplayInterval ?? 5000}
                          onChange={(e) => updateCfg({ autoplayInterval: parseInt(e.target.value) || 5000 })}
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                      <div className="flex items-center gap-2">
                        <Switch checked={cfg.autoplay !== false} onCheckedChange={(v) => updateCfg({ autoplay: v })} />
                        <Label className="text-xs">{t("section.autoplay")}</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={cfg.showArrows !== false} onCheckedChange={(v) => updateCfg({ showArrows: v })} />
                        <Label className="text-xs">{t("section.showArrows")}</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={cfg.showDots !== false} onCheckedChange={(v) => updateCfg({ showDots: v })} />
                        <Label className="text-xs">{t("section.showDots")}</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={cfg.showProgress !== false} onCheckedChange={(v) => updateCfg({ showProgress: v })} />
                        <Label className="text-xs">{t("section.showProgress")}</Label>
                      </div>
                    </div>

                    {/* ── Slides Management ── */}
                    <div className="space-y-3 pt-3 border-t">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("section.slides", { count: slides.length })}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => {
                            const newSlide = { title: t("section.newSlide"), subtitle: "", badge: "", buttonText: t("section.shopNow"), buttonLink: "/products", secondaryButtonText: "", secondaryButtonLink: "", imageUrl: "", videoUrl: "" };
                            updateCnt({ slides: [...slides, newSlide] });
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" /> {t("section.addSlide")}
                        </Button>
                      </div>
                      {slides.map((slide, idx) => (
                        <Collapsible key={idx}>
                          <div className="flex items-center gap-2 p-2 bg-background rounded border">
                            <CollapsibleTrigger className="flex-1 flex items-center gap-2 text-xs font-medium text-left">
                              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>Slide {idx + 1}: {slide.title || t("section.untitledSlide")}</span>
                            </CollapsibleTrigger>
                            <div className="flex items-center gap-1">
                              {idx > 0 && (
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => {
                                  const arr = [...slides]; [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                                  updateCnt({ slides: arr });
                                }}><ArrowUp className="h-3 w-3" /></Button>
                              )}
                              {idx < slides.length - 1 && (
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => {
                                  const arr = [...slides]; [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
                                  updateCnt({ slides: arr });
                                }}><ArrowDown className="h-3 w-3" /></Button>
                              )}
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => {
                                updateCnt({ slides: slides.filter((_, i) => i !== idx) });
                              }}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          </div>
                          <CollapsibleContent>
                            <div className="grid gap-3 sm:grid-cols-2 p-3 ml-2 border-l-2 border-border">
                              <div>
                                <Label className="text-xs">{t("section.slideTitle")}</Label>
                                <Input value={slide.title || ""} onChange={(e) => {
                                  const arr = [...slides]; arr[idx] = { ...arr[idx], title: e.target.value };
                                  updateCnt({ slides: arr });
                                }} placeholder={t("section.slideTitle")} className="text-xs" />
                              </div>
                              <div>
                                <Label className="text-xs">{t("section.badgePlaceholder")}</Label>
                                <Input value={slide.badge || ""} onChange={(e) => {
                                  const arr = [...slides]; arr[idx] = { ...arr[idx], badge: e.target.value };
                                  updateCnt({ slides: arr });
                                }} placeholder={t("section.badgePlaceholder")} className="text-xs" />
                              </div>
                              <div className="sm:col-span-2">
                                <Label className="text-xs">{t("section.slideSubtitle")}</Label>
                                <Input value={slide.subtitle || ""} onChange={(e) => {
                                  const arr = [...slides]; arr[idx] = { ...arr[idx], subtitle: e.target.value };
                                  updateCnt({ slides: arr });
                                }} placeholder={t("section.slideSubtitle")} className="text-xs" />
                              </div>
                              <div>
                                <Label className="text-xs">{t("section.shopNowPlaceholder")}</Label>
                                <Input value={slide.buttonText || ""} onChange={(e) => {
                                  const arr = [...slides]; arr[idx] = { ...arr[idx], buttonText: e.target.value };
                                  updateCnt({ slides: arr });
                                }} placeholder={t("section.shopNowPlaceholder")} className="text-xs" />
                              </div>
                              <div>
                                <Label className="text-xs">{t("section.buttonLink")}</Label>
                                <Input value={slide.buttonLink || ""} onChange={(e) => {
                                  const arr = [...slides]; arr[idx] = { ...arr[idx], buttonLink: e.target.value };
                                  updateCnt({ slides: arr });
                                }} placeholder="/products" className="text-xs font-mono" />
                              </div>
                              <div>
                                <Label className="text-xs">{t("section.learnMorePlaceholder")}</Label>
                                <Input value={slide.secondaryButtonText || ""} onChange={(e) => {
                                  const arr = [...slides]; arr[idx] = { ...arr[idx], secondaryButtonText: e.target.value };
                                  updateCnt({ slides: arr });
                                }} placeholder={t("section.learnMorePlaceholder")} className="text-xs" />
                              </div>
                              <div>
                                <Label className="text-xs">{t("section.secondaryLink")}</Label>
                                <Input value={slide.secondaryButtonLink || ""} onChange={(e) => {
                                  const arr = [...slides]; arr[idx] = { ...arr[idx], secondaryButtonLink: e.target.value };
                                  updateCnt({ slides: arr });
                                }} placeholder="/collections" className="text-xs font-mono" />
                              </div>
                              <div className="sm:col-span-2">
                                <Label className="text-xs">{t("section.slideImage")}</Label>
                                <ImageUpload
                                  value={slide.imageUrl ? [slide.imageUrl] : []}
                                  onChange={(urls) => {
                                    const arr = [...slides]; arr[idx] = { ...arr[idx], imageUrl: urls[0] || "" };
                                    updateCnt({ slides: arr });
                                  }}
                                  folder="templates"
                                  maxImages={1}
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <Label className="text-xs flex items-center gap-1"><Video className="h-3 w-3" /> {t("section.videoUrl")}</Label>
                                <Input value={slide.videoUrl || ""} onChange={(e) => {
                                  const arr = [...slides]; arr[idx] = { ...arr[idx], videoUrl: e.target.value };
                                  updateCnt({ slides: arr });
                                }} placeholder="https://example.com/video.mp4" className="text-xs font-mono" />
                                <p className="text-[10px] text-muted-foreground mt-1">{t("section.slideVideoHelp")}</p>
                              </div>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                      {slides.length === 0 && (
                        <p className="text-xs text-muted-foreground italic py-2">{t("section.noSlides")}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Countdown Timer ── */}
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2 border-t w-full">
                    <Timer className="h-3.5 w-3.5" />
                    {t("section.countdownTimer")}
                    <ChevronDown className="h-3 w-3 ml-auto" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-3 pt-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={countdown.enabled === true}
                          onCheckedChange={(v) => updateCountdown({ enabled: v })}
                        />
                        <Label className="text-xs">{t("section.enableCountdown")}</Label>
                      </div>
                      {countdown.enabled === true && (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          <div>
                            <Label className="text-xs">{t("section.endDateTime")}</Label>
                            <Input
                              type="datetime-local"
                              value={(countdown.endDate as string) || ""}
                              onChange={(e) => updateCountdown({ endDate: e.target.value })}
                              className="text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">{t("section.label")}</Label>
                            <Input
                              value={(countdown.label as string) || ""}
                              onChange={(e) => updateCountdown({ label: e.target.value })}
                              placeholder={t("section.labelPlaceholder")}
                              className="text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">{t("section.variant")}</Label>
                            <Select value={(countdown.variant as string) ?? "default"} onValueChange={(v) => updateCountdown({ variant: v })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="default">{t("section.variantBoxed")}</SelectItem>
                                <SelectItem value="minimal">{t("section.variantMinimal")}</SelectItem>
                                <SelectItem value="badge">{t("section.variantBadge")}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            );
          })()}
          {(section.type === "featured-products" || section.type === "new-arrivals") && (() => {
            const cfg = (() => { try { return JSON.parse(section.config || "{}"); } catch { return {}; } })();
            const updateCfg = (patch: Record<string, unknown>) => {
              const merged = { ...cfg, ...patch };
              onUpdate({ ...section, config: JSON.stringify(merged, null, 2) });
            };
            return (
              <div className="space-y-4 p-3 bg-muted/30 rounded-lg border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("section.productGridLayout")}</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <Label className="text-xs">{t("section.productsToShow")}</Label>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={cfg.limit ?? 8}
                      onChange={(e) => updateCfg({ limit: parseInt(e.target.value) || 8 })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{t("section.columns")}</Label>
                    <Select value={String(cfg.columns ?? 4)} onValueChange={(v) => updateCfg({ columns: parseInt(v) })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <SelectItem key={n} value={String(n)}>{n} {n === 1 ? t("section.column") : t("section.columnsLabel")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">{t("section.spacing")}</Label>
                    <Select value={cfg.gap ?? "normal"} onValueChange={(v) => updateCfg({ gap: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tight">{t("section.spacingTight")}</SelectItem>
                        <SelectItem value="normal">{t("section.spacingNormal")}</SelectItem>
                        <SelectItem value="loose">{t("section.spacingLoose")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">{t("section.cardRatio")}</Label>
                    <Select value={cfg.cardRatio ?? "portrait"} onValueChange={(v) => updateCfg({ cardRatio: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="square">{t("section.ratioSquare")}</SelectItem>
                        <SelectItem value="portrait">{t("section.ratioPortrait")}</SelectItem>
                        <SelectItem value="landscape">{t("section.ratioLandscape")}</SelectItem>
                        <SelectItem value="wide">{t("section.ratioWide")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {section.type === "new-arrivals" && (
                    <div>
                      <Label className="text-xs">{t("section.daysBack")}</Label>
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        value={cfg.daysBack ?? 30}
                        onChange={(e) => updateCfg({ daysBack: parseInt(e.target.value) || 30 })}
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">{t("section.daysBackHelp")}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={cfg.showAddToCart !== false}
                      onCheckedChange={(v) => updateCfg({ showAddToCart: v })}
                    />
                    <Label className="text-xs">{t("section.addToCartButton")}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={cfg.showWishlist !== false}
                      onCheckedChange={(v) => updateCfg({ showWishlist: v })}
                    />
                    <Label className="text-xs">{t("section.wishlistButton")}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={cfg.showBadges !== false}
                      onCheckedChange={(v) => updateCfg({ showBadges: v })}
                    />
                    <Label className="text-xs">{t("section.badgesNewSale")}</Label>
                  </div>
                </div>
              </div>
            );
          })()}
          {section.type === "trust-bar" && (() => {
            const cfg = (() => { try { return JSON.parse(section.config || "{}"); } catch { return {}; } })();
            const updateCfg = (patch: Record<string, unknown>) => {
              const merged = { ...cfg, ...patch };
              onUpdate({ ...section, config: JSON.stringify(merged, null, 2) });
            };
            return (
              <div className="space-y-4 p-3 bg-muted/30 rounded-lg border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("section.trustBarLayout")}</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <Label className="text-xs">{t("section.style")}</Label>
                    <Select value={cfg.style ?? "default"} onValueChange={(v) => updateCfg({ style: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">{t("section.trustStyleDefault")}</SelectItem>
                        <SelectItem value="cards">{t("section.trustStyleCards")}</SelectItem>
                        <SelectItem value="minimal">{t("section.trustStyleMinimal")}</SelectItem>
                        <SelectItem value="banner">{t("section.trustStyleBanner")}</SelectItem>
                        <SelectItem value="centered">{t("section.trustStyleCentered")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {cfg.style === "cards" ? t("section.trustStyleDefaultDesc") :
                       cfg.style === "minimal" ? t("section.trustStyleMinimalDesc") :
                       cfg.style === "banner" ? t("section.trustStyleBannerDesc") :
                       cfg.style === "centered" ? t("section.trustStyleCenteredDesc") :
                       t("section.trustStyleDefaultDesc")}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs">{t("section.columns")}</Label>
                    <Select value={String(cfg.columns ?? 4)} onValueChange={(v) => updateCfg({ columns: parseInt(v) })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2, 3, 4, 5, 6].map((n) => (
                          <SelectItem key={n} value={String(n)}>{n} {t("section.columnsLabel")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">{t("section.iconStyle")}</Label>
                    <Select value={cfg.iconStyle ?? "rounded"} onValueChange={(v) => updateCfg({ iconStyle: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rounded">{t("section.iconRounded")}</SelectItem>
                        <SelectItem value="circle">{t("section.iconCircle")}</SelectItem>
                        <SelectItem value="square">{t("section.iconSquare")}</SelectItem>
                        <SelectItem value="none">{t("section.iconNone")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">{t("section.backgroundColor")}</Label>
                    <Input
                      type="text"
                      value={cfg.backgroundColor ?? ""}
                      onChange={(e) => updateCfg({ backgroundColor: e.target.value || "" })}
                      placeholder={t("section.backgroundColorPlaceholder")}
                      className="font-mono text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{t("section.textColor")}</Label>
                    <Input
                      type="text"
                      value={cfg.textColor ?? ""}
                      onChange={(e) => updateCfg({ textColor: e.target.value || "" })}
                      placeholder={t("section.textColorPlaceholder")}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={cfg.showDescription !== false}
                      onCheckedChange={(v) => updateCfg({ showDescription: v })}
                    />
                    <Label className="text-xs">{t("section.showDescriptions")}</Label>
                  </div>
                </div>
              </div>
            );
          })()}
          {section.type === "categories" && (() => {
            const cfg = (() => { try { return JSON.parse(section.config || "{}"); } catch { return {}; } })();
            const updateCfg = (patch: Record<string, unknown>) => {
              const merged = { ...cfg, ...patch };
              onUpdate({ ...section, config: JSON.stringify(merged, null, 2) });
            };
            return (
              <div className="space-y-4 p-3 bg-muted/30 rounded-lg border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("section.categoryGridLayout")}</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <Label className="text-xs">{t("section.categoriesToShow")}</Label>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={cfg.limit ?? 12}
                      onChange={(e) => updateCfg({ limit: parseInt(e.target.value) || 12 })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{t("section.displayMode")}</Label>
                    <Select value={cfg.display ?? "carousel"} onValueChange={(v) => updateCfg({ display: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="carousel">{t("section.displayCarousel")}</SelectItem>
                        <SelectItem value="grid">{t("section.displayGrid")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">{t("section.columns")}</Label>
                    <Select value={String(cfg.columns ?? 6)} onValueChange={(v) => updateCfg({ columns: parseInt(v) })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2, 3, 4, 5, 6].map((n) => (
                          <SelectItem key={n} value={String(n)}>{n} {t("section.columnsLabel")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {cfg.display === "grid" ? t("section.gridColumns") : t("section.visibleItems")}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs">{t("section.spacing")}</Label>
                    <Select value={cfg.gap ?? "normal"} onValueChange={(v) => updateCfg({ gap: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tight">{t("section.spacingTight")}</SelectItem>
                        <SelectItem value="normal">{t("section.spacingNormal")}</SelectItem>
                        <SelectItem value="loose">{t("section.spacingLoose")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">{t("section.cardShape")}</Label>
                    <Select value={cfg.cardRatio ?? "square"} onValueChange={(v) => updateCfg({ cardRatio: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="square">{t("section.shapeSquare")}</SelectItem>
                        <SelectItem value="portrait">{t("section.shapePortrait")}</SelectItem>
                        <SelectItem value="circle">{t("section.shapeCircle")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={cfg.showImage !== false}
                      onCheckedChange={(v) => updateCfg({ showImage: v })}
                    />
                    <Label className="text-xs">{t("section.showImages")}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={cfg.showCount === true}
                      onCheckedChange={(v) => updateCfg({ showCount: v })}
                    />
                    <Label className="text-xs">{t("section.showProductCount")}</Label>
                  </div>
                </div>
              </div>
            );
          })()}
          {section.type === "promo-banner" && (() => {
            const cfg = (() => { try { return JSON.parse(section.config || "{}"); } catch { return {}; } })();
            const updateCfg = (patch: Record<string, unknown>) => {
              const merged = { ...cfg, ...patch };
              onUpdate({ ...section, config: JSON.stringify(merged, null, 2) });
            };
            return (
              <div className="space-y-4 p-3 bg-muted/30 rounded-lg border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("section.promoBannerLayout")}</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <Label className="text-xs">{t("section.style")}</Label>
                    <Select value={cfg.style ?? "default"} onValueChange={(v) => updateCfg({ style: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">{t("section.promoStyleDefault")}</SelectItem>
                        <SelectItem value="fullwidth">{t("section.promoStyleFullWidth")}</SelectItem>
                        <SelectItem value="split">{t("section.promoStyleSplit")}</SelectItem>
                        <SelectItem value="minimal">{t("section.promoStyleMinimal")}</SelectItem>
                        <SelectItem value="banner">{t("section.promoStyleBanner")}</SelectItem>
                        <SelectItem value="card">{t("section.promoStyleCard")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {cfg.style === "fullwidth" ? "Edge-to-edge background image" :
                       cfg.style === "split" ? "Text on left, image on right" :
                       cfg.style === "minimal" ? "Clean dashed border, light feel" :
                       cfg.style === "banner" ? "Compact horizontal strip" :
                       cfg.style === "card" ? "Frosted card over background" :
                       "Rounded card with dark background"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs">{t("section.height")}</Label>
                    <Select value={cfg.height ?? "medium"} onValueChange={(v) => updateCfg({ height: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">{t("section.heightSmall")}</SelectItem>
                        <SelectItem value="medium">{t("section.heightMedium")}</SelectItem>
                        <SelectItem value="large">{t("section.heightLarge")}</SelectItem>
                        <SelectItem value="full">{t("section.heightExtraLarge")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">{t("section.alignment")}</Label>
                    <Select value={cfg.alignment ?? "center"} onValueChange={(v) => updateCfg({ alignment: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">{t("section.alignLeft")}</SelectItem>
                        <SelectItem value="center">{t("section.alignCenter")}</SelectItem>
                        <SelectItem value="right">{t("section.alignRight")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">{t("section.overlayOpacity")}</Label>
                    <Input
                      type="number"
                      min={0}
                      max={1}
                      step={0.1}
                      value={cfg.overlayOpacity ?? 0.4}
                      onChange={(e) => updateCfg({ overlayOpacity: parseFloat(e.target.value) || 0.4 })}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">{t("section.overlayOpacityHelp")}</p>
                  </div>
                  <div>
                    <Label className="text-xs">{t("section.backgroundColor")}</Label>
                    <Input
                      type="text"
                      value={cfg.backgroundColor ?? ""}
                      onChange={(e) => updateCfg({ backgroundColor: e.target.value || "" })}
                      placeholder={t("section.backgroundColorPlaceholder")}
                      className="font-mono text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{t("section.textColor")}</Label>
                    <Input
                      type="text"
                      value={cfg.textColor ?? "#ffffff"}
                      onChange={(e) => updateCfg({ textColor: e.target.value || "#ffffff" })}
                      placeholder="#ffffff"
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={cfg.overlay !== false}
                      onCheckedChange={(v) => updateCfg({ overlay: v })}
                    />
                    <Label className="text-xs">{t("section.imageOverlay")}</Label>
                  </div>
                </div>
              </div>
            );
          })()}
          <div>
            <Label>{t("section.content")}</Label>
            <Textarea
              value={section.content || ""}
              onChange={(e) => onUpdate({ ...section, content: e.target.value || null })}
              placeholder={t("section.contentPlaceholder")}
              rows={3}
            />
          </div>
          <div>
            <Label>{t("section.configJson")}</Label>
            <Textarea
              value={section.config || ""}
              onChange={(e) => onUpdate({ ...section, config: e.target.value || null })}
              placeholder={t("section.configJsonPlaceholder")}
              rows={3}
              className="font-mono text-xs"
            />
          </div>
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline">
              <HelpCircle className="h-3.5 w-3.5" />
              {t("section.configHelp")}
              <ChevronDown className="h-3 w-3 transition-transform [[data-state=open]>&]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <SectionHelpPanel type={section.type} />
            </CollapsibleContent>
          </Collapsible>

          <div className="flex items-center gap-2">
            <Switch
              checked={section.isVisible}
              onCheckedChange={(v) => onUpdate({ ...section, isVisible: v })}
            />
            <Label>{t("section.visible")}</Label>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Add Section Dialog ───
function AddSectionDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (type: string, name: string) => void;
}) {
  const t = useTranslations("admin.templates");
  const [selectedType, setSelectedType] = useState<string>("");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("addSection.title")}</DialogTitle>
          <DialogDescription>{t("addSection.description")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 max-h-[400px] overflow-y-auto py-2">
          {SECTION_TYPES.map((st) => (
            <button
              key={st.value}
              onClick={() => setSelectedType(st.value)}
              className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                selectedType === st.value
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted/50"
              }`}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted shrink-0">
                <st.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">{t(`sectionTypes.${st.value}`)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t(`sectionDescriptions.${st.value}`)}</p>
              </div>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("addSection.cancel")}
          </Button>
          <Button
            disabled={!selectedType}
            onClick={() => {
              if (selectedType) {
                const label = t(`sectionTypes.${selectedType}`);
                onAdd(selectedType, label);
                setSelectedType("");
                onClose();
              }
            }}
          >
            {t("addSection.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Template Editor Dialog ───
function TemplateEditorDialog({
  open,
  onClose,
  template,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  template: Template | null;
  onSaved: () => void;
}) {
  const t = useTranslations("admin.templates");
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [isDefault, setIsDefault] = useState(false);
  const [sections, setSections] = useState<TemplateSection[]>([]);
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // Theme colors
  const [colors, setColors] = useState<Record<string, string>>({});
  function setColor(key: string, value: string) {
    setColors((prev) => ({ ...prev, [key]: value }));
  }
  function clearColor(key: string) {
    setColors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  useEffect(() => {
    if (open) {
      if (template) {
        setName(template.name);
        setSlug(template.slug);
        setDescription(template.description || "");
        setThumbnail(template.thumbnail || "");
        setIsActive(template.isActive);
        setIsDefault(template.isDefault);
        try {
          const cfg = template.config ? JSON.parse(template.config) : {};
          setColors(cfg.colors || {});
        } catch { setColors({}); }
        setSections(
          template.sections
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((s) => ({ ...s }))
        );
      } else {
        setName("");
        setSlug("");
        setDescription("");
        setThumbnail("");
        setIsActive(false);
        setIsDefault(false);
        setColors({});
        setSections([]);
      }
    }
  }, [open, template]);

  function handleNameChange(val: string) {
    setName(val);
    if (!template) setSlug(slugify(val));
  }

  function addSection(type: string, sectionName: string) {
    setSections((prev) => [
      ...prev,
      {
        name: sectionName,
        type,
        config: null,
        content: null,
        sortOrder: prev.length,
        isVisible: true,
      },
    ]);
  }

  function updateSection(index: number, section: TemplateSection) {
    setSections((prev) => prev.map((s, i) => (i === index ? section : s)));
  }

  function removeSection(index: number) {
    setSections((prev) => prev.filter((_, i) => i !== index));
  }

  function moveSection(index: number, dir: "up" | "down") {
    setSections((prev) => {
      const arr = [...prev];
      const target = dir === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= arr.length) return prev;
      [arr[index], arr[target]] = [arr[target], arr[index]];
      return arr;
    });
  }

  async function handleSave() {
    if (!name.trim() || !slug.trim()) {
      toast.error(t("toasts.nameRequired"));
      return;
    }
    setSaving(true);
    try {
      const body = {
        ...(template ? { id: template.id } : {}),
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || null,
        thumbnail: thumbnail || null,
        isActive,
        isDefault,
        config: Object.keys(colors).length > 0 ? JSON.stringify({ colors }) : null,
        sections: sections.map((s, i) => ({
          name: s.name,
          type: s.type,
          config: s.config,
          content: s.content,
          sortOrder: i,
          isVisible: s.isVisible,
        })),
      };

      const res = await fetch("/api/templates", {
        method: template ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save template");
      }

      toast.success(template ? t("toasts.updated") : t("toasts.created"));
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("toasts.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{template ? t("editor.editTitle") : t("editor.createTitle")}</DialogTitle>
            <DialogDescription>
              {template
                ? t("editor.editDescription")
                : t("editor.createDescription")}
            </DialogDescription>
          </DialogHeader>

          {/* Help Banner */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
            <HelpCircle className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground flex-1">
              {t("editor.helpNote")}
            </p>
            <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => setHelpOpen(true)}>
              <HelpCircle className="mr-1.5 h-3.5 w-3.5" />
              {t("editor.sectionGuide")}
            </Button>
          </div>

          <div className="space-y-6 py-2">
            {/* Basic Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>{t("editor.templateName")}</Label>
                <Input
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder={t("editor.templateNamePlaceholder")}
                />
              </div>
              <div>
                <Label>{t("editor.slug")}</Label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder={t("editor.slugPlaceholder")}
                />
              </div>
            </div>

            <div>
              <Label>{t("editor.description")}</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("editor.descriptionPlaceholder")}
                rows={2}
              />
            </div>

            <div>
              <Label>{t("editor.thumbnail")}</Label>
              <p className="text-xs text-muted-foreground mb-2">
                {t("editor.thumbnailDescription")}
              </p>
              <ImageUpload
                value={thumbnail ? [thumbnail] : []}
                onChange={(urls) => setThumbnail(urls[0] || "")}
                folder="templates"
                maxImages={1}
              />
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label>{t("editor.activeLabel")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={isDefault} onCheckedChange={setIsDefault} />
                <Label>{t("editor.defaultLabel")}</Label>
              </div>
            </div>

            {/* Theme Colors */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <button type="button" className="flex items-center gap-2 w-full text-left group">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-base cursor-pointer">{t("editor.themeColors")}</Label>
                  {Object.keys(colors).length > 0 && (
                    <Badge variant="secondary" className="text-[10px] ml-1">
                      {Object.keys(colors).length} {t("editor.custom")}
                    </Badge>
                  )}
                  <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto transition-transform group-data-[state=open]:rotate-180" />
                </button>
              </CollapsibleTrigger>
              <p className="text-xs text-muted-foreground mt-1 mb-2">
                {t("editor.themeColorsDescription")}
              </p>
              <CollapsibleContent className="pt-2">
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { key: "primary", labelKey: "primary", descKey: "primaryDescription", defaultVal: "#16a249" },
                    { key: "primary-foreground", labelKey: "primaryText", descKey: "primaryTextDescription", defaultVal: "#fbfbf8" },
                    { key: "secondary", labelKey: "secondary", descKey: "secondaryDescription", defaultVal: "#facc14" },
                    { key: "secondary-foreground", labelKey: "secondaryText", descKey: "secondaryTextDescription", defaultVal: "#05140d" },
                    { key: "background", labelKey: "background", descKey: "backgroundDescription", defaultVal: "#fbfbf8" },
                    { key: "foreground", labelKey: "foreground", descKey: "foregroundDescription", defaultVal: "#05140d" },
                    { key: "accent", labelKey: "accent", descKey: "accentDescription", defaultVal: "#dcf9e7" },
                    { key: "accent-foreground", labelKey: "accentText", descKey: "accentTextDescription", defaultVal: "#12873d" },
                    { key: "muted", labelKey: "mutedBg", descKey: "mutedBgDescription", defaultVal: "#f3f1ed" },
                    { key: "muted-foreground", labelKey: "mutedText", descKey: "mutedTextDescription", defaultVal: "#5c7066" },
                    { key: "card", labelKey: "card", descKey: "cardDescription", defaultVal: "#ffffff" },
                    { key: "card-foreground", labelKey: "cardText", descKey: "cardTextDescription", defaultVal: "#05140d" },
                    { key: "border", labelKey: "border", descKey: "borderDescription", defaultVal: "#e0ebe6" },
                    { key: "ring", labelKey: "ring", descKey: "ringDescription", defaultVal: "#16a249" },
                    { key: "destructive", labelKey: "destructive", descKey: "destructiveDescription", defaultVal: "#ef4343" },
                  ].map((c) => (
                    <div key={c.key} className="flex items-center gap-3">
                      <ColorPicker
                        value={colors[c.key] || ""}
                        defaultValue={c.defaultVal}
                        onChange={(color) => setColor(c.key, color)}
                        onClear={() => clearColor(c.key)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{t(`colors.${c.labelKey}`)}</p>
                        <p className="text-xs text-muted-foreground truncate">{t(`colors.${c.descKey}`)}</p>
                      </div>
                      <code className="text-[10px] text-muted-foreground font-mono">
                        {colors[c.key] || c.defaultVal}
                      </code>
                    </div>
                  ))}
                </div>
                {Object.keys(colors).length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-4 text-xs text-muted-foreground"
                    onClick={() => setColors({})}
                  >
                    {t("editor.resetDefaults")}
                  </Button>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Sections */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Label className="text-base">{t("editor.sections")}</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("editor.sectionsDescription")}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setAddSectionOpen(true)}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  {t("editor.addSection")}
                </Button>
              </div>

              {sections.length === 0 ? (
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <LayoutTemplate className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">{t("editor.noSections")}</p>
                  <Button size="sm" variant="outline" onClick={() => setAddSectionOpen(true)}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    {t("editor.addFirstSection")}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {sections.map((section, i) => (
                    <SectionRow
                      key={i}
                      section={section}
                      index={i}
                      total={sections.length}
                      onUpdate={(s) => updateSection(i, s)}
                      onRemove={() => removeSection(i)}
                      onMove={(dir) => moveSection(i, dir)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={saving}>
              {t("editor.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {template ? t("editor.saveChanges") : t("editor.createTitle")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddSectionDialog
        open={addSectionOpen}
        onClose={() => setAddSectionOpen(false)}
        onAdd={addSection}
      />

      <TemplateHelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
      />
    </>
  );
}

// ─── Main Page ───
export default function TemplatesPage() {
  const t = useTranslations("admin.templates");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/templates");
      if (res.ok) setTemplates(await res.json());
      else toast.error(t("toasts.loadFailed"));
    } catch {
      toast.error(t("toasts.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  function openCreate() {
    setEditingTemplate(null);
    setEditorOpen(true);
  }

  function openEdit(tmpl: Template) {
    setEditingTemplate(tmpl);
    setEditorOpen(true);
  }

  async function handleActivate(tmpl: Template) {
    try {
      const res = await fetch("/api/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: tmpl.id,
          name: tmpl.name,
          slug: tmpl.slug,
          description: tmpl.description,
          thumbnail: tmpl.thumbnail,
          isActive: true,
          isDefault: tmpl.isDefault,
          config: tmpl.config,
          sections: tmpl.sections.map((s) => ({
            name: s.name,
            type: s.type,
            config: s.config,
            content: s.content,
            sortOrder: s.sortOrder,
            isVisible: s.isVisible,
          })),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("toasts.activated"));
      fetchTemplates();
    } catch {
      toast.error(t("toasts.activateFailed"));
    }
  }

  function handleExport(tmpl: Template) {
    const exportData = {
      name: tmpl.name,
      slug: tmpl.slug,
      description: tmpl.description,
      config: tmpl.config,
      sections: tmpl.sections
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((s) => ({
          name: s.name,
          type: s.type,
          config: s.config,
          content: s.content,
          sortOrder: s.sortOrder,
          isVisible: s.isVisible,
        })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `template-${tmpl.slug}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("toasts.exported"));
  }

  function handleImport() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.name || !data.slug || !Array.isArray(data.sections)) {
          toast.error(t("toasts.invalidFile"));
          return;
        }
        const res = await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.name,
            slug: data.slug + "-import-" + Date.now().toString(36),
            description: data.description || null,
            thumbnail: null,
            isActive: false,
            isDefault: false,
            config: data.config || null,
            sections: data.sections.map((s: Record<string, unknown>, i: number) => ({
              name: s.name || `Section ${i + 1}`,
              type: s.type || "rich-text",
              config: s.config || null,
              content: s.content || null,
              sortOrder: typeof s.sortOrder === "number" ? s.sortOrder : i,
              isVisible: s.isVisible !== false,
            })),
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to import");
        }
        toast.success(t("toasts.imported", { name: data.name }));
        fetchTemplates();
      } catch (e) {
        if (e instanceof SyntaxError) {
          toast.error(t("toasts.invalidJson"));
        } else {
          toast.error(e instanceof Error ? e.message : t("toasts.importFailed"));
        }
      }
    };
    input.click();
  }

  async function handleDelete(tmpl: Template) {
    if (!confirm(t("deleteConfirm", { name: tmpl.name }))) return;
    try {
      const res = await fetch(`/api/templates?id=${tmpl.id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete");
      }
      toast.success(t("toasts.deleted"));
      fetchTemplates();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("toasts.deleteFailed"));
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48 mt-1" />
              </CardHeader>
              <CardContent>
                <Skeleton className="aspect-video rounded-lg mb-4" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setHelpOpen(true)}>
              <HelpCircle className="mr-2 h-4 w-4" />
              {t("guide")}
            </Button>
            <Button variant="outline" onClick={handleImport}>
              <Upload className="mr-2 h-4 w-4" />
              {t("import")}
            </Button>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              {t("createTemplate")}
            </Button>
          </div>
        </div>

        {templates.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Palette className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-1">{t("noTemplates")}</h3>
              <p className="text-sm text-muted-foreground mb-6">
                {t("noTemplatesDescription")}
              </p>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                {t("createTemplate")}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((tmpl) => (
              <Card
                key={tmpl.id}
                className={tmpl.isActive ? "ring-2 ring-primary" : ""}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{tmpl.name}</CardTitle>
                    <div className="flex items-center gap-1.5">
                      {tmpl.isDefault && (
                        <Badge variant="secondary" className="text-[10px]">{t("default")}</Badge>
                      )}
                      {tmpl.isActive && (
                        <Badge className="gap-1">
                          <Check className="h-3 w-3" />
                          {t("active")}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardDescription>
                    {tmpl.description || t("noDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Section Preview */}
                  <div className="bg-muted rounded-lg p-3 mb-4 space-y-1.5 min-h-[100px]">
                    {tmpl.sections.length === 0 ? (
                      <div className="flex items-center justify-center h-[80px] text-xs text-muted-foreground">
                        {t("noSections")}
                      </div>
                    ) : (
                      tmpl.sections
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .slice(0, 5)
                        .map((s, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-xs bg-background rounded px-2.5 py-1.5"
                          >
                            <SectionTypeIcon type={s.type} className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="truncate">{s.name}</span>
                            {!s.isVisible && (
                              <EyeOff className="h-3 w-3 text-muted-foreground ml-auto shrink-0" />
                            )}
                          </div>
                        ))
                    )}
                    {tmpl.sections.length > 5 && (
                      <p className="text-[10px] text-muted-foreground text-center pt-1">
                        {t("moreSections", { count: tmpl.sections.length - 5 })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{tmpl.sections.length !== 1 ? t("sectionsCount", { count: tmpl.sections.length }) : t("sectionCount", { count: tmpl.sections.length })}</span>
                    <div className="flex gap-1.5">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(tmpl)} title="Edit">
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleExport(tmpl)} title="Export JSON">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(tmpl)}
                        disabled={tmpl.isDefault}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      {!tmpl.isActive && (
                        <Button size="sm" onClick={() => handleActivate(tmpl)}>
                          <Eye className="mr-1.5 h-3.5 w-3.5" />
                          {t("activate")}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <TemplateEditorDialog
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        template={editingTemplate}
        onSaved={fetchTemplates}
      />

      <TemplateHelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
      />
    </>
  );
}
