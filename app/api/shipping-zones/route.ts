import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { eq, asc } from "drizzle-orm";
import { shippingZones, shippingRates } from "@/lib/schema";

const shippingZoneSchema = z.object({
  name: z.string().min(1).max(100),
  countries: z.array(z.string()).min(1),
  regions: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  rates: z.array(z.object({
    name: z.string().min(1).max(100),
    type: z.enum(["FLAT", "WEIGHT_BASED", "PRICE_BASED", "FREE"]),
    price: z.number().min(0).default(0),
    minWeight: z.number().min(0).optional().nullable(),
    maxWeight: z.number().min(0).optional().nullable(),
    minOrderAmount: z.number().min(0).optional().nullable(),
    maxOrderAmount: z.number().min(0).optional().nullable(),
    estimatedDays: z.string().optional().nullable(),
    isActive: z.boolean().default(true),
    sortOrder: z.number().int().default(0),
  })).optional(),
});

/**
 * GET /api/shipping-zones — Get all shipping zones with rates
 */
export async function GET() {
  try {
    const zones = await db.query.shippingZones.findMany({
      with: { rates: true },
      orderBy: asc(shippingZones.sortOrder),
    });

    return NextResponse.json(zones.map((z) => {
      let countries: string[];
      try { countries = JSON.parse(z.countries); } catch { countries = z.countries ? z.countries.split(",").map((c) => c.trim()) : []; }
      let regions: string[];
      try { regions = z.regions ? JSON.parse(z.regions) : []; } catch { regions = z.regions ? z.regions.split(",").map((r) => r.trim()) : []; }
      return { ...z, countries, regions };
    }));
  } catch (error) {
    console.error("Shipping zones GET error:", error);
    return NextResponse.json({ error: "Failed to fetch shipping zones" }, { status: 500 });
  }
}

/**
 * POST /api/shipping-zones — Create a shipping zone with rates
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = shippingZoneSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { rates, ...zoneData } = parsed.data;

    const [zone] = await db.insert(shippingZones).values({
      name: zoneData.name,
      countries: JSON.stringify(zoneData.countries),
      regions: zoneData.regions ? JSON.stringify(zoneData.regions) : null,
      isActive: zoneData.isActive,
      sortOrder: zoneData.sortOrder,
    }).returning();

    if (rates?.length) {
      await db.insert(shippingRates).values(rates.map((r) => ({
        zoneId: zone.id,
        name: r.name,
        type: r.type,
        price: String(r.price),
        minWeight: r.minWeight || null,
        maxWeight: r.maxWeight || null,
        minOrderAmount: r.minOrderAmount != null ? String(r.minOrderAmount) : null,
        maxOrderAmount: r.maxOrderAmount != null ? String(r.maxOrderAmount) : null,
        estimatedDays: r.estimatedDays || null,
        isActive: r.isActive,
        sortOrder: r.sortOrder,
      })));
    }

    const created = await db.query.shippingZones.findFirst({
      where: eq(shippingZones.id, zone.id),
      with: { rates: true },
    });

    return NextResponse.json({
      ...created,
      countries: JSON.parse(created!.countries),
      regions: created!.regions ? JSON.parse(created!.regions) : [],
    }, { status: 201 });
  } catch (error) {
    console.error("Shipping zone POST error:", error);
    return NextResponse.json({ error: "Failed to create shipping zone" }, { status: 500 });
  }
}

/**
 * PUT /api/shipping-zones — Update a shipping zone
 */
export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, rates, ...updates } = body;
    if (!id) return NextResponse.json({ error: "Zone ID required" }, { status: 400 });

    // Prepare update data
    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.countries !== undefined) updateData.countries = JSON.stringify(updates.countries);
    if (updates.regions !== undefined) updateData.regions = JSON.stringify(updates.regions);
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
    if (updates.sortOrder !== undefined) updateData.sortOrder = updates.sortOrder;

    // Update zone and replace rates if provided
    if (rates) {
      await db.delete(shippingRates).where(eq(shippingRates.zoneId, id));
      await db.insert(shippingRates).values(
        rates.map((r: { name: string; type: string; price: number; minWeight?: number; maxWeight?: number; minOrderAmount?: number; maxOrderAmount?: number; estimatedDays?: string; isActive?: boolean; sortOrder?: number }) => ({
          zoneId: id,
          name: r.name,
          type: r.type || "FLAT",
          price: String(r.price || 0),
          minWeight: r.minWeight || null,
          maxWeight: r.maxWeight || null,
          minOrderAmount: r.minOrderAmount != null ? String(r.minOrderAmount) : null,
          maxOrderAmount: r.maxOrderAmount != null ? String(r.maxOrderAmount) : null,
          estimatedDays: r.estimatedDays || null,
          isActive: r.isActive ?? true,
          sortOrder: r.sortOrder || 0,
        })),
      );
    }

    await db.update(shippingZones).set(updateData).where(eq(shippingZones.id, id));

    const zone = await db.query.shippingZones.findFirst({
      where: eq(shippingZones.id, id),
      with: { rates: true },
    });

    return NextResponse.json({
      ...zone,
      countries: JSON.parse(zone!.countries),
      regions: zone!.regions ? JSON.parse(zone!.regions) : [],
    });
  } catch (error) {
    console.error("Shipping zone PUT error:", error);
    return NextResponse.json({ error: "Failed to update shipping zone" }, { status: 500 });
  }
}

/**
 * DELETE /api/shipping-zones — Delete a shipping zone and its rates
 */
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Zone ID required" }, { status: 400 });

    await db.delete(shippingZones).where(eq(shippingZones.id, id));
    return NextResponse.json({ message: "Shipping zone deleted" });
  } catch (error) {
    console.error("Shipping zone DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete shipping zone" }, { status: 500 });
  }
}
