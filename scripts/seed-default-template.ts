/**
 * Seed: Default MobileHub Template
 * Creates the default template that was missing from the system.
 *
 * Run:  npx tsx scripts/seed-default-template.ts
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
  console.log("🏪 Seeding Default MobileHub template...");

  const SLUG = "default";

  const existing = await db.query.templates.findFirst({
    where: eq(schema.templates.slug, SLUG),
  });

  if (existing) {
    console.log("✅ Default template already exists, skipping.");
    await pool.end();
    process.exit(0);
  }

  const [template] = await db.insert(schema.templates).values({
    name: "Default Theme",
    slug: SLUG,
    description: "Clean and modern default storefront template for MobileHub",
    isActive: true,
    isDefault: true,
    config: JSON.stringify({
      primaryColor: "#0f172a",
      accentColor: "#3b82f6",
      heroStyle: "full-width",
      productGrid: "4-column",
    }),
  }).returning();

  await db.insert(schema.templateSections).values([
    {
      templateId: template.id,
      name: "Hero Banner",
      type: "hero",
      sortOrder: 0,
      isVisible: true,
      config: JSON.stringify({
        imageUrl: "",
        overlay: true,
        overlayOpacity: 0.5,
        alignment: "center",
        height: "large",
      }),
      content: JSON.stringify({
        title: "Welcome to MobileHub",
        subtitle: "Saudi Arabia's #1 destination for smartphones, tablets & accessories. Free delivery on orders over SAR 200.",
        buttonText: "Shop Smartphones",
        buttonLink: "/collections/smartphones",
      }),
    },
    {
      templateId: template.id,
      name: "Trust Badges",
      type: "trust-bar",
      sortOrder: 1,
      isVisible: true,
      config: JSON.stringify({ style: "icons", columns: 4 }),
      content: JSON.stringify({
        items: [
          { icon: "truck", title: "Free Delivery", description: "On orders over SAR 200" },
          { icon: "rotate-ccw", title: "Easy Returns", description: "14-day return policy" },
          { icon: "shield-check", title: "Genuine Products", description: "100% authentic items" },
          { icon: "headphones", title: "Support", description: "WhatsApp & phone support" },
        ],
      }),
    },
    {
      templateId: template.id,
      name: "Featured Products",
      type: "featured-products",
      sortOrder: 2,
      isVisible: true,
      config: JSON.stringify({ limit: 8, columns: 4, showRating: true, showPrice: true }),
      content: JSON.stringify({
        title: "Featured Products",
        subtitle: "Top picks from our collection",
        viewAllLink: "/products?featured=true",
      }),
    },
    {
      templateId: template.id,
      name: "Categories",
      type: "categories",
      sortOrder: 3,
      isVisible: true,
      config: JSON.stringify({ layout: "grid", showImage: true, columns: 4, showCount: true }),
      content: JSON.stringify({
        title: "Shop by Category",
        subtitle: "Browse our collections",
      }),
    },
    {
      templateId: template.id,
      name: "New Arrivals",
      type: "new-arrivals",
      sortOrder: 4,
      isVisible: true,
      config: JSON.stringify({ limit: 8, columns: 4, daysBack: 30 }),
      content: JSON.stringify({
        title: "New Arrivals",
        subtitle: "The latest products in our store",
        viewAllLink: "/products?sort=newest",
      }),
    },
    {
      templateId: template.id,
      name: "Newsletter",
      type: "newsletter",
      sortOrder: 5,
      isVisible: true,
      config: JSON.stringify({ style: "default" }),
      content: JSON.stringify({
        title: "Get the Latest Deals",
        subtitle: "Subscribe for exclusive offers, new product launches, and tech news",
        disclaimer: "No spam. Unsubscribe anytime.",
        buttonText: "Subscribe",
      }),
    },
  ]);

  console.log(`✅ Default template created: ${template.name} (${template.id})`);
  console.log("   → 6 sections: Hero, Trust Bar, Featured, Categories, New Arrivals, Newsletter");
  console.log("   → Set as Active + Default");

  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
