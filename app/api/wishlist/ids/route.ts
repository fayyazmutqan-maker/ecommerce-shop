import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { wishlistItems } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json([]);
    }

    const items = await db
      .select({ productId: wishlistItems.productId })
      .from(wishlistItems)
      .where(eq(wishlistItems.userId, session.user.id));

    return NextResponse.json(items.map((i) => i.productId));
  } catch (error) {
    console.error("Wishlist IDs error:", error);
    return NextResponse.json([]);
  }
}
