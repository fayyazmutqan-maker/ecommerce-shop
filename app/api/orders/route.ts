import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { sendOrderConfirmation } from "@/lib/email";
import { reportOrderToZatca } from "@/lib/zatca/service";
import { checkoutLimiter, dailyOrderLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { audit, auditMeta } from "@/lib/audit";
import { trackInvoiceEvent } from "@/lib/invoice-monitor";
import { trackPurchase, extractTrackingContext } from "@/lib/conversions";
import { toNumber, serializeDecimal } from "@/lib/decimal";
import { eq, and, or, lte, gte, desc, count, sql, inArray } from "drizzle-orm";
import {
  products as productsTable,
  productVariants,
  productCategories,
  orders as ordersTable,
  orderItems as orderItemsTable,
  orderAddresses,
  orderTimeline,
  shippingRates,
  coupons,
  couponUsages,
  autoDiscounts,
  storeSettings,
  users,
  abandonedCarts,
} from "@/lib/schema";

const orderItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional().nullable(),
  quantity: z.number().int().min(1).max(100),
});

const addressSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  company: z.string().max(200).optional(),
  address1: z.string().min(1).max(300),
  address2: z.string().max(300).optional(),
  city: z.string().min(1).max(100),
  state: z.string().max(100).optional(),
  postalCode: z.string().min(1).max(20),
  country: z.string().min(1).max(100),
  phone: z.string().max(30).optional(),
});

