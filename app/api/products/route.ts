import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { slugify } from "@/lib/helpers";
import { z } from "zod";
import { serializeDecimal } from "@/lib/decimal";
import {
  products,
  productImages,
  productVariants,
  productCategories,
  productAttributeValues,
  productBundles,
  categories,
  productAttributes,
} from "@/lib/schema";
import {
  eq,
  and,
  or,
  desc,
  asc,
  ilike,
  inArray,
  gte,
  lte,
  count,
  SQL,
} from "drizzle-orm";

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  price: z.number().min(0, "Price must be positive"),
  compareAtPrice: z.number().nullable().optional(),
  costPrice: z.number().nullable().optional(),
  quantity: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  weight: z.number().nullable().optional(),
  length: z.number().nullable().optional(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  dimensionUnit: z.string().default("cm"),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
  productType: z.string().optional(),
  productGroupId: z.string().optional(),
  vendor: z.string().optional(),
  tags: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  isFeatured: z.boolean().default(false),
  isDigital: z.boolean().default(false),
  isGiftCard: z.boolean().default(false),
  trackInventory: z.boolean().default(true),
  taxable: z.boolean().default(true),
  requiresShipping: z.boolean().default(true),
  continueSellingWhenOOS: z.boolean().default(false),
  images: z.array(z.string()).optional(),
  // New fields
  customBadge: z.string().nullable().optional(),
  warrantyInfo: z.string().nullable().optional(),
  estimatedDelivery: z.string().nullable().optional(),
  hsCode: z.string().nullable().optional(),
  countryOfOrigin: z.string().nullable().optional(),
  minOrderQty: z.number().int().min(1).default(1),
  maxOrderQty: z.number().int().nullable().optional(),
  scheduledAt: z.string().nullable().optional(),
  salePriceFrom: z.string().nullable().optional(),
  salePriceTo: z.string().nullable().optional(),
  // Relations
  categoryIds: z.array(z.string()).optional(),
  attributes: z
    .array(
      z.object({
        attributeId: z.string(),
        values: z.array(z.string()),
      })
    )
    .optional(),
  variants: z
    .array(
      z.object({
        name: z.string(),
        sku: z.string().optional(),
        barcode: z.string().optional(),
        price: z.number().min(0),
        compareAtPrice: z.number().nullable().optional(),
        costPrice: z.number().nullable().optional(),
        quantity: z.number().int().min(0).default(0),
        weight: z.number().nullable().optional(),
        image: z.string().nullable().optional(),
        option1: z.string().optional(),
        option2: z.string().optional(),
        option3: z.string().optional(),
      })
    )
    .optional(),
  bundleItems: z
    .array(
      z.object({
        childId: z.string(),
        quantity: z.number().int().min(1).default(1),
        discount: z.number().min(0).max(100).default(0),
      })
    )
    .optional(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category");
    const sort = searchParams.get("sort") || "newest";
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const featured = searchParams.get("featured") === "true";
    const group = searchParams.get("group");
    const admin = searchParams.get("admin") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "24")));

    // Admin mode requires authentication
    if (admin) {
      const session = await auth();
      if (!session?.user || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Attribute filters: attr_[slug]=value1,value2
    const attrFilters: { slug: string; values: string[] }[] = [];
    searchParams.forEach((value, key) => {
      if (key.startsWith("attr_")) {
        attrFilters.push({
          slug: key.replace("attr_", ""),
          values: value.split(","),
        });
      }
    });

    // Build WHERE conditions
    const conditions: (SQL | undefined)[] = [];

    if (!admin) {
      conditions.push(eq(products.status, "ACTIVE"));
    }

    if (search) {
      conditions.push(
        or(
          ilike(products.name, `%${search}%`),
          ilike(products.description, `%${search}%`),
          ilike(products.tags, `%${search}%`)
        )
      );
    }

    if (featured) {
      conditions.push(eq(products.isFeatured, true));
    }

    if (category) {
      conditions.push(
        inArray(
          products.id,
          db
            .select({ id: productCategories.productId })
            .from(productCategories)
            .innerJoin(
              categories,
              eq(productCategories.categoryId, categories.id)
            )
            .where(eq(categories.slug, category))
        )
      );
    }

    if (group) {
      conditions.push(eq(products.productType, group));
    }

    if (minPrice) {
      conditions.push(gte(products.price, minPrice));
    }

    if (maxPrice) {
      conditions.push(lte(products.price, maxPrice));
    }

    // Attribute filtering via subqueries
    for (const af of attrFilters) {
      conditions.push(
        inArray(
          products.id,
          db
            .select({ id: productAttributeValues.productId })
            .from(productAttributeValues)
            .innerJoin(
              productAttributes,
              eq(productAttributeValues.attributeId, productAttributes.id)
            )
            .where(
              and(
                eq(productAttributes.slug, af.slug),
                inArray(productAttributeValues.value, af.values)
              )
            )
        )
      );
    }

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    // OrderBy mapping
    const orderByClause =
      sort === "price-asc"
        ? asc(products.price)
        : sort === "price-desc"
          ? desc(products.price)
          : sort === "name"
            ? asc(products.name)
            : desc(products.createdAt);

    const [productsList, [{ value: total }]] = await Promise.all([
      db.query.products.findMany({
        where: whereCondition,
        orderBy: orderByClause,
        offset: (page - 1) * perPage,
        limit: perPage,
        with: {
          images: admin
            ? { where: eq(productImages.isPrimary, true), limit: 1 }
            : { orderBy: asc(productImages.position) },
          categories: { with: { category: true } },
          attributeValues: {
            with: {
              attribute: {
                columns: { name: true, slug: true, type: true },
              },
            },
          },
          ...(admin
            ? {
                orderItems: { columns: { id: true } },
                reviews: { columns: { id: true } },
              }
            : {}),
        },
      }),
      db.select({ value: count() }).from(products).where(whereCondition),
    ]);

    // For admin, transform to add _count and remove raw relation arrays
    const result = admin
      ? productsList.map((p: any) => {
          const { orderItems, reviews, ...rest } = p;
          return {
            ...rest,
            _count: {
              orderItems: orderItems?.length ?? 0,
              reviews: reviews?.length ?? 0,
            },
          };
        })
      : productsList;

    return NextResponse.json(
      serializeDecimal({
        products: result,
        pagination: {
          page,
          limit: perPage,
          total,
          totalPages: Math.ceil(total / perPage),
        },
      })
    );
  } catch (error) {
    console.error("Products GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = productSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = parsed.data;
    let slug = slugify(data.name);

    // Ensure unique slug
    const existingSlug = await db.query.products.findFirst({
      where: eq(products.slug, slug),
    });
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    // Ensure unique SKU if provided
    if (data.sku) {
      const existingSku = await db.query.products.findFirst({
        where: eq(products.sku, data.sku),
      });
      if (existingSku) {
        return NextResponse.json(
          { error: "SKU already exists" },
          { status: 400 }
        );
      }
    }

    const product = await db.transaction(async (tx) => {
      const [newProduct] = await tx
        .insert(products)
        .values({
          name: data.name,
          slug,
          description: data.description || null,
          shortDescription: data.shortDescription || null,
          sku: data.sku || null,
          barcode: data.barcode || null,
          price: String(data.price),
          compareAtPrice: data.compareAtPrice ? String(data.compareAtPrice) : null,
          costPrice: data.costPrice ? String(data.costPrice) : null,
          quantity: data.quantity,
          lowStockThreshold: data.lowStockThreshold,
          weight: data.weight || null,
          length: data.length || null,
          width: data.width || null,
          height: data.height || null,
          dimensionUnit: data.dimensionUnit || "cm",
          status: data.status,
          productType: data.productGroupId || data.productType || null,
          vendor: data.vendor || null,
          tags: data.tags || null,
          seoTitle: data.seoTitle || null,
          seoDescription: data.seoDescription || null,
          isFeatured: data.isFeatured,
          isDigital: data.isDigital,
          isGiftCard: data.isGiftCard,
          trackInventory: data.trackInventory,
          taxable: data.taxable,
          requiresShipping: data.requiresShipping,
          continueSellingWhenOOS: data.continueSellingWhenOOS,
          customBadge: data.customBadge || null,
          warrantyInfo: data.warrantyInfo || null,
          estimatedDelivery: data.estimatedDelivery || null,
          hsCode: data.hsCode || null,
          countryOfOrigin: data.countryOfOrigin || null,
          minOrderQty: data.minOrderQty || 1,
          maxOrderQty: data.maxOrderQty || null,
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
          salePriceFrom: data.salePriceFrom ? new Date(data.salePriceFrom) : null,
          salePriceTo: data.salePriceTo ? new Date(data.salePriceTo) : null,
        })
        .returning();

      // Create product images
      const imageUrls =
        data.images && data.images.length > 0
          ? data.images
          : [
              `https://placehold.co/600x600/e2e8f0/64748b?text=${encodeURIComponent(newProduct.name.split(" ").slice(0, 2).join("+"))}`,
            ];

      await tx.insert(productImages).values(
        imageUrls.map((url: string, index: number) => ({
          productId: newProduct.id,
          url,
          alt: newProduct.name,
          position: index,
          isPrimary: index === 0,
        }))
      );

      // Save product attributes
      if (data.attributes && data.attributes.length > 0) {
        const attrData = data.attributes.flatMap((attr) =>
          attr.values
            .filter((v) => v.trim() !== "")
            .map((value) => ({
              productId: newProduct.id,
              attributeId: attr.attributeId,
              value,
            }))
        );
        if (attrData.length > 0) {
          await tx.insert(productAttributeValues).values(attrData);
        }
      }

      // Save variants
      if (data.variants && data.variants.length > 0) {
        await tx.insert(productVariants).values(
          data.variants.map((v) => ({
            productId: newProduct.id,
            name: v.name,
            sku: v.sku || null,
            barcode: v.barcode || null,
            price: String(v.price),
            compareAtPrice: v.compareAtPrice ? String(v.compareAtPrice) : null,
            costPrice: v.costPrice ? String(v.costPrice) : null,
            quantity: v.quantity,
            weight: v.weight || null,
            image: v.image || null,
            option1: v.option1 || null,
            option2: v.option2 || null,
            option3: v.option3 || null,
          }))
        );
      }

      // Save category associations
      if (data.categoryIds && data.categoryIds.length > 0) {
        await tx.insert(productCategories).values(
          data.categoryIds.map((categoryId) => ({
            productId: newProduct.id,
            categoryId,
          }))
        );
      }

      // Save bundle items
      if (data.bundleItems && data.bundleItems.length > 0) {
        await tx.insert(productBundles).values(
          data.bundleItems.map((b) => ({
            productId: newProduct.id,
            childId: b.childId,
            quantity: b.quantity,
            discount: b.discount,
          }))
        );
      }

      return newProduct;
    });

    return NextResponse.json(serializeDecimal(product), { status: 201 });
  } catch (error) {
    console.error("Product POST error:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
