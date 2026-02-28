import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { users, orders, addresses, reviews } from "@/lib/schema";
import { serializeDecimal } from "@/lib/decimal";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const updateCustomerSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  phone: z.string().max(30).nullable().optional(),
  role: z.enum(["ADMIN", "CUSTOMER"]).optional(),
});

/**
 * GET /api/customers/[id] — Get customer detail with orders, addresses, reviews
 */
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const customer = await db.query.users.findFirst({
      where: eq(users.id, id),
      columns: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      with: {
        orders: {
          orderBy: [desc(orders.createdAt)],
          columns: {
            id: true,
            orderNumber: true,
            status: true,
            paymentStatus: true,
            totalAmount: true,
            currency: true,
            createdAt: true,
          },
        },
        addresses: {
          columns: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            address1: true,
            address2: true,
            city: true,
            state: true,
            postalCode: true,
            country: true,
            isDefault: true,
          },
        },
        reviews: {
          orderBy: [desc(reviews.createdAt)],
          columns: {
            id: true,
            rating: true,
            comment: true,
            isApproved: true,
            createdAt: true,
          },
          with: {
            product: { columns: { id: true, name: true, slug: true } },
          },
        },
        wishlist: {
          columns: { id: true },
          with: { product: { columns: { id: true, name: true, slug: true } } },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Calculate aggregate stats
    const totalSpent = customer.orders.reduce(
      (sum, o) => sum + Number(o.totalAmount),
      0
    );

    return NextResponse.json(
      serializeDecimal({
        ...customer,
        stats: {
          totalOrders: customer.orders.length,
          totalSpent,
          totalReviews: customer.reviews.length,
          wishlistItems: customer.wishlist.length,
        },
      })
    );
  } catch (error) {
    console.error("Customer detail GET error:", error);
    return NextResponse.json({ error: "Failed to fetch customer" }, { status: 500 });
  }
}

/**
 * PUT /api/customers/[id] — Update customer profile (admin only)
 */
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = updateCustomerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const data = parsed.data;
    const [updated] = await db
      .update(users)
      .set({
        ...(data.name && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.role && { role: data.role }),
      })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
      });

    if (!updated) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Customer PUT error:", error);
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
  }
}
