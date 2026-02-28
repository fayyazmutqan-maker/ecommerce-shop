import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { couponLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { toNumber } from "@/lib/decimal";
import { coupons } from "@/lib/schema";
import { eq } from "drizzle-orm";

const validateSchema = z.object({
  code: z.string().min(1).max(50),
  subtotal: z.number().min(0),
});

export async function POST(req: Request) {
  const rlResponse = await rateLimitResponse(couponLimiter, getClientIp(req));
  if (rlResponse) return rlResponse;

  try {
    const body = await req.json();
    const parsed = validateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { code, subtotal } = parsed.data;

    const coupon = await db.query.coupons.findFirst({
      where: eq(coupons.code, code.toUpperCase().trim()),
    });

    if (!coupon) {
      return NextResponse.json({ error: "Invalid or expired coupon code" }, { status: 400 });
    }

    if (!coupon.isActive) {
      return NextResponse.json({ error: "Invalid or expired coupon code" }, { status: 400 });
    }

    const now = new Date();
    if (coupon.startsAt && new Date(coupon.startsAt) > now) {
      return NextResponse.json({ error: "Invalid or expired coupon code" }, { status: 400 });
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
      return NextResponse.json({ error: "Invalid or expired coupon code" }, { status: 400 });
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return NextResponse.json({ error: "Invalid or expired coupon code" }, { status: 400 });
    }

    if (coupon.minOrderAmount && subtotal < toNumber(coupon.minOrderAmount)) {
      return NextResponse.json(
        { error: "Invalid or expired coupon code" },
        { status: 400 }
      );
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.type === "PERCENTAGE") {
      discountAmount = (subtotal * toNumber(coupon.value)) / 100;
      if (coupon.maxDiscountAmount && discountAmount > toNumber(coupon.maxDiscountAmount)) {
        discountAmount = toNumber(coupon.maxDiscountAmount);
      }
    } else if (coupon.type === "FIXED_AMOUNT") {
      discountAmount = Math.min(toNumber(coupon.value), subtotal);
    } else if (coupon.type === "FREE_SHIPPING") {
      discountAmount = 0; // Handled at checkout level
    }

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        description: coupon.description,
      },
      discountAmount: Math.round(discountAmount * 100) / 100,
      freeShipping: coupon.type === "FREE_SHIPPING",
    });
  } catch (error) {
    console.error("Coupon validate error:", error);
    return NextResponse.json({ error: "Failed to validate coupon" }, { status: 500 });
  }
}
