import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blogPosts, blogCategories, blogPostCategories, users } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { slugify } from "@/lib/helpers";
import { eq, and, ne, desc, sql } from "drizzle-orm";
import { z } from "zod";

const postSchema = z.object({
  title: z.string().min(1).max(300),
  content: z.string().nullable().optional(),
  excerpt: z.string().max(500).nullable().optional(),
  featuredImage: z.string().nullable().optional(),
  tags: z.string().nullable().optional(),
  categoryIds: z.array(z.string()).optional(),
  isPublished: z.boolean().default(false),
  seoTitle: z.string().max(200).nullable().optional(),
  seoDescription: z.string().max(500).nullable().optional(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const admin = searchParams.get("admin") === "true";
    const slug = searchParams.get("slug");
    const tag = searchParams.get("tag");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const offset = (page - 1) * limit;

    if (admin) {
      const session = await auth();
      if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Fetch single post by slug
    if (slug) {
      const post = await db.query.blogPosts.findFirst({
        where: eq(blogPosts.slug, slug),
        with: {
          author: { columns: { id: true, name: true, image: true } },
          postCategories: { with: { category: true } },
        },
      });
      if (!post || (!admin && !post.isPublished)) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }
      return NextResponse.json({
        ...post,
        categories: post.postCategories.map((pc) => pc.category),
      });
    }

    // Fetch all posts
    const conditions = [];
    if (!admin) conditions.push(eq(blogPosts.isPublished, true));

    const allPosts = await db.query.blogPosts.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: desc(blogPosts.publishedAt),
      with: {
        author: { columns: { id: true, name: true, image: true } },
        postCategories: { with: { category: true } },
      },
      limit,
      offset,
    });

    // Filter by tag (in-memory since tags is comma-separated)
    let filtered = allPosts;
    if (tag) {
      filtered = allPosts.filter((p) =>
        p.tags?.split(",").map((t) => t.trim().toLowerCase()).includes(tag.toLowerCase())
      );
    }

    // Get total count
    const totalResult = await db.select({ count: sql<number>`count(*)` })
      .from(blogPosts)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    const total = Number(totalResult[0].count);

    return NextResponse.json({
      posts: filtered.map((p) => ({
        ...p,
        categories: p.postCategories.map((pc) => pc.category),
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Blog GET error:", error);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { categoryIds, ...data } = parsed.data;
    let slug = slugify(data.title);
    const existing = await db.query.blogPosts.findFirst({ where: eq(blogPosts.slug, slug) });
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;

    const [post] = await db.insert(blogPosts).values({
      title: data.title,
      slug,
      content: data.content || null,
      excerpt: data.excerpt || null,
      featuredImage: data.featuredImage || null,
      authorId: session.user.id,
      tags: data.tags || null,
      isPublished: data.isPublished,
      publishedAt: data.isPublished ? new Date() : null,
      seoTitle: data.seoTitle || null,
      seoDescription: data.seoDescription || null,
    }).returning();

    if (categoryIds?.length) {
      await db.insert(blogPostCategories).values(
        categoryIds.map((categoryId) => ({ postId: post.id, categoryId }))
      );
    }

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("Blog POST error:", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, categoryIds, ...data } = body;
    if (!id) return NextResponse.json({ error: "Post ID required" }, { status: 400 });

    const existing = await db.query.blogPosts.findFirst({ where: eq(blogPosts.id, id) });
    if (!existing) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    if (data.title && data.title !== existing.title) {
      let slug = slugify(data.title);
      const slugExists = await db.query.blogPosts.findFirst({
        where: and(eq(blogPosts.slug, slug), ne(blogPosts.id, id)),
      });
      if (slugExists) slug = `${slug}-${Date.now().toString(36)}`;
      data.slug = slug;
    }

    // Set publishedAt on first publish
    if (data.isPublished && !existing.publishedAt) {
      data.publishedAt = new Date();
    }

    const [post] = await db.update(blogPosts).set(data).where(eq(blogPosts.id, id)).returning();

    // Update categories if provided
    if (categoryIds !== undefined) {
      await db.delete(blogPostCategories).where(eq(blogPostCategories.postId, id));
      if (categoryIds?.length) {
        await db.insert(blogPostCategories).values(
          categoryIds.map((categoryId: string) => ({ postId: id, categoryId }))
        );
      }
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error("Blog PUT error:", error);
    return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
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
    if (!id) return NextResponse.json({ error: "Post ID required" }, { status: 400 });

    await db.delete(blogPosts).where(eq(blogPosts.id, id));
    return NextResponse.json({ message: "Post deleted" });
  } catch (error) {
    console.error("Blog DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
