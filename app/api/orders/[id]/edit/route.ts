import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { orders, orderItems, orderTimeline, products, productVariants, storeSettings } from "@/lib/schema";
import { serializeDecimal, toNumber } from "@/lib/decimal";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const editItemSchema = z.object({
  productId: z.string(),
  variantId: z.string().optional().nullable(),
  name: z.string(),
  sku: z.string().optional().nullable(),
  price: z.number().min(0),
  quantity: z.number().int().min(1),
  variantName: z.string().optional().nullable(),
});

const editOrderSchema = z.object({
  items: z.array(editItemSchema).min(1),
  shippingAmount: z.number().min(0).optional(),
  discountAmount: z.number().min(0).optional(),
  notes: z.string().optional().nullable(),
});

/**
 * PUT /api/orders/[id]/edit — Edit order line items (Admin only)
 * Adjusts inventory for removed/changed items and recalculates totals
 */
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = editOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const data = parsed.data;

    const existing = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: { items: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Only allow editing for certain statuses
    if (["DELIVERED", "CANCELLED", "REFUNDED"].includes(existing.status)) {
      return NextResponse.json(
        { error: `Cannot edit an order with status ${existing.status}` },
        { status: 400 }
      );
    }

    const order = await db.transaction(async (tx) => {
      // Load store tax rate from settings
      const settings = await tx.query.storeSettings.findFirst({ columns: { taxRate: true } });
      const storeTaxRate = settings?.taxRate ?? 0.15;

      // 1. Restore inventory from old items
      for (const oldItem of existing.items) {
        if (oldItem.variantId) {
          await tx.update(productVariants).set({
            quantity: sql`${productVariants.quantity} + ${oldItem.quantity}`,
          }).where(eq(productVariants.id, oldItem.variantId));
        } else {
          await tx.update(products).set({
            quantity: sql`${products.quantity} + ${oldItem.quantity}`,
          }).where(eq(products.id, oldItem.productId));
        }
      }

      // 2. Remove all old items
      await tx.delete(orderItems).where(eq(orderItems.orderId, id));

      // 3. Verify stock and deduct for new items
      const newItems: {
        orderId: string;
        productId: string;
        variantId: string | null;
        name: string;
        sku: string | null;
        price: string;
        quantity: number;
        totalPrice: string;
        taxAmount: string;
        variantName: string | null;
      }[] = [];

      for (const item of data.items) {
        const product = await tx.query.products.findFirst({
          where: eq(products.id, item.productId),
          with: { variants: true },
        });

        if (!product) throw new Error(`Product "${item.name}" not found`);

        const availableQty = item.variantId
          ? product.variants.find((v) => v.id === item.variantId)?.quantity ?? 0
          : product.quantity;

        if (product.trackInventory && !product.continueSellingWhenOOS && item.quantity > availableQty) {
          throw new Error(`"${item.name}" has insufficient stock (${availableQty} available)`);
        }

        const totalPrice = item.price * item.quantity;
        const taxAmount = product.taxable ? totalPrice * storeTaxRate : 0;

        newItems.push({
          orderId: id,
          productId: item.productId,
          variantId: item.variantId || null,
          name: item.name,
          sku: item.sku || null,
          price: String(item.price),
          quantity: item.quantity,
          totalPrice: String(totalPrice),
          taxAmount: String(taxAmount),
          variantName: item.variantName || null,
        });

        // Deduct inventory — use GREATEST to prevent negative stock values
        if (item.variantId) {
          await tx.update(productVariants).set({
            quantity: sql`GREATEST(0, ${productVariants.quantity} - ${item.quantity})`,
          }).where(eq(productVariants.id, item.variantId));
        } else {
          await tx.update(products).set({
            quantity: sql`GREATEST(0, ${products.quantity} - ${item.quantity})`,
          }).where(eq(products.id, item.productId));
        }
      }

      // 4. Create new order items
      await tx.insert(orderItems).values(newItems);

      // 5. Recalculate totals
      const subtotal = newItems.reduce((sum, i) => sum + parseFloat(i.totalPrice), 0);
      const taxAmount = newItems.reduce((sum, i) => sum + parseFloat(i.taxAmount), 0);
      const shippingAmount = data.shippingAmount ?? toNumber(existing.shippingAmount);
      const discountAmount = data.discountAmount ?? toNumber(existing.discountAmount);
      const totalAmount = subtotal + taxAmount + shippingAmount - discountAmount;

      const [updated] = await tx.update(orders).set({
        subtotal: String(subtotal),
        taxAmount: String(taxAmount),
        shippingAmount: String(shippingAmount),
        discountAmount: String(discountAmount),
        totalAmount: String(Math.max(0, totalAmount)),
        notes: data.notes !== undefined ? data.notes : existing.notes,
      }).where(eq(orders.id, id)).returning();

      // 6. Timeline entry
      await tx.insert(orderTimeline).values({
        orderId: id,
        title: "Order Edited",
        message: `Order line items edited by ${session.user.name || session.user.email}. New total: SAR ${totalAmount.toFixed(2)}`,
        type: "INFO",
      });

      return updated;
    });

    return NextResponse.json(serializeDecimal(order));
  } catch (error) {
    console.error("Edit order error:", error);
    const message = error instanceof Error ? error.message : "Failed to edit order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
