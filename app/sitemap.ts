import { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { products, categories, pages } from "@/lib/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://localhost:3000";

  // Static pages
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/products`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/collections`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/search`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
  ];

  // Products
  const productList = await db.query.products.findMany({
    where: eq(products.status, "ACTIVE"),
    columns: { slug: true, updatedAt: true },
  });

  const productRoutes: MetadataRoute.Sitemap = productList.map((p) => ({
    url: `${baseUrl}/products/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Categories
  const categoryList = await db.query.categories.findMany({
    where: eq(categories.isActive, true),
    columns: { slug: true, updatedAt: true },
  });

  const categoryRoutes: MetadataRoute.Sitemap = categoryList.map((c) => ({
    url: `${baseUrl}/collections/${c.slug}`,
    lastModified: c.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Published pages
  const pageList = await db.query.pages.findMany({
    where: eq(pages.isPublished, true),
    columns: { slug: true, updatedAt: true },
  });

  const pageRoutes: MetadataRoute.Sitemap = pageList.map((p) => ({
    url: `${baseUrl}/pages/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  return [...staticRoutes, ...productRoutes, ...categoryRoutes, ...pageRoutes];
}