const checkoutSchema = z.object({
  email: z.string().email().max(200),
  phone: z.string().max(30).optional(),
  items: z.array(orderItemSchema).min(1).max(50),
  shippingAddress: addressSchema,
  notes: z.string().max(500).optional(),
  paymentMethod: z.enum(["tap", "cod", "pos_card"]).optional().default("cod"),
  currency: z.enum(["SAR", "AED"]).optional().default("SAR"),
  source: z.enum(["ONLINE", "POS"]).optional().default("ONLINE"),
  // ── New: server-side validated coupon & shipping ──
  couponCode: z.string().max(50).optional(),
  shippingRateId: z.string().max(100).optional(),
});

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SF-${timestamp}-${random}`;
}

/**
 * POST /api/orders — Create a new order (checkout).
 *
 * Server-side verification of:
 *  - product prices & stock (prevents cart manipulation)
 *  - coupon code validity & discount calculation
 *  - shipping rate from DB (no hardcoded amounts)
 *  - automatic discounts re-evaluation
 *  - address created atomically (no placeholder pattern)
 */
export async function POST(req: Request) {
  // ── Rate limiting ──
  const ip = getClientIp(req);
  const rlResponse = await rateLimitResponse(checkoutLimiter, ip);
  if (rlResponse) {
    audit({ action: "RATE_LIMIT_HIT", ip, resource: "orders", success: false });
    return rlResponse;
  }

  // ── Daily transaction cap (prevents mass invoice generation) ──
  const dailyRl = await rateLimitResponse(dailyOrderLimiter, ip);
  if (dailyRl) {
    audit({ action: "RATE_LIMIT_HIT", ip, resource: "orders-daily", success: false });
    return dailyRl;
  }

  try {
    const body = await req.json();
    const parsed = checkoutSchema.safeParse(body);

    // ── Idempotency ──
    const idempotencyKey = req.headers.get("x-idempotency-key");
    if (idempotencyKey) {
      const existing = await db.query.orders.findFirst({
        where: eq(ordersTable.idempotencyKey, idempotencyKey),
        columns: { id: true, orderNumber: true, status: true, userId: true, email: true },
      });
      if (existing) {
        // Verify the caller owns this order before returning info
        const session = await auth();
        const callerEmail = parsed.success ? parsed.data.email : undefined;
        const callerOwns =
          (session?.user?.id && existing.userId === session.user.id) ||
          (!session?.user && existing.email && callerEmail && existing.email === callerEmail);
        if (!callerOwns) {
          // Don't reveal the order exists — just return a generic duplicate message
          return NextResponse.json(
            { duplicate: true },
            { status: 200 }
          );
        }
        return NextResponse.json(
          { order: { id: existing.id, orderNumber: existing.orderNumber, status: existing.status }, duplicate: true },
          { status: 200 }
        );
      }
    }

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const session = await auth();
    const userId = session?.user?.id || null;
    const meta = auditMeta(req);

    // ── 1. Server-side price verification ──
    // Load store tax rate from settings (fallback to 15% VAT)
    const settings = await db.query.storeSettings.findFirst({
      columns: { taxRate: true },
    });
    const storeTaxRate = settings?.taxRate ?? 0.15;

    const productIds = data.items.map((item) => item.productId);
    const products = await db.query.products.findMany({
      where: and(
        inArray(productsTable.id, productIds),
        eq(productsTable.status, "ACTIVE"),
      ),
      with: { variants: true, categories: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    const orderItems: {
      productId: string;
      variantId: string | null;
      name: string;
      sku: string | null;
      price: number;
      quantity: number;
      totalPrice: number;
      taxAmount: number;
      discountAmount: number;
      variantName: string | null;
    }[] = [];

    for (const item of data.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return NextResponse.json(
          { error: "Product not found or unavailable" },
          { status: 400 }
        );
      }

      let price = toNumber(product.price);
      let sku = product.sku;
      let variantName: string | null = null;

      if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (!variant) {
          return NextResponse.json(
            { error: "Product variant not found" },
            { status: 400 }
          );
        }
        price = toNumber(variant.price);
        sku = variant.sku || sku;
        variantName = variant.name;
      }

      // Check stock
      const availableQty = item.variantId
        ? product.variants.find((v) => v.id === item.variantId)?.quantity ?? 0
        : product.quantity;

      if (
        product.trackInventory &&
        !product.continueSellingWhenOOS &&
        item.quantity > availableQty
      ) {
        return NextResponse.json(
          { error: `"${product.name}" has insufficient stock (${availableQty} available)` },
          { status: 400 }
        );
      }

      const totalPrice = price * item.quantity;
      const taxAmount = product.taxable ? totalPrice * storeTaxRate : 0;

      orderItems.push({
        productId: item.productId,
        variantId: item.variantId || null,
        name: product.name,
        sku,
        price,
        quantity: item.quantity,
        totalPrice,
        taxAmount,
        discountAmount: 0,
        variantName,
      });
    }

    const subtotal = orderItems.reduce((sum, i) => sum + i.totalPrice, 0);
    const taxAmount = orderItems.reduce((sum, i) => sum + i.taxAmount, 0);

    // ── 2. Server-side shipping rate lookup ──
    let shippingAmount = 0;
    let shippingMethodName: string | null = null;

    if (data.shippingRateId) {
      const shippingRate = await db.query.shippingRates.findFirst({
        where: and(
          eq(shippingRates.id, data.shippingRateId),
          eq(shippingRates.isActive, true),
        ),
        with: { zone: true },
      });
      if (shippingRate) {
        shippingAmount = toNumber(shippingRate.price);
        shippingMethodName = shippingRate.name;
      } else {
        return NextResponse.json(
          { error: "Invalid shipping rate selected" },
          { status: 400 }
        );
      }
    } else {
      // No rate selected — apply default logic
      shippingAmount = subtotal > 200 ? 0 : 25;
    }

    // ── 3. Server-side coupon validation ──
    let couponDiscount = 0;
    let couponCode: string | null = null;
    let couponFreeShipping = false;

    if (data.couponCode) {
      const code = data.couponCode.toUpperCase().trim();
      const coupon = await db.query.coupons.findFirst({
        where: eq(coupons.code, code),
      });
      const now = new Date();

      if (
        coupon &&
        coupon.isActive &&
        (!coupon.startsAt || new Date(coupon.startsAt as unknown as string) <= now) &&
        (!coupon.expiresAt || new Date(coupon.expiresAt as unknown as string) >= now) &&
        (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit) &&
        (!coupon.minOrderAmount || subtotal >= toNumber(coupon.minOrderAmount))
      ) {
        // Per-user/email coupon limit: prevent reuse by same user or guest email
        if (userId) {
          const existingUsage = await db.query.couponUsages.findFirst({
            where: and(
              eq(couponUsages.couponId, coupon.id),
              eq(couponUsages.userId, userId),
            ),
          });
          if (existingUsage) {
            // User already used this coupon — silently skip
          } else {
            couponCode = coupon.code;
          }
        } else {
          // Guest: track by email to prevent reuse
          const existingGuestUsage = await db.query.couponUsages.findFirst({
            where: and(
              eq(couponUsages.couponId, coupon.id),
              eq(couponUsages.email, data.email.toLowerCase()),
            ),
          });
          if (existingGuestUsage) {
            // Guest already used this coupon — silently skip
          } else {
            couponCode = coupon.code;
          }
        }

        if (couponCode) {
          if (coupon.type === "PERCENTAGE") {
            couponDiscount = (subtotal * toNumber(coupon.value)) / 100;
            if (coupon.maxDiscountAmount && couponDiscount > toNumber(coupon.maxDiscountAmount)) {
              couponDiscount = toNumber(coupon.maxDiscountAmount);
            }
          } else if (coupon.type === "FIXED_AMOUNT") {
            couponDiscount = Math.min(toNumber(coupon.value), subtotal);
          } else if (coupon.type === "FREE_SHIPPING") {
            couponFreeShipping = true;
          }
        }
      }
      // If coupon is invalid we silently ignore — client already validated
    }

    if (couponFreeShipping) {
      shippingAmount = 0;
    }

    // ── 4. Server-side auto-discount evaluation ──
    let autoDiscountTotal = 0;
    const appliedAutoDiscountIds: string[] = [];
    const now = new Date();

    const activeAutoDiscounts = await db.query.autoDiscounts.findMany({
      where: and(
        eq(autoDiscounts.status, "ACTIVE"),
        or(
          sql`${autoDiscounts.startsAt} IS NULL`,
          lte(autoDiscounts.startsAt, now),
        ),
      ),
      orderBy: desc(autoDiscounts.priority),
    });

    // Get product→category mapping for discount evaluation
    const prodCategories = await db
      .select({ productId: productCategories.productId, categoryId: productCategories.categoryId })
      .from(productCategories)
      .where(inArray(productCategories.productId, productIds));

    const productCategoryMap = new Map<string, string[]>();
    for (const pc of prodCategories) {
      const existing = productCategoryMap.get(pc.productId) || [];
      existing.push(pc.categoryId);
      productCategoryMap.set(pc.productId, existing);
    }

    let nonCombinableApplied = false;
    for (const disc of activeAutoDiscounts) {
      if (disc.expiresAt && disc.expiresAt < now) continue;
      if (disc.maxUsesTotal && disc.usedCount >= disc.maxUsesTotal) continue;
      if (nonCombinableApplied && !disc.combinesWith) continue;
      if (disc.customerIds) {
        const ids = JSON.parse(disc.customerIds) as string[];
        if (ids.length > 0 && (!userId || !ids.includes(userId))) continue;
      }

      const buyProductIds = disc.buyProductIds ? (JSON.parse(disc.buyProductIds) as string[]) : [];
      const buyCategoryIds = disc.buyCategoryIds ? (JSON.parse(disc.buyCategoryIds) as string[]) : [];
      const qualifyingItems = orderItems.filter((oi) => {
        if (buyProductIds.length > 0) return buyProductIds.includes(oi.productId);
        if (buyCategoryIds.length > 0) return (productCategoryMap.get(oi.productId) || []).some((c) => buyCategoryIds.includes(c));
        return true;
      });
      const totalQualifyingQty = qualifyingItems.reduce((s, i) => s + i.quantity, 0);
      const totalQualifyingAmount = qualifyingItems.reduce((s, i) => s + i.totalPrice, 0);

      let savedAmount = 0;

      switch (disc.type) {
        case "PERCENTAGE_OFF": {
          const minQty = disc.minQuantity || 0;
          const minAmt = toNumber(disc.minOrderAmount) || 0;
          if (totalQualifyingQty >= minQty && totalQualifyingAmount >= minAmt) {
            savedAmount = totalQualifyingAmount * (disc.discountValue / 100);
          }
          break;
        }
        case "FIXED_OFF": {
          const minAmt = toNumber(disc.minOrderAmount) || 0;
          if (subtotal >= minAmt) {
            savedAmount = Math.min(disc.discountValue, subtotal);
          }
          break;
        }
        case "SPEND_X_GET_Y": {
          const minAmt = toNumber(disc.minOrderAmount) || 0;
          if (subtotal >= minAmt) {
            if (disc.discountType === "PERCENTAGE") {
              savedAmount = subtotal * (disc.discountValue / 100);
            } else if (disc.discountType === "FIXED_AMOUNT") {
              savedAmount = Math.min(disc.discountValue, subtotal);
            }
          }
          break;
        }
        case "BOGO": {
          const minQty = disc.minQuantity || 2;
          if (totalQualifyingQty >= minQty) {
            const freeQty = disc.getQuantity || 1;
            const prices = qualifyingItems
              .flatMap((i) => Array(i.quantity).fill(i.price))
              .sort((a: number, b: number) => a - b);
            const actualFreeQty = Math.min(freeQty, Math.floor(totalQualifyingQty / minQty) * freeQty);
            savedAmount = prices.slice(0, actualFreeQty).reduce((s: number, p: number) => s + p, 0);
          }
          break;
        }
      }

      if (savedAmount > 0) {
        autoDiscountTotal += savedAmount;
        appliedAutoDiscountIds.push(disc.id);
        if (!disc.combinesWith) nonCombinableApplied = true;
      }
    }

    autoDiscountTotal = Math.round(autoDiscountTotal * 100) / 100;
    couponDiscount = Math.round(couponDiscount * 100) / 100;

    // ── 5. Calculate final totals ──
    const totalDiscount = couponDiscount + autoDiscountTotal;
    const totalAmount = Math.max(0, subtotal + taxAmount + shippingAmount - totalDiscount);

    // ── 6. Create order atomically (no placeholder addresses) ──
    const order = await db.transaction(async (tx) => {
      // Re-verify stock inside transaction with row-level locking
      for (const item of data.items) {
        const product = productMap.get(item.productId)!;
        if (product.trackInventory && !product.continueSellingWhenOOS) {
          if (item.variantId) {
            const [variant] = await tx
              .select({ quantity: productVariants.quantity })
              .from(productVariants)
              .where(eq(productVariants.id, item.variantId))
              .for("update");
            if (!variant || item.quantity > variant.quantity) {
              throw new Error(`"${product.name}" has insufficient stock`);
            }
          } else {
            const [freshProduct] = await tx
              .select({ quantity: productsTable.quantity })
              .from(productsTable)
              .where(eq(productsTable.id, item.productId))
              .for("update");
            if (!freshProduct || item.quantity > freshProduct.quantity) {
              throw new Error(`"${product.name}" has insufficient stock`);
            }
          }
        }
      }

      // Create the order
      const isPosOrder = data.source === "POS";
      const resolvedPaymentMethod = data.paymentMethod === "tap" ? "TAP"
        : data.paymentMethod === "pos_card" ? "CARD_TERMINAL"
        : "COD";
      const [newOrder] = await tx
        .insert(ordersTable)
        .values({
          orderNumber: generateOrderNumber(),
          userId,
          email: data.email,
          phone: data.phone || null,
          status: isPosOrder ? "CONFIRMED" : "PENDING",
          paymentStatus: isPosOrder ? "PAID" : "PENDING",
          paymentMethod: resolvedPaymentMethod,
          fulfillmentStatus: "UNFULFILLED",
          subtotal: String(subtotal),
          taxAmount: String(taxAmount),
          shippingAmount: String(shippingAmount),
          discountAmount: String(totalDiscount),
          totalAmount: String(totalAmount),
          currency: data.currency,
          notes: data.notes || null,
          source: data.source === "POS" ? "POS" : "ONLINE",
          couponCode: couponCode || null,
          autoDiscountIds: appliedAutoDiscountIds.length > 0
            ? JSON.stringify(appliedAutoDiscountIds)
            : null,
          shippingMethod: shippingMethodName,
          ...(idempotencyKey ? { idempotencyKey } : {}),
        })
        .returning();

      // Create order items
      await tx.insert(orderItemsTable).values(
        orderItems.map((item) => ({
          orderId: newOrder.id,
          productId: item.productId,
          variantId: item.variantId,
          name: item.name,
          sku: item.sku,
          price: String(item.price),
          quantity: item.quantity,
          totalPrice: String(item.totalPrice),
          taxAmount: String(item.taxAmount),
          discountAmount: String(item.discountAmount),
          variantName: item.variantName,
        })),
      );

      // Create timeline entry
      await tx.insert(orderTimeline).values({
        orderId: newOrder.id,
        title: "Order Placed",
        message: couponCode
          ? `Order placed with coupon ${couponCode}`
          : "Order placed successfully",
        type: "INFO",
      });

      // Create shipping address linked to the real order (no placeholder)
      const [shippingAddr] = await tx
        .insert(orderAddresses)
        .values({
          orderId: newOrder.id,
          type: "SHIPPING",
          firstName: data.shippingAddress.firstName,
          lastName: data.shippingAddress.lastName,
          company: data.shippingAddress.company || null,
          address1: data.shippingAddress.address1,
          address2: data.shippingAddress.address2 || null,
          city: data.shippingAddress.city,
          state: data.shippingAddress.state || null,
          postalCode: data.shippingAddress.postalCode,
          country: data.shippingAddress.country,
          phone: data.shippingAddress.phone || null,
        })
        .returning();

      // Connect shipping address to order
      if (shippingAddr) {
        await tx
          .update(ordersTable)
          .set({ shippingAddressId: shippingAddr.id })
          .where(eq(ordersTable.id, newOrder.id));
      }

      // Decrement inventory (clamped to 0)
      for (const item of orderItems) {
        if (item.variantId) {
          await tx
            .update(productVariants)
            .set({ quantity: sql`GREATEST(0, ${productVariants.quantity} - ${item.quantity})` })
            .where(eq(productVariants.id, item.variantId));
        } else {
          await tx
            .update(productsTable)
            .set({ quantity: sql`GREATEST(0, ${productsTable.quantity} - ${item.quantity})` })
            .where(eq(productsTable.id, item.productId));
        }
      }

      // Increment coupon usage and record per-user usage
      if (couponCode) {
        const couponRecord = await tx.query.coupons.findFirst({
          where: eq(coupons.code, couponCode),
          columns: { id: true },
        });

        await tx
          .update(coupons)
          .set({ usedCount: sql`${coupons.usedCount} + 1` })
          .where(eq(coupons.code, couponCode));

        // Record coupon usage (prevents re-use by the same user or guest email)
        if (couponRecord) {
          await tx.insert(couponUsages).values({
            couponId: couponRecord.id,
            ...(userId ? { userId } : {}),
            email: data.email.toLowerCase(),
            orderId: newOrder.id,
          }).onConflictDoNothing();
        }
      }

      // Increment auto-discount usage
      for (const discId of appliedAutoDiscountIds) {
        await tx
          .update(autoDiscounts)
          .set({ usedCount: sql`${autoDiscounts.usedCount} + 1` })
          .where(eq(autoDiscounts.id, discId));
      }

      // Fetch the order with items for the return value
      const fullOrder = await tx.query.orders.findFirst({
        where: eq(ordersTable.id, newOrder.id),
        with: { items: true },
      });

      return fullOrder!;
    });

    // ── Audit log ──
    audit({
      action: "ORDER_CREATE",
      userId,
      email: data.email,
      ip: meta.ip,
      resource: "order",
      resourceId: order.id,
      details: {
        orderNumber: order.orderNumber,
        totalAmount,
        couponCode,
        autoDiscountIds: appliedAutoDiscountIds,
        paymentMethod: data.paymentMethod,
        currency: data.currency,
      },
      success: true,
    });

    // Send order confirmation email (non-blocking)
    const serializedOrder = serializeDecimal(order);

    // ── Mark abandoned carts as recovered ──
    try {
      const abandonedWhere = userId
        ? or(
            and(eq(abandonedCarts.userId, userId), inArray(abandonedCarts.status, ["ABANDONED", "EMAIL_SENT"])),
            and(eq(abandonedCarts.email, data.email), inArray(abandonedCarts.status, ["ABANDONED", "EMAIL_SENT"]))
          )
        : and(eq(abandonedCarts.email, data.email), inArray(abandonedCarts.status, ["ABANDONED", "EMAIL_SENT"]));

      await db.update(abandonedCarts).set({
        status: "RECOVERED",
        recoveredAt: new Date(),
        orderId: order.id,
      }).where(abandonedWhere!);
    } catch {
      // Non-critical — don't fail the order
    }

    sendOrderConfirmation({
      orderNumber: serializedOrder.orderNumber,
      customerName: session?.user?.name || data.shippingAddress.firstName,
      email: data.email,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items: serializedOrder.items.map((item: any) => ({
        name: item.name as string,
        variantName: item.variantName as string | null,
        quantity: item.quantity as number,
        price: toNumber(item.price),
      })),
      subtotal: toNumber(serializedOrder.subtotal),
      shippingCost: toNumber(serializedOrder.shippingAmount),
      taxAmount: toNumber(serializedOrder.taxAmount),
      discountAmount: toNumber(serializedOrder.discountAmount),
      totalAmount: toNumber(serializedOrder.totalAmount),
      shippingAddress: {
        firstName: data.shippingAddress.firstName,
        lastName: data.shippingAddress.lastName,
        address: data.shippingAddress.address1,
        city: data.shippingAddress.city,
        country: data.shippingAddress.country,
      },
      paymentMethod: data.paymentMethod,
    }).catch((err) => console.error("Failed to send order confirmation email:", err));

    // Report invoice to ZATCA (non-blocking)
    reportOrderToZatca(order.id).catch((err) =>
      console.error("ZATCA reporting failed:", err)
    );

    // Track for anomaly detection (non-blocking)
    trackInvoiceEvent({ ip, type: "order", orderId: order.id });

    // Track purchase event for Meta Conversions API (non-blocking)
    trackPurchase(
      {
        orderId: order.id,
        value: totalAmount,
        currency: data.currency,
        items: orderItems.map((item) => ({
          id: item.sku || item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
      },
      { ...extractTrackingContext(req, session?.user?.id), email: data.email, phone: data.phone ?? undefined },
    ).catch(() => {});

    return NextResponse.json(
      {
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalAmount,
        message: "Order placed successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Order POST error:", error);
    audit({ action: "ORDER_CREATE", ip: getClientIp(req), success: false, error: String(error) });
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/orders — Get orders for the current user (or all orders for admin).
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = session.user.role === "ADMIN";
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const searchQuery = searchParams.get("search")?.trim();

    const conditions = isAdmin ? [] : [eq(ordersTable.userId, session.user.id)];

    if (searchQuery) {
      conditions.push(
        or(
          sql`${ordersTable.orderNumber} ILIKE ${`%${searchQuery}%`}`,
          sql`${ordersTable.email} ILIKE ${`%${searchQuery}%`}`,
        )!,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [orderRows, totalRows] = await Promise.all([
      db.query.orders.findMany({
        where,
        with: {
          items: true,
          shippingAddress: true,
          user: { columns: { id: true, name: true, email: true } },
        },
        orderBy: desc(ordersTable.createdAt),
        offset: (page - 1) * limit,
        limit,
      }),
      db.select({ value: count() }).from(ordersTable).where(where),
    ]);

    const total = totalRows[0]?.value ?? 0;

    return NextResponse.json(serializeDecimal({
      orders: orderRows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }));
  } catch (error) {
    console.error("Orders GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
