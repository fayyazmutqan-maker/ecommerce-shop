import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, orders, reviews, wishlistItems } from "@/lib/schema";
import { eq, count } from "drizzle-orm";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

const profileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().max(30).nullable().optional(),
  image: z.string().nullable().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6).max(100),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const uid = session.user.id;

    const [user, orderCnt, reviewCnt, wishlistCnt] = await Promise.all([
      db.query.users.findFirst({
        where: eq(users.id, uid),
        columns: {
          id: true, name: true, email: true, phone: true,
          image: true, role: true, createdAt: true,
        },
      }),
      db.select({ value: count() }).from(orders).where(eq(orders.userId, uid)),
      db.select({ value: count() }).from(reviews).where(eq(reviews.userId, uid)),
      db.select({ value: count() }).from(wishlistItems).where(eq(wishlistItems.userId, uid)),
    ]);

    return NextResponse.json({
      ...user,
      _count: { orders: orderCnt[0].value, reviews: reviewCnt[0].value, wishlist: wishlistCnt[0].value },
    });
  } catch (error) {
    console.error("Profile GET error:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

// Update profile
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Handle password change
    if (body.currentPassword && body.newPassword) {
      const parsed = passwordSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
      }

      const user = await db.query.users.findFirst({ where: eq(users.id, session.user.id) });
      if (!user?.password) {
        return NextResponse.json(
          { error: "Cannot change password for OAuth accounts" },
          { status: 400 }
        );
      }

      const isValid = await bcrypt.compare(parsed.data.currentPassword, user.password);
      if (!isValid) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 12);
      await db.update(users).set({ password: hashedPassword }).where(eq(users.id, session.user.id));

      return NextResponse.json({ message: "Password updated successfully" });
    }

    // Handle profile update
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const [updated] = await db.update(users).set(parsed.data).where(eq(users.id, session.user.id)).returning({
      id: users.id, name: users.name, email: users.email,
      phone: users.phone, image: users.image, role: users.role,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Profile PUT error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
