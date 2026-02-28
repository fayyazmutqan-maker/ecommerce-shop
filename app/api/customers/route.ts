import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { users } from "@/lib/schema";
import { eq, or, ilike, count, desc } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = parseInt(searchParams.get("perPage") || "20");
    const search = searchParams.get("search") || "";

    const where = search
      ? or(
          ilike(users.name, `%${search}%`),
          ilike(users.email, `%${search}%`),
          ilike(users.phone, `%${search}%`),
        )
      : undefined;

    const [customerRows, [totalRow]] = await Promise.all([
      db.query.users.findMany({
        where,
        orderBy: desc(users.createdAt),
        offset: (page - 1) * perPage,
        limit: perPage,
        columns: {
          id: true,
          name: true,
          email: true,
          phone: true,
          image: true,
          role: true,
          createdAt: true,
        },
        with: {
          orders: { columns: { id: true } },
          reviews: { columns: { id: true } },
          wishlist: { columns: { id: true } },
        },
      }),
      db.select({ value: count() }).from(users).where(where),
    ]);

    const customers = customerRows.map(({ orders, reviews, wishlist, ...rest }) => ({
      ...rest,
      _count: {
        orders: orders.length,
        reviews: reviews.length,
        wishlist: wishlist.length,
      },
    }));

    const total = totalRow.value;

    return NextResponse.json({
      customers,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    });
  } catch (error) {
    console.error("Customers GET error:", error);
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}
