/**
 * Seed: Shopify Dawn-inspired Template
 * ─────────────────────────────────────
 * Based on Shopify's "Dawn" – the #1 most popular free theme,
 * known for its clean, conversion-focused layout:
 *
 *  1. Hero Banner — full-width lifestyle image with overlay CTA
 *  2. Trust Bar   — shipping / returns / security / support badges
 *  3. Featured Products — curated 8-product grid
 *  4. Categories  — visual category grid with images
 *  5. Promo Banner — seasonal sale / announcement strip
 *  6. New Arrivals — latest 8 products
 *  7. Rich Text   — brand story block
 *  8. Newsletter  — email signup with incentive
 *
 * Run:  npx tsx scripts/seed-dawn-template.ts
 */

import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { eq } from "drizzle-orm";
import * as schema from "../lib/schema";
import "dotenv/config";

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle(pool, { schema });

async function main() {
  console.log("🎨 Seeding Dawn-inspired template...");

  const SLUG = "dawn-starter";

  // Check if it already exists
  const existing = await db.query.templates.findFirst({
    where: eq(schema.templates.slug, SLUG),
  });

  if (existing) {
    // Delete old sections and re-insert
    await db.delete(schema.templateSections).where(eq(schema.templateSections.templateId, existing.id));
    await db.delete(schema.templates).where(eq(schema.templates.id, existing.id));
    console.log("♻️  Removed existing dawn-starter template, re-creating...");
  }

  // ── Create template ──
  const [template] = await db.insert(schema.templates).values({
    name: "Dawn Starter",
    slug: SLUG,
    description: "A clean, conversion-focused template inspired by Shopify's #1 rated Dawn theme. Features hero imagery, trust signals, product grids, promotional banners, brand storytelling, and newsletter signup.",
    isActive: false,
    isDefault: false,
    config: JSON.stringify({
      primaryColor: "#1a1a2e",
      accentColor: "#e94560",
      fontHeading: "Inter",
      fontBody: "Inter",
      heroStyle: "full-width",
      productGrid: "4-column",
      roundedCorners: true,
      showBreadcrumbs: true,
    }),
  }).returning();

  console.log(`✅ Template created: ${template.name} (${template.id})`);

  // ── Insert sections ──
  const sections = [
    // 1 — Hero Banner
    {
      templateId: template.id,
      name: "Hero Banner",
      type: "hero",
      sortOrder: 0,
      isVisible: true,
      config: JSON.stringify({
        imageUrl: "",
        overlay: true,
        overlayOpacity: 0.4,
        alignment: "center",
        height: "large",
      }),
      content: JSON.stringify({
        title: "Discover Your Perfect Style",
        subtitle: "New season collection with free shipping on orders over $50. Quality products, curated for you.",
        buttonText: "Shop Collection",
        buttonLink: "/products",
        secondaryButtonText: "View Lookbook",
        secondaryButtonLink: "/collections",
      }),
    },

    // 2 — Trust Bar
    {
      templateId: template.id,
      name: "Trust Badges",
      type: "trust-bar",
      sortOrder: 1,
      isVisible: true,
      config: JSON.stringify({
        style: "icons",
        columns: 4,
      }),
      content: JSON.stringify({
        items: [
          { icon: "truck", title: "Free Shipping", description: "On orders over $50" },
          { icon: "rotate-ccw", title: "Easy Returns", description: "30-day hassle-free returns" },
          { icon: "shield-check", title: "Secure Checkout", description: "256-bit SSL encryption" },
          { icon: "headphones", title: "24/7 Support", description: "Chat, email & phone" },
        ],
      }),
    },

    // 3 — Featured Products
    {
      templateId: template.id,
      name: "Featured Products",
      type: "featured-products",
      sortOrder: 2,
      isVisible: true,
      config: JSON.stringify({
        limit: 8,
        columns: 4,
        showRating: true,
        showPrice: true,
      }),
      content: JSON.stringify({
        title: "Staff Picks",
        subtitle: "Hand-selected favorites our customers love",
        viewAllLink: "/products?featured=true",
      }),
    },

    // 4 — Categories
    {
      templateId: template.id,
      name: "Shop by Category",
      type: "categories",
      sortOrder: 3,
      isVisible: true,
      config: JSON.stringify({
        layout: "grid",
        showImage: true,
        columns: 4,
        limit: 8,
        showCount: true,
      }),
      content: JSON.stringify({
        title: "Shop by Category",
        subtitle: "Browse our curated collections",
      }),
    },

    // 5 — Promo Banner
    {
      templateId: template.id,
      name: "Seasonal Promo",
      type: "promo-banner",
      sortOrder: 4,
      isVisible: true,
      config: JSON.stringify({
        imageUrl: "",
        backgroundColor: "#1a1a2e",
        textColor: "#ffffff",
        alignment: "center",
      }),
      content: JSON.stringify({
        title: "Spring Collection — Up to 40% Off",
        subtitle: "Limited-time offer on new arrivals. Free express shipping included.",
        buttonText: "Shop the Sale",
        buttonLink: "/collections/sale",
        badge: "Limited Time",
      }),
    },

    // 6 — New Arrivals
    {
      templateId: template.id,
      name: "New Arrivals",
      type: "new-arrivals",
      sortOrder: 5,
      isVisible: true,
      config: JSON.stringify({
        limit: 8,
        columns: 4,
        daysBack: 30,
      }),
      content: JSON.stringify({
        title: "Just Dropped",
        subtitle: "The latest additions to our collection",
        viewAllLink: "/products?sort=newest",
      }),
    },

    // 7 — Rich Text (Brand Story)
    {
      templateId: template.id,
      name: "Our Story",
      type: "rich-text",
      sortOrder: 6,
      isVisible: true,
      config: JSON.stringify({
        maxWidth: "medium",
        alignment: "center",
        padding: "large",
      }),
      content: JSON.stringify({
        html: "<h2>Crafted with Care</h2><p>We believe everyone deserves access to high-quality products without the premium price tag. Every item in our store is carefully selected to ensure it meets our standards for quality, sustainability, and value.</p><p>Since 2020, we've served over 50,000 happy customers worldwide. Join our community and discover the difference quality makes.</p>",
      }),
    },

    // 8 — Newsletter
    {
      templateId: template.id,
      name: "Newsletter",
      type: "newsletter",
      sortOrder: 7,
      isVisible: true,
      config: JSON.stringify({
        style: "card",
      }),
      content: JSON.stringify({
        title: "Get 10% Off Your First Order",
        subtitle: "Join our newsletter for exclusive deals, new arrivals, and style inspiration delivered to your inbox.",
        disclaimer: "No spam ever. Unsubscribe anytime.",
        buttonText: "Subscribe & Save",
      }),
    },
  ];

  await db.insert(schema.templateSections).values(sections);
  console.log(`✅ ${sections.length} sections created`);

  console.log("\n🎉 Dawn Starter template seeded successfully!");
  console.log("   → Go to Admin → Templates to activate it.");

  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
