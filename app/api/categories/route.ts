import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { slugify } from "@/lib/helpers";
import { z } from "zod";
import { categories, productCategories } from "@/lib/schema";
import { eq, ne, and, asc } from "drizzle-orm";

const categorySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  image: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const admin = searchParams.get("admin") === "true";

    if (admin) {
      const session = await auth();
      if (!session?.user || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const results = await db.query.categories.findMany({
      where: admin ? undefined : eq(categories.isActive, true),
      orderBy: asc(categories.sortOrder),
      with: {
        parent: { columns: { id: true, name: true } },
        children: {
          orderBy: (c, { asc }) => asc(c.sortOrder),
          ...(admin ? {} : { where: (c, { eq }) => eq(c.isActive, true) }),
        },
        products: true,
      },
    });

    const mapped = results.map(({ products, ...rest }) => ({
      ...rest,
      _count: { products: products.length },
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("Categories GET error:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const data = parsed.data;
    let slug = slugify(data.name);
    const existing = await db.query.categories.findFirst({ where: eq(categories.slug, slug) });
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;

    const [category] = await db.insert(categories).values({
      name: data.name,
      slug,
      description: data.description || null,
      image: data.image || null,
      parentId: data.parentId || null,
      isActive: data.isActive,
      sortOrder: data.sortOrder,
    }).returning();

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Category POST error:", error);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: "Category ID required" }, { status: 400 });

    const existing = await db.query.categories.findFirst({ where: eq(categories.id, id) });
    if (!existing) return NextResponse.json({ error: "Category not found" }, { status: 404 });

    if (data.name && data.name !== existing.name) {
      let slug = slugify(data.name);
      const slugExists = await db.query.categories.findFirst({ where: and(eq(categories.slug, slug), ne(categories.id, id)) });
      if (slugExists) slug = `${slug}-${Date.now().toString(36)}`;
      data.slug = slug;
    }

    const [category] = await db.update(categories).set(data).where(eq(categories.id, id)).returning();
    return NextResponse.json(category);
  } catch (error) {
    console.error("Category PUT error:", error);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Category ID required" }, { status: 400 });

    await db.delete(productCategories).where(eq(productCategories.categoryId, id));
    await db.update(categories).set({ parentId: null }).where(eq(categories.parentId, id));
    await db.delete(categories).where(eq(categories.id, id));

    return NextResponse.json({ message: "Category deleted" });
  } catch (error) {
    console.error("Category DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
