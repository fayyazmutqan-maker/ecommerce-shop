import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sendOrderConfirmation } from "@/lib/email";
import { eq, sql } from "drizzle-orm";
import {
  draftOrders,
  orders,
  orderItems,
  orderAddresses,
  orderTimeline,
  products,
  productVariants,
  storeSettings,
  transactions,
} from "@/lib/schema";
import { createTapCharge, parseSaudiPhone } from "@/lib/tap";

/**
 * POST /api/draft-orders/convert — Convert a draft order into a real order
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { draftId, paymentMethod } = body;
    if (!draftId) return NextResponse.json({ error: "Draft order ID required" }, { status: 400 });

    // Validate payment method — only allow known methods
    const validPaymentMethods = ["cod", "manual", "bank_transfer", "tap"];
    const normalizedPM = (paymentMethod || "manual").toLowerCase();
    if (!validPaymentMethods.includes(normalizedPM)) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
    }

    const draft = await db.query.draftOrders.findFirst({
      where: eq(draftOrders.id, draftId),
    });
    if (!draft) return NextResponse.json({ error: "Draft order not found" }, { status: 404 });
    if (draft.status === "COMPLETED") {
      return NextResponse.json({ error: "Draft already converted to an order" }, { status: 400 });
    }

    const items = JSON.parse(draft.items) as Array<{
      productId: string;
      variantId?: string | null;
      name: string;
      sku?: string | null;
      price: number;
      quantity: number;
      variantName?: string | null;
    }>;

    const shippingAddress = draft.shippingAddress ? JSON.parse(draft.shippingAddress) : null;

    // Generate order number
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const orderNumber = `SF-${timestamp}-${random}`;

    const order = await db.transaction(async (tx) => {
      // Verify stock for all items
      for (const item of items) {
        const product = await tx.query.products.findFirst({
          where: eq(products.id, item.productId),
          with: { variants: true },
        });

        if (!product) throw new Error(`Product "${item.name}" not found`);

        if (product.trackInventory && !product.continueSellingWhenOOS) {
          const matchingVariant = item.variantId
            ? product.variants.find((v) => v.id === item.variantId)
            : null;
          const availableQty = matchingVariant ? matchingVariant.quantity : product.quantity;
          if (item.quantity > availableQty) {
            throw new Error(`"${item.name}" has insufficient stock (${availableQty} available)`);
          }
        }
      }

      // Load tax rate from store settings
      const settings = await tx.query.storeSettings.findFirst({ columns: { taxRate: true } });
      const storeTaxRate = settings?.taxRate ?? 0.15;

      // Create shipping address — use a temp orderId that we'll update after order creation
      let shippingAddressId: string | null = null;
      if (shippingAddress) {
        const [addr] = await tx.insert(orderAddresses).values({
          orderId: "pending-draft-conversion",
          type: "SHIPPING",
          firstName: shippingAddress.firstName || "",
          lastName: shippingAddress.lastName || "",
          company: shippingAddress.company || null,
          address1: shippingAddress.address1 || "",
          address2: shippingAddress.address2 || null,
          city: shippingAddress.city || "",
          state: shippingAddress.state || null,
          postalCode: shippingAddress.postalCode || "",
          country: shippingAddress.country || "Saudi Arabia",
          phone: shippingAddress.phone || null,
        }).returning();
        shippingAddressId = addr.id;
      }

      // Create the order
      const [newOrder] = await tx.insert(orders).values({
        orderNumber,
        userId: draft.customerId || null,
        email: draft.customerEmail || "",
        phone: draft.customerPhone || null,
        status: "CONFIRMED",
        // Never mark as PAID without actual payment processing — all draft conversions start as PENDING
        paymentStatus: "PENDING",
        paymentMethod: normalizedPM === "cod" ? "COD" : normalizedPM.toUpperCase(),
        fulfillmentStatus: "UNFULFILLED",
        subtotal: draft.subtotal,
        taxAmount: draft.taxAmount,
        shippingAmount: draft.shippingAmount,
        discountAmount: draft.discountAmount,
        totalAmount: draft.totalAmount,
        currency: "SAR",
        notes: draft.notes || null,
        source: "MANUAL",
        shippingAddressId,
      }).returning();

      // Create order items
      if (items.length) {
        await tx.insert(orderItems).values(
          items.map((item) => ({
            orderId: newOrder.id,
            productId: item.productId,
            variantId: item.variantId || null,
            name: item.name,
            sku: item.sku || null,
            price: String(item.price),
            quantity: item.quantity,
            totalPrice: String(item.price * item.quantity),
            taxAmount: String(item.price * item.quantity * storeTaxRate),
            variantName: item.variantName || null,
          }))
        );
      }

      // Create timeline entry
      await tx.insert(orderTimeline).values({
        orderId: newOrder.id,
        title: "Order Created from Draft",
        message: `Converted from draft #${draft.draftNumber} by ${session.user.name || session.user.email}`,
        type: "INFO",
      });

      // Update address with actual order ID
      if (shippingAddressId) {
        await tx.update(orderAddresses)
          .set({ orderId: newOrder.id })
          .where(eq(orderAddresses.id, shippingAddressId));
      }

      // Decrement inventory — use GREATEST to prevent negative stock values
      for (const item of items) {
        if (item.variantId) {
          await tx.update(productVariants)
            .set({ quantity: sql`GREATEST(0, ${productVariants.quantity} - ${item.quantity})` })
            .where(eq(productVariants.id, item.variantId));
        } else {
          await tx.update(products)
            .set({ quantity: sql`GREATEST(0, ${products.quantity} - ${item.quantity})` })
            .where(eq(products.id, item.productId));
        }
      }

      // Mark draft as completed
      await tx.update(draftOrders)
        .set({ status: "COMPLETED", orderId: newOrder.id })
        .where(eq(draftOrders.id, draftId));

      return newOrder;
    });

    // Send confirmation email if we have an email
    if (draft.customerEmail) {
      sendOrderConfirmation({
        orderNumber: order.orderNumber,
        customerName: draft.customerName || "Customer",
        email: draft.customerEmail,
        items: items.map((item) => ({
          name: item.name,
          variantName: item.variantName,
          quantity: item.quantity,
          price: item.price,
        })),
        subtotal: Number(draft.subtotal),
        shippingCost: Number(draft.shippingAmount),
        taxAmount: Number(draft.taxAmount),
        discountAmount: Number(draft.discountAmount),
        totalAmount: Number(draft.totalAmount),
        shippingAddress: shippingAddress ? {
          firstName: shippingAddress.firstName,
          lastName: shippingAddress.lastName,
          address: shippingAddress.address1,
          city: shippingAddress.city,
          country: shippingAddress.country,
        } : null,
        paymentMethod: paymentMethod || "MANUAL",
      }).catch(console.error);
    }

    // Generate Tap payment link for orders with tap payment method
    let paymentUrl: string | null = null;
    if (normalizedPM === "tap") {
      try {
        const settings = await db.query.storeSettings.findFirst();
        const tapSecretKey = process.env.TAP_SECRET_KEY;
        if (settings?.tapEnabled && tapSecretKey) {
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
          const charge = await createTapCharge(tapSecretKey, {
            amount: Number(order.totalAmount),
            currency: "SAR",
            description: `Order ${order.orderNumber}`,
            reference: { order: order.orderNumber },
            receipt: { email: true, sms: false },
            customer: {
              first_name: draft.customerName?.split(" ")[0] || "Customer",
              last_name: draft.customerName?.split(" ").slice(1).join(" ") || "",
              email: draft.customerEmail || "",
              phone: parseSaudiPhone(draft.customerPhone || undefined),
            },
            source: { id: "src_all" },
            redirect: { url: `${baseUrl}/api/payments/callback?order_id=${order.id}` },
            post: { url: `${baseUrl}/api/payments/webhook` },
            metadata: { order_id: order.id, order_number: order.orderNumber },
          });

          paymentUrl = charge.transaction.url;

          // Create transaction record
          await db.insert(transactions).values({
            orderId: order.id,
            type: "CHARGE",
            status: "PENDING",
            amount: order.totalAmount,
            currency: "SAR",
            paymentMethod: "TAP",
            reference: charge.id,
            metadata: JSON.stringify({ tap_charge_id: charge.id, tap_status: charge.status }),
          });

          await db.insert(orderTimeline).values({
            orderId: order.id,
            title: "Payment Link Generated",
            message: `Tap payment link created for draft conversion (Charge: ${charge.id})`,
            type: "INFO",
          });
        }
      } catch (err) {
        console.error("Failed to create Tap charge for draft order:", err);
        // Non-fatal — order is still created, admin can manually create charge later
      }
    }

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentUrl,
      message: paymentUrl
        ? "Draft order converted — payment link generated"
        : "Draft order converted to order successfully",
    }, { status: 201 });
  } catch (error) {
    console.error("Convert draft order error:", error);
    const message = error instanceof Error ? error.message : "Failed to convert draft order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
