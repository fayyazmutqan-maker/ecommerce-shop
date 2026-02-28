import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { navigations } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const navItemSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    title: z.string().min(1).max(100),
    url: z.string().max(500),
    children: z.array(navItemSchema).optional(),
  })
);

const navigationSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  items: z.array(navItemSchema).min(1),
});

// GET — list all navigations (public: by slug, admin: all)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");

    if (slug) {
      const nav = await db.query.navigations.findFirst({
        where: eq(navigations.slug, slug),
      });
      if (!nav) {
        return NextResponse.json({ error: "Navigation not found" }, { status: 404 });
      }
      return NextResponse.json({
        ...nav,
        items: JSON.parse(nav.items),
      });
    }

    // Admin: list all
    const session = await auth();
    if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allNavs = await db.query.navigations.findMany({
      orderBy: desc(navigations.createdAt),
    });

    return NextResponse.json(
      allNavs.map((n) => ({ ...n, items: JSON.parse(n.items) }))
    );
  } catch (error) {
    console.error("Navigations GET error:", error);
    return NextResponse.json({ error: "Failed to fetch navigations" }, { status: 500 });
  }
}

// POST — create a new navigation menu
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = navigationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const existing = await db.query.navigations.findFirst({
      where: eq(navigations.slug, parsed.data.slug),
    });
    if (existing) {
      return NextResponse.json({ error: "Navigation with this slug already exists" }, { status: 409 });
    }

    const [nav] = await db
      .insert(navigations)
      .values({
        title: parsed.data.title,
        slug: parsed.data.slug,
        items: JSON.stringify(parsed.data.items),
      })
      .returning();

    return NextResponse.json({ ...nav, items: JSON.parse(nav.items) }, { status: 201 });
  } catch (error) {
    console.error("Navigations POST error:", error);
    return NextResponse.json({ error: "Failed to create navigation" }, { status: 500 });
  }
}

// PUT — update a navigation menu
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...rest } = body;
    if (!id) {
      return NextResponse.json({ error: "Navigation ID required" }, { status: 400 });
    }

    const parsed = navigationSchema.safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const existing = await db.query.navigations.findFirst({
      where: eq(navigations.id, id),
    });
    if (!existing) {
      return NextResponse.json({ error: "Navigation not found" }, { status: 404 });
    }

    const [nav] = await db
      .update(navigations)
      .set({
        title: parsed.data.title,
        slug: parsed.data.slug,
        items: JSON.stringify(parsed.data.items),
      })
      .where(eq(navigations.id, id))
      .returning();

    return NextResponse.json({ ...nav, items: JSON.parse(nav.items) });
  } catch (error) {
    console.error("Navigations PUT error:", error);
    return NextResponse.json({ error: "Failed to update navigation" }, { status: 500 });
  }
}

// DELETE — delete a navigation menu
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Navigation ID required" }, { status: 400 });
    }

    await db.delete(navigations).where(eq(navigations.id, id));
    return NextResponse.json({ message: "Navigation deleted" });
  } catch (error) {
    console.error("Navigations DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete navigation" }, { status: 500 });
  }
}
