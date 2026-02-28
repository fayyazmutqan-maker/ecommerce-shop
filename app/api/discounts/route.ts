import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { serializeDecimal } from "@/lib/decimal";
import { coupons } from "@/lib/schema";
import { eq, ne, and, desc } from "drizzle-orm";

const couponSchema = z.object({
  code: z.string().min(2).max(50).transform((v) => v.toUpperCase().trim()),
  description: z.string().max(500).nullable().optional(),
  type: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "FREE_SHIPPING"]),
  value: z.number().min(0),
  minOrderAmount: z.number().min(0).nullable().optional(),
  maxDiscountAmount: z.number().min(0).nullable().optional(),
  usageLimit: z.number().int().min(1).nullable().optional(),
  isActive: z.boolean().default(true),
  startsAt: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
});

// Separate schema for updates — same fields but all optional, plus id required
const couponUpdateSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(2).max(50).transform((v) => v.toUpperCase().trim()).optional(),
  description: z.string().max(500).nullable().optional(),
  type: z.enum(["PERCENTAGE", "FIXED_AMOUNT", "FREE_SHIPPING"]).optional(),
  value: z.number().min(0).optional(),
  minOrderAmount: z.number().min(0).nullable().optional(),
  maxDiscountAmount: z.number().min(0).nullable().optional(),
  usageLimit: z.number().int().min(1).nullable().optional(),
  isActive: z.boolean().optional(),
  startsAt: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results = await db.query.coupons.findMany({
      orderBy: desc(coupons.createdAt),
    });
    return NextResponse.json(serializeDecimal(results));
  } catch (error) {
    console.error("Discounts GET error:", error);
    return NextResponse.json({ error: "Failed to fetch discounts" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = couponSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const data = parsed.data;

    // Validate percentage <= 100
    if (data.type === "PERCENTAGE" && data.value > 100) {
      return NextResponse.json({ error: "Percentage discount cannot exceed 100%" }, { status: 400 });
    }

    // Check unique code
    const existing = await db.query.coupons.findFirst({ where: eq(coupons.code, data.code) });
    if (existing) {
      return NextResponse.json({ error: "Coupon code already exists" }, { status: 409 });
    }

    const [coupon] = await db.insert(coupons).values({
      code: data.code,
      description: data.description || null,
      type: data.type,
      value: String(data.value),
      minOrderAmount: data.minOrderAmount != null ? String(data.minOrderAmount) : null,
      maxDiscountAmount: data.maxDiscountAmount != null ? String(data.maxDiscountAmount) : null,
      usageLimit: data.usageLimit || null,
      isActive: data.isActive,
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    }).returning();

    return NextResponse.json(serializeDecimal(coupon), { status: 201 });
  } catch (error) {
    console.error("Discount POST error:", error);
    return NextResponse.json({ error: "Failed to create discount" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = couponUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { id, ...updates } = parsed.data;

    const existing = await db.query.coupons.findFirst({ where: eq(coupons.id, id) });
    if (!existing) return NextResponse.json({ error: "Coupon not found" }, { status: 404 });

    // Validate percentage <= 100
    const effectiveType = updates.type || existing.type;
    const effectiveValue = updates.value ?? Number(existing.value);
    if (effectiveType === "PERCENTAGE" && effectiveValue > 100) {
      return NextResponse.json({ error: "Percentage discount cannot exceed 100%" }, { status: 400 });
    }

    // Handle code uniqueness if code is being changed
    if (updates.code && updates.code !== existing.code) {
      const codeConflict = await db.query.coupons.findFirst({ where: and(eq(coupons.code, updates.code), ne(coupons.id, id)) });
      if (codeConflict) {
        return NextResponse.json({ error: "Coupon code already exists" }, { status: 409 });
      }
    }

    // Build safe update object with only validated fields
    const safeUpdates: Record<string, unknown> = {};
    if (updates.code !== undefined) safeUpdates.code = updates.code;
    if (updates.description !== undefined) safeUpdates.description = updates.description;
    if (updates.type !== undefined) safeUpdates.type = updates.type;
    if (updates.value !== undefined) safeUpdates.value = String(updates.value);
    if (updates.minOrderAmount !== undefined) safeUpdates.minOrderAmount = updates.minOrderAmount != null ? String(updates.minOrderAmount) : null;
    if (updates.maxDiscountAmount !== undefined) safeUpdates.maxDiscountAmount = updates.maxDiscountAmount != null ? String(updates.maxDiscountAmount) : null;
    if (updates.usageLimit !== undefined) safeUpdates.usageLimit = updates.usageLimit;
    if (updates.isActive !== undefined) safeUpdates.isActive = updates.isActive;
    if (updates.startsAt !== undefined) safeUpdates.startsAt = updates.startsAt ? new Date(updates.startsAt) : null;
    if (updates.expiresAt !== undefined) safeUpdates.expiresAt = updates.expiresAt ? new Date(updates.expiresAt) : null;

    const [coupon] = await db.update(coupons).set(safeUpdates).where(eq(coupons.id, id)).returning();
    return NextResponse.json(serializeDecimal(coupon));
  } catch (error) {
    console.error("Discount PUT error:", error);
    return NextResponse.json({ error: "Failed to update discount" }, { status: 500 });
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
    if (!id) return NextResponse.json({ error: "Coupon ID required" }, { status: 400 });

    await db.delete(coupons).where(eq(coupons.id, id));
    return NextResponse.json({ message: "Coupon deleted" });
  } catch (error) {
    console.error("Discount DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete discount" }, { status: 500 });
  }
}
