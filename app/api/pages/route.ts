import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pages } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { slugify } from "@/lib/helpers";
import { eq, and, ne, desc } from "drizzle-orm";
import { z } from "zod";

const pageSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().nullable().optional(),
  isPublished: z.boolean().default(false),
  seoTitle: z.string().max(200).nullable().optional(),
  seoDescription: z.string().max(500).nullable().optional(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const admin = searchParams.get("admin") === "true";
    const slug = searchParams.get("slug");

    if (admin) {
      const session = await auth();
      if (!session?.user || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Fetch single page by slug
    if (slug) {
      const page = await db.query.pages.findFirst({ where: eq(pages.slug, slug) });
      if (!page || (!admin && !page.isPublished)) {
        return NextResponse.json({ error: "Page not found" }, { status: 404 });
      }
      return NextResponse.json(page);
    }

    // Fetch all pages
    const result = admin
      ? await db.query.pages.findMany({ orderBy: desc(pages.createdAt) })
      : await db.query.pages.findMany({ where: eq(pages.isPublished, true), orderBy: desc(pages.createdAt) });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Pages GET error:", error);
    return NextResponse.json({ error: "Failed to fetch pages" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = pageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const data = parsed.data;
    let slug = slugify(data.title);
    const existing = await db.query.pages.findFirst({ where: eq(pages.slug, slug) });
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;

    const [page] = await db.insert(pages).values({
      title: data.title,
      slug,
      content: data.content || null,
      isPublished: data.isPublished,
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
    }).returning();

    return NextResponse.json(page, { status: 201 });
  } catch (error) {
    console.error("Page POST error:", error);
    return NextResponse.json({ error: "Failed to create page" }, { status: 500 });
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
    if (!id) return NextResponse.json({ error: "Page ID required" }, { status: 400 });

    const existing = await db.query.pages.findFirst({ where: eq(pages.id, id) });
    if (!existing) return NextResponse.json({ error: "Page not found" }, { status: 404 });

    if (data.title && data.title !== existing.title) {
      let slug = slugify(data.title);
      const slugExists = await db.query.pages.findFirst({
        where: and(eq(pages.slug, slug), ne(pages.id, id)),
      });
      if (slugExists) slug = `${slug}-${Date.now().toString(36)}`;
      data.slug = slug;
    }

    const [page] = await db.update(pages).set(data).where(eq(pages.id, id)).returning();
    return NextResponse.json(page);
  } catch (error) {
    console.error("Page PUT error:", error);
    return NextResponse.json({ error: "Failed to update page" }, { status: 500 });
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
    if (!id) return NextResponse.json({ error: "Page ID required" }, { status: 400 });

    await db.delete(pages).where(eq(pages.id, id));
    return NextResponse.json({ message: "Page deleted" });
  } catch (error) {
    console.error("Page DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete page" }, { status: 500 });
  }
}
