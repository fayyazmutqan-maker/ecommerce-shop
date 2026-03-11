import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { templates, templateSections } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { eq, desc, asc } from "drizzle-orm";
import { z } from "zod";

const sectionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(200),
  type: z.string().min(1).max(100),
  config: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isVisible: z.boolean().default(true),
});

const templateSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().max(1000).nullable().optional(),
  thumbnail: z.string().max(500).nullable().optional(),
  isActive: z.boolean().default(false),
  isDefault: z.boolean().default(false),
  config: z.string().nullable().optional(),
  sections: z.array(sectionSchema).optional(),
});

// GET — list all templates or get one by slug
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const template = await db.query.templates.findFirst({
        where: eq(templates.id, id),
        with: { sections: { orderBy: [asc(templateSections.sortOrder)] } },
      });
      if (!template) {
        return NextResponse.json({ error: "Template not found" }, { status: 404 });
      }
      return NextResponse.json(template);
    }

    const allTemplates = await db.query.templates.findMany({
      orderBy: desc(templates.createdAt),
      with: { sections: { orderBy: [asc(templateSections.sortOrder)] } },
    });

    return NextResponse.json(allTemplates);
  } catch (error) {
    console.error("Templates GET error:", error);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

// POST — create a new template
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = templateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const data = parsed.data;

    const existing = await db.query.templates.findFirst({
      where: eq(templates.slug, data.slug),
    });
    if (existing) {
      return NextResponse.json({ error: "Template with this slug already exists" }, { status: 409 });
    }

    const result = await db.transaction(async (tx) => {
      // If setting as default, unset other defaults
      if (data.isDefault) {
        await tx.update(templates).set({ isDefault: false }).where(eq(templates.isDefault, true));
      }

      const [template] = await tx.insert(templates).values({
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        thumbnail: data.thumbnail || null,
        isActive: data.isActive,
        isDefault: data.isDefault,
        config: data.config || null,
      }).returning();

      if (data.sections && data.sections.length > 0) {
        await tx.insert(templateSections).values(
          data.sections.map((s, i) => ({
            templateId: template.id,
            name: s.name,
            type: s.type,
            config: s.config || null,
            content: s.content || null,
            sortOrder: s.sortOrder ?? i,
            isVisible: s.isVisible ?? true,
          }))
        );
      }

      return tx.query.templates.findFirst({
        where: eq(templates.id, template.id),
        with: { sections: { orderBy: [asc(templateSections.sortOrder)] } },
      });
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Templates POST error:", error);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}

// PUT — update a template
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...rest } = body;
    if (!id) {
      return NextResponse.json({ error: "Template ID required" }, { status: 400 });
    }

    const parsed = templateSchema.safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const data = parsed.data;

    const result = await db.transaction(async (tx) => {
      if (data.isDefault) {
        await tx.update(templates).set({ isDefault: false }).where(eq(templates.isDefault, true));
      }

      if (data.isActive) {
        await tx.update(templates).set({ isActive: false }).where(eq(templates.isActive, true));
      }

      await tx.update(templates).set({
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        thumbnail: data.thumbnail || null,
        isActive: data.isActive,
        isDefault: data.isDefault,
        config: data.config || null,
      }).where(eq(templates.id, id));

      // Replace sections
      if (data.sections) {
        await tx.delete(templateSections).where(eq(templateSections.templateId, id));
        if (data.sections.length > 0) {
          await tx.insert(templateSections).values(
            data.sections.map((s, i) => ({
              templateId: id,
              name: s.name,
              type: s.type,
              config: s.config || null,
              content: s.content || null,
              sortOrder: s.sortOrder ?? i,
              isVisible: s.isVisible ?? true,
            }))
          );
        }
      }

      return tx.query.templates.findFirst({
        where: eq(templates.id, id),
        with: { sections: { orderBy: [asc(templateSections.sortOrder)] } },
      });
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Templates PUT error:", error);
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}

// DELETE — delete a template
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Template ID required" }, { status: 400 });
    }

    const existing = await db.query.templates.findFirst({ where: eq(templates.id, id) });
    if (existing?.isDefault) {
      return NextResponse.json({ error: "Cannot delete the default template" }, { status: 400 });
    }

    await db.delete(templates).where(eq(templates.id, id));
    return NextResponse.json({ message: "Template deleted" });
  } catch (error) {
    console.error("Templates DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
