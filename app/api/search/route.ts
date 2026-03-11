import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { searchLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { serializeDecimal } from "@/lib/decimal";
import { products } from "@/lib/schema";
import { and, or, eq, ilike, count, desc } from "drizzle-orm";
import { getLocale } from "next-intl/server";
import { applyTranslationsBatch } from "@/lib/translations";

export async function GET(req: Request) {
  const rlResponse = await rateLimitResponse(searchLimiter, getClientIp(req));
  if (rlResponse) return rlResponse;

  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    if (!q || q.length < 2) {
      return NextResponse.json({ products: [], total: 0 });
    }

    const where = and(
      eq(products.status, "ACTIVE"),
      or(
        ilike(products.name, `%${q}%`),
        ilike(products.description, `%${q}%`),
        ilike(products.tags, `%${q}%`),
        ilike(products.sku, `%${q}%`),
        ilike(products.vendor, `%${q}%`),
        ilike(products.productType, `%${q}%`),
      ),
    );

    const [productRows, [totalRow]] = await Promise.all([
      db.query.products.findMany({
        where,
        limit,
        orderBy: desc(products.createdAt),
        with: {
          images: {
            where: (imgs, { eq }) => eq(imgs.isPrimary, true),
            limit: 1,
          },
          categories: {
            with: {
              category: {
                columns: { name: true, slug: true },
              },
            },
          },
        },
      }),
      db.select({ value: count() }).from(products).where(where),
    ]);

    return NextResponse.json(serializeDecimal({
      products: await applyTranslationsBatch("product", productRows as Record<string, unknown>[], await getLocale()),
      total: totalRow.value,
    }));
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
