import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { addresses } from "@/lib/schema";
import { auth } from "@/lib/auth";
import { eq, and, ne, count, desc, asc } from "drizzle-orm";
import { z } from "zod";

const addressSchema = z.object({
  label: z.string().max(50).nullable().optional(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  company: z.string().max(200).nullable().optional(),
  address1: z.string().min(1).max(300),
  address2: z.string().max(300).nullable().optional(),
  city: z.string().min(1).max(100),
  state: z.string().max(100).nullable().optional(),
  postalCode: z.string().min(1).max(20),
  country: z.string().min(1).max(100),
  phone: z.string().max(30).nullable().optional(),
  isDefault: z.boolean().default(false),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Please sign in" }, { status: 401 });
    }

    const result = await db.query.addresses.findMany({
      where: eq(addresses.userId, session.user.id),
      orderBy: [desc(addresses.isDefault), asc(addresses.id)],
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Addresses GET error:", error);
    return NextResponse.json({ error: "Failed to fetch addresses" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Please sign in" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = addressSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const data = parsed.data;

    // If this is the default, unset other defaults
    if (data.isDefault) {
      await db.update(addresses).set({ isDefault: false }).where(
        and(eq(addresses.userId, session.user.id), eq(addresses.isDefault, true))
      );
    }

    // If first address, make it default
    const [{ value: addressCount }] = await db.select({ value: count() }).from(addresses).where(eq(addresses.userId, session.user.id));
    if (addressCount === 0) data.isDefault = true;

    const [address] = await db.insert(addresses).values({ ...data, userId: session.user.id }).returning();

    return NextResponse.json(address, { status: 201 });
  } catch (error) {
    console.error("Address POST error:", error);
    return NextResponse.json({ error: "Failed to create address" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Please sign in" }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: "Address ID required" }, { status: 400 });

    const existing = await db.query.addresses.findFirst({
      where: and(eq(addresses.id, id), eq(addresses.userId, session.user.id)),
    });
    if (!existing) return NextResponse.json({ error: "Address not found" }, { status: 404 });

    // If setting as default, unset others
    if (data.isDefault) {
      await db.update(addresses).set({ isDefault: false }).where(
        and(eq(addresses.userId, session.user.id), eq(addresses.isDefault, true), ne(addresses.id, id))
      );
    }

    const [address] = await db.update(addresses).set(data).where(eq(addresses.id, id)).returning();
    return NextResponse.json(address);
  } catch (error) {
    console.error("Address PUT error:", error);
    return NextResponse.json({ error: "Failed to update address" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Please sign in" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Address ID required" }, { status: 400 });

    const existing = await db.query.addresses.findFirst({
      where: and(eq(addresses.id, id), eq(addresses.userId, session.user.id)),
    });
    if (!existing) return NextResponse.json({ error: "Address not found" }, { status: 404 });

    await db.delete(addresses).where(eq(addresses.id, id));

    // If deleted address was default, promote another
    if (existing.isDefault) {
      const next = await db.query.addresses.findFirst({
        where: eq(addresses.userId, session.user.id),
        orderBy: asc(addresses.id),
      });
      if (next) {
        await db.update(addresses).set({ isDefault: true }).where(eq(addresses.id, next.id));
      }
    }

    return NextResponse.json({ message: "Address deleted" });
  } catch (error) {
    console.error("Address DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete address" }, { status: 500 });
  }
}
