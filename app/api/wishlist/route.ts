import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { wishlistItems, products } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

const wishlistSchema = z.object({
  productId: z.string().min(1),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Please sign in" }, { status: 401 });
    }

    const items = await db.query.wishlistItems.findMany({
      where: eq(wishlistItems.userId, session.user.id),
      orderBy: desc(wishlistItems.createdAt),
      with: {
        product: {
          with: {
            images: {
              where: (imgs, { eq }) => eq(imgs.isPrimary, true),
              limit: 1,
            },
            variants: {
              where: (v, { eq }) => eq(v.isActive, true),
              limit: 1,
            },
          },
        },
      },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Wishlist GET error:", error);
    return NextResponse.json({ error: "Failed to fetch wishlist" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Please sign in" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = wishlistSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { productId } = parsed.data;

    // Check product exists
    const product = await db.query.products.findFirst({ where: eq(products.id, productId) });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Toggle: if already in wishlist, remove it
    const existing = await db.query.wishlistItems.findFirst({
      where: and(eq(wishlistItems.userId, session.user.id), eq(wishlistItems.productId, productId)),
    });

    if (existing) {
      await db.delete(wishlistItems).where(eq(wishlistItems.id, existing.id));
      return NextResponse.json({ added: false, message: "Removed from wishlist" });
    }

    const [item] = await db.insert(wishlistItems).values({ userId: session.user.id, productId }).returning();

    return NextResponse.json({ added: true, item }, { status: 201 });
  } catch (error) {
    console.error("Wishlist POST error:", error);
    return NextResponse.json({ error: "Failed to update wishlist" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Please sign in" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    if (!productId) return NextResponse.json({ error: "Product ID required" }, { status: 400 });

    await db.delete(wishlistItems).where(
      and(eq(wishlistItems.userId, session.user.id), eq(wishlistItems.productId, productId))
    );

    return NextResponse.json({ message: "Removed from wishlist" });
  } catch (error) {
    console.error("Wishlist DELETE error:", error);
    return NextResponse.json({ error: "Failed to remove from wishlist" }, { status: 500 });
  }
}
