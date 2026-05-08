import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { newsletterTemplates } from "@/lib/schema";

const templateSchema = z.object({
  name: z.string().trim().min(1, "Template name is required").max(100),
  subject: z.string().max(200).default(""),
  previewText: z.string().max(200).optional().nullable(),
  content: z.string().min(1, "Content is required").max(50000),
});

const updateTemplateSchema = templateSchema.extend({
  id: z.string().min(1, "Template ID is required"),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return null;
  }
  return session;
}

export async function GET() {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const templates = await db.query.newsletterTemplates.findMany({
      orderBy: desc(newsletterTemplates.updatedAt),
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Newsletter template list error:", error);
    return NextResponse.json({ error: "Failed to fetch newsletter templates" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = templateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [template] = await db.insert(newsletterTemplates).values({
      ...parsed.data,
      previewText: parsed.data.previewText || null,
    }).returning();

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error("Newsletter template create error:", error);
    return NextResponse.json({ error: "Failed to create newsletter template" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = updateTemplateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { id, ...data } = parsed.data;
    const [template] = await db.update(newsletterTemplates).set({
      ...data,
      previewText: data.previewText || null,
      updatedAt: new Date(),
    }).where(eq(newsletterTemplates.id, id)).returning();

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Newsletter template update error:", error);
    return NextResponse.json({ error: "Failed to update newsletter template" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Template ID is required" }, { status: 400 });
    }

    const [template] = await db.delete(newsletterTemplates)
      .where(eq(newsletterTemplates.id, id))
      .returning({ id: newsletterTemplates.id });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Newsletter template delete error:", error);
    return NextResponse.json({ error: "Failed to delete newsletter template" }, { status: 500 });
  }
}
