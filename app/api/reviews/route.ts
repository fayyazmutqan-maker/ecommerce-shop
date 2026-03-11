import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { reviews, products } from "@/lib/schema";
import { eq, and, desc } from "drizzle-orm";
import { formLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).nullable().optional(),
  comment: z.string().max(2000).nullable().optional(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const admin = searchParams.get("admin") === "true";
    const mine = searchParams.get("mine") === "true";

    if (admin) {
      const session = await auth();
      if (!session?.user || session.user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    if (mine) {
      const session = await auth();
      if (!session?.user) {
        return NextResponse.json({ error: "Please sign in" }, { status: 401 });
      }

      const result = await db.query.reviews.findMany({
        where: eq(reviews.userId, session.user.id),
        orderBy: desc(reviews.createdAt),
        with: {
          product: { columns: { id: true, name: true, slug: true } },
        },
      });

      return NextResponse.json(result);
    }

    const conditions = [];
    if (productId) conditions.push(eq(reviews.productId, productId));
    if (!admin) conditions.push(eq(reviews.isApproved, true));

    const result = await db.query.reviews.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: desc(reviews.createdAt),
      limit: admin ? 200 : 50,
      with: {
        user: { columns: { id: true, name: true, image: true } },
        product: { columns: { id: true, name: true, slug: true } },
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Reviews GET error:", error);
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // Rate limit review submissions
    const ip = getClientIp(req);
    const rlResponse = await rateLimitResponse(formLimiter, ip);
    if (rlResponse) return rlResponse;

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Please sign in to leave a review" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const data = parsed.data;

    // Check product exists
    const product = await db.query.products.findFirst({
      where: eq(products.id, data.productId),
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Check if user already reviewed this product
    const existingReview = await db.query.reviews.findFirst({
      where: and(eq(reviews.productId, data.productId), eq(reviews.userId, session.user.id)),
    });
    if (existingReview) {
      return NextResponse.json({ error: "You have already reviewed this product" }, { status: 409 });
    }

    const [review] = await db.insert(reviews).values({
      productId: data.productId,
      userId: session.user.id,
      rating: data.rating,
      title: data.title || null,
      comment: data.comment || null,
      isApproved: false, // Requires admin approval
    }).returning();

    // Re-fetch with user relation
    const reviewWithUser = await db.query.reviews.findFirst({
      where: eq(reviews.id, review.id),
      with: {
        user: { columns: { id: true, name: true, image: true } },
      },
    });

    return NextResponse.json(reviewWithUser, { status: 201 });
  } catch (error) {
    console.error("Review POST error:", error);
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}

// Admin: approve/reject reviews
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, isApproved } = body;
    if (!id || typeof isApproved !== "boolean") {
      return NextResponse.json({ error: "Review ID and isApproved required" }, { status: 400 });
    }

    const [review] = await db.update(reviews).set({ isApproved }).where(eq(reviews.id, id)).returning();

    return NextResponse.json(review);
  } catch (error) {
    console.error("Review PUT error:", error);
    return NextResponse.json({ error: "Failed to update review" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Review ID required" }, { status: 400 });

    const review = await db.query.reviews.findFirst({ where: eq(reviews.id, id) });
    if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });

    // User can delete own review, admin can delete any
    if (review.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await db.delete(reviews).where(eq(reviews.id, id));
    return NextResponse.json({ message: "Review deleted" });
  } catch (error) {
    console.error("Review DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete review" }, { status: 500 });
  }
}
