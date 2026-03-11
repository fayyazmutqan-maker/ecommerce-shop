import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blogCategories } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { slugify } from "@/lib/helpers";
import { eq, and, ne, asc } from "drizzle-orm";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
});

export async function GET() {
  try {
    const categories = await db.query.blogCategories.findMany({
      orderBy: asc(blogCategories.name),
    });
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Blog categories GET error:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const data = parsed.data;
    let slug = slugify(data.name);
    const existing = await db.query.blogCategories.findFirst({ where: eq(blogCategories.slug, slug) });
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;

    const [category] = await db.insert(blogCategories).values({
      name: data.name,
      slug,
      description: data.description || null,
      parentId: data.parentId || null,
    }).returning();

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Blog categories POST error:", error);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
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
    if (!id) return NextResponse.json({ error: "Category ID required" }, { status: 400 });

    if (data.name) {
      let slug = slugify(data.name);
      const slugExists = await db.query.blogCategories.findFirst({
        where: and(eq(blogCategories.slug, slug), ne(blogCategories.id, id)),
      });
      if (slugExists) slug = `${slug}-${Date.now().toString(36)}`;
      data.slug = slug;
    }

    const [category] = await db.update(blogCategories).set(data).where(eq(blogCategories.id, id)).returning();
    return NextResponse.json(category);
  } catch (error) {
    console.error("Blog categories PUT error:", error);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
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
    if (!id) return NextResponse.json({ error: "Category ID required" }, { status: 400 });

    await db.delete(blogCategories).where(eq(blogCategories.id, id));
    return NextResponse.json({ message: "Category deleted" });
  } catch (error) {
    console.error("Blog categories DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
