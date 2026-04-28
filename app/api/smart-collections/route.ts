import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { smartCollections, products, productCategories, categories } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { slugify } from "@/lib/helpers";
import { eq, and, ne, desc, or, gte, lte, like, sql, inArray } from "drizzle-orm";
import { z } from "zod";

const ruleSchema = z.object({
  field: z.enum(["tag", "vendor", "productType", "price", "compareAtPrice", "title", "isFeatured"]),
  operator: z.enum(["equals", "not_equals", "contains", "greater_than", "less_than", "starts_with", "ends_with"]),
  value: z.string(),
});

const collectionSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  rules: z.array(ruleSchema).min(1),
  isActive: z.boolean().default(true),
  seoTitle: z.string().max(200).nullable().optional(),
  seoDescription: z.string().max(500).nullable().optional(),
});

type SmartCollectionRule = z.infer<typeof ruleSchema>;
type RuleProduct = Pick<typeof products.$inferSelect, "tags" | "vendor" | "productType" | "price" | "compareAtPrice" | "name" | "isFeatured">;

// Evaluate rules against products
function evaluateRules(product: RuleProduct, rules: SmartCollectionRule[]): boolean {
  return rules.every((rule) => {
    const value = String(rule.value).toLowerCase();
    let field: string;
    
    switch (rule.field) {
      case "tag":
        field = (product.tags || "").toLowerCase();
        break;
      case "vendor":
        field = (product.vendor || "").toLowerCase();
        break;
      case "productType":
        field = (product.productType || "").toLowerCase();
        break;
      case "price":
        field = String(Number(product.price));
        break;
      case "compareAtPrice":
        field = String(Number(product.compareAtPrice || 0));
        break;
      case "title":
        field = product.name.toLowerCase();
        break;
      case "isFeatured":
        field = String(product.isFeatured);
        break;
      default:
        return false;
    }

    switch (rule.operator) {
      case "equals": return field === value;
      case "not_equals": return field !== value;
      case "contains": return field.includes(value);
      case "starts_with": return field.startsWith(value);
      case "ends_with": return field.endsWith(value);
      case "greater_than": return Number(field) > Number(value);
      case "less_than": return Number(field) < Number(value);
      default: return false;
    }
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");
    const admin = searchParams.get("admin") === "true";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "24");

    // Get single collection with matching products
    if (slug) {
      const collection = await db.query.smartCollections.findFirst({
        where: and(eq(smartCollections.slug, slug), admin ? undefined : eq(smartCollections.isActive, true)),
      });

      if (!collection) {
        return NextResponse.json({ error: "Collection not found" }, { status: 404 });
      }

      const rules = JSON.parse(collection.rules);
      const allProducts = await db.query.products.findMany({
        where: eq(products.status, "ACTIVE"),
        with: { images: { limit: 1 } },
      });

      const matchedProducts = allProducts.filter((p) => evaluateRules(p, rules));
      const offset = (page - 1) * limit;
      const paginatedProducts = matchedProducts.slice(offset, offset + limit);

      return NextResponse.json({
        collection,
        products: paginatedProducts,
        total: matchedProducts.length,
        page,
        totalPages: Math.ceil(matchedProducts.length / limit),
      });
    }

    // List all collections
    const collections = await db.query.smartCollections.findMany({
      where: admin ? undefined : eq(smartCollections.isActive, true),
      orderBy: desc(smartCollections.createdAt),
    });

    return NextResponse.json(collections);
  } catch (error) {
    console.error("Smart collections GET error:", error);
    return NextResponse.json({ error: "Failed to fetch collections" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = collectionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const data = parsed.data;
    let slug = slugify(data.name);
    const existing = await db.query.smartCollections.findFirst({ where: eq(smartCollections.slug, slug) });
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;

    const [collection] = await db.insert(smartCollections).values({
      name: data.name,
      slug,
      description: data.description || null,
      image: data.image || null,
      rules: JSON.stringify(data.rules),
      isActive: data.isActive,
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
    }).returning();

    return NextResponse.json(collection, { status: 201 });
  } catch (error) {
    console.error("Smart collection POST error:", error);
    return NextResponse.json({ error: "Failed to create collection" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: "Collection ID required" }, { status: 400 });

    const existing = await db.query.smartCollections.findFirst({ where: eq(smartCollections.id, id) });
    if (!existing) return NextResponse.json({ error: "Collection not found" }, { status: 404 });

    if (data.name && data.name !== existing.name) {
      let slug = slugify(data.name);
      const slugExists = await db.query.smartCollections.findFirst({
        where: and(eq(smartCollections.slug, slug), ne(smartCollections.id, id)),
      });
      if (slugExists) slug = `${slug}-${Date.now().toString(36)}`;
      data.slug = slug;
    }

    if (data.rules && Array.isArray(data.rules)) {
      data.rules = JSON.stringify(data.rules);
    }

    const [collection] = await db.update(smartCollections).set(data).where(eq(smartCollections.id, id)).returning();
    return NextResponse.json(collection);
  } catch (error) {
    console.error("Smart collection PUT error:", error);
    return NextResponse.json({ error: "Failed to update collection" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Collection ID required" }, { status: 400 });

    await db.delete(smartCollections).where(eq(smartCollections.id, id));
    return NextResponse.json({ message: "Collection deleted" });
  } catch (error) {
    console.error("Smart collection DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete collection" }, { status: 500 });
  }
}
