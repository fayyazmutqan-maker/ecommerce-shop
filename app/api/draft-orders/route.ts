import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { serializeDecimal } from "@/lib/decimal";
import { eq, desc, and, or, ilike } from "drizzle-orm";
import { draftOrders } from "@/lib/schema";

const draftItemSchema = z.object({
  productId: z.string(),
  variantId: z.string().optional().nullable(),
  name: z.string(),
  sku: z.string().optional().nullable(),
  price: z.number().min(0),
  quantity: z.number().int().min(1),
  variantName: z.string().optional().nullable(),
});

const addressSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  company: z.string().optional(),
  address1: z.string(),
  address2: z.string().optional(),
  city: z.string(),
  state: z.string().optional(),
  postalCode: z.string(),
  country: z.string(),
  phone: z.string().optional(),
});

const draftOrderSchema = z.object({
  customerId: z.string().optional().nullable(),
  customerEmail: z.string().email().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  items: z.array(draftItemSchema).min(1),
  notes: z.string().optional().nullable(),
  shippingAddress: addressSchema.optional().nullable(),
  billingAddress: addressSchema.optional().nullable(),
  shippingAmount: z.number().min(0).default(0),
  discountAmount: z.number().min(0).default(0),
  taxRate: z.number().min(0).default(15),
});

function generateDraftNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `D-${timestamp}-${random}`;
}

/**
 * GET /api/draft-orders — List all draft orders
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const q = searchParams.get("q") || undefined;

    const conditions = [];
    if (status) conditions.push(eq(draftOrders.status, status));
    if (q) {
      conditions.push(
        or(
          ilike(draftOrders.draftNumber, `%${q}%`),
          ilike(draftOrders.customerEmail, `%${q}%`),
          ilike(draftOrders.customerName, `%${q}%`),
        )!
      );
    }

    const drafts = await db.query.draftOrders.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      orderBy: desc(draftOrders.createdAt),
    });

    return NextResponse.json(serializeDecimal(drafts.map((d) => {
      let items = [];
      let shippingAddress = null;
      let billingAddress = null;
      try { items = JSON.parse(d.items); } catch { /* corrupted data */ }
      try { shippingAddress = d.shippingAddress ? JSON.parse(d.shippingAddress) : null; } catch { /* corrupted */ }
      try { billingAddress = d.billingAddress ? JSON.parse(d.billingAddress) : null; } catch { /* corrupted */ }
      return { ...d, items, shippingAddress, billingAddress };
    })));
  } catch (error) {
    console.error("Draft orders GET error:", error);
    return NextResponse.json({ error: "Failed to fetch draft orders" }, { status: 500 });
  }
}

/**
 * POST /api/draft-orders — Create a draft order
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = draftOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const data = parsed.data;

    // Calculate totals
    const subtotal = data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const taxAmount = subtotal * (data.taxRate / 100);
    const totalAmount = subtotal + taxAmount + data.shippingAmount - data.discountAmount;

    const [draft] = await db.insert(draftOrders).values({
      draftNumber: generateDraftNumber(),
      customerId: data.customerId || null,
      customerEmail: data.customerEmail || null,
      customerPhone: data.customerPhone || null,
      customerName: data.customerName || null,
      items: JSON.stringify(data.items),
      subtotal: String(subtotal),
      taxAmount: String(taxAmount),
      shippingAmount: String(data.shippingAmount),
      discountAmount: String(data.discountAmount),
      totalAmount: String(Math.max(0, totalAmount)),
      notes: data.notes || null,
      shippingAddress: data.shippingAddress ? JSON.stringify(data.shippingAddress) : null,
      billingAddress: data.billingAddress ? JSON.stringify(data.billingAddress) : null,
      createdBy: session.user.name || session.user.email || "Admin",
    }).returning();

    return NextResponse.json(serializeDecimal({
      ...draft,
      items: JSON.parse(draft.items),
    }), { status: 201 });
  } catch (error) {
    console.error("Draft order POST error:", error);
    return NextResponse.json({ error: "Failed to create draft order" }, { status: 500 });
  }
}

/**
 * PUT /api/draft-orders — Update a draft order
 */
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "Draft order ID required" }, { status: 400 });

    const existing = await db.query.draftOrders.findFirst({
      where: eq(draftOrders.id, id),
    });
    if (!existing) return NextResponse.json({ error: "Draft order not found" }, { status: 404 });
    if (existing.status === "COMPLETED") {
      return NextResponse.json({ error: "Cannot edit a completed draft order" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (updates.customerId !== undefined) data.customerId = updates.customerId || null;
    if (updates.customerEmail !== undefined) data.customerEmail = updates.customerEmail || null;
    if (updates.customerPhone !== undefined) data.customerPhone = updates.customerPhone || null;
    if (updates.customerName !== undefined) data.customerName = updates.customerName || null;
    if (updates.notes !== undefined) data.notes = updates.notes || null;
    if (updates.status !== undefined) data.status = updates.status;

    if (updates.items) {
      data.items = JSON.stringify(updates.items);
      const subtotal = updates.items.reduce((sum: number, item: { price: number; quantity: number }) => sum + item.price * item.quantity, 0);
      const taxRate = updates.taxRate || 15;
      const taxAmount = subtotal * (taxRate / 100);
      const shippingAmount = updates.shippingAmount ?? Number(existing.shippingAmount);
      const discountAmount = updates.discountAmount ?? Number(existing.discountAmount);
      data.subtotal = String(subtotal);
      data.taxAmount = String(taxAmount);
      data.shippingAmount = String(shippingAmount);
      data.discountAmount = String(discountAmount);
      data.totalAmount = String(Math.max(0, subtotal + taxAmount + shippingAmount - discountAmount));
    }

    if (updates.shippingAddress !== undefined) {
      data.shippingAddress = updates.shippingAddress ? JSON.stringify(updates.shippingAddress) : null;
    }
    if (updates.billingAddress !== undefined) {
      data.billingAddress = updates.billingAddress ? JSON.stringify(updates.billingAddress) : null;
    }

    const [draft] = await db.update(draftOrders)
      .set(data)
      .where(eq(draftOrders.id, id))
      .returning();

    return NextResponse.json(serializeDecimal({
      ...draft,
      items: JSON.parse(draft.items),
      shippingAddress: draft.shippingAddress ? JSON.parse(draft.shippingAddress) : null,
      billingAddress: draft.billingAddress ? JSON.parse(draft.billingAddress) : null,
    }));
  } catch (error) {
    console.error("Draft order PUT error:", error);
    return NextResponse.json({ error: "Failed to update draft order" }, { status: 500 });
  }
}

/**
 * DELETE /api/draft-orders — Delete a draft order
 */
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Draft order ID required" }, { status: 400 });

    await db.delete(draftOrders).where(eq(draftOrders.id, id));
    return NextResponse.json({ message: "Draft order deleted" });
  } catch (error) {
    console.error("Draft order DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete draft order" }, { status: 500 });
  }
}
