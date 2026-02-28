import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { shippingZones } from "@/lib/schema";

/**
 * POST /api/shipping-zones/calculate — Calculate available shipping rates for checkout
 * Based on country, region, cart weight, and order amount
 */
export async function POST(req: Request) {
  try {
    const { country, region, totalWeight, orderAmount } = await req.json();

    if (!country) {
      return NextResponse.json({ error: "Country is required" }, { status: 400 });
    }

    // Find matching zones
    const allZones = await db.query.shippingZones.findMany({
      where: eq(shippingZones.isActive, true),
      with: {
        rates: {
          where: (r, { eq: rEq }) => rEq(r.isActive, true),
        },
      },
    });

    const matchingZones = allZones.filter((zone) => {
      const countries = JSON.parse(zone.countries) as string[];
      const regions = zone.regions ? (JSON.parse(zone.regions) as string[]) : [];

      // Check country match (case-insensitive)
      const countryMatch = countries.some(
        (c) => c.toLowerCase() === country.toLowerCase() || c === "*"
      );
      if (!countryMatch) return false;

      // If zone has regions specified, check region match
      if (regions.length > 0 && region) {
        return regions.some(
          (r) => r.toLowerCase() === region.toLowerCase() || r === "*"
        );
      }

      return true;
    });

    if (matchingZones.length === 0) {
      // Fallback: try to find a "Rest of World" zone with country "*"
      const fallback = allZones.find((z) => {
        const countries = JSON.parse(z.countries) as string[];
        return countries.includes("*");
      });

      if (!fallback) {
        return NextResponse.json({ rates: [], message: "No shipping available for your location" });
      }
      matchingZones.push(fallback);
    }

    // Collect all applicable rates from matching zones
    const availableRates: {
      id: string;
      zoneId: string;
      zoneName: string;
      name: string;
      type: string;
      price: number;
      estimatedDays: string | null;
    }[] = [];

    for (const zone of matchingZones) {
      for (const rate of zone.rates) {
        let applicable = true;
        let price = Number(rate.price);

        switch (rate.type) {
          case "FREE":
            // Free shipping — check minimum order amount
            if (rate.minOrderAmount && orderAmount < Number(rate.minOrderAmount)) {
              applicable = false;
            } else {
              price = 0;
            }
            break;

          case "WEIGHT_BASED":
            // Check weight range
            if (totalWeight !== undefined) {
              if (rate.minWeight && totalWeight < rate.minWeight) applicable = false;
              if (rate.maxWeight && totalWeight > rate.maxWeight) applicable = false;
            }
            break;

          case "PRICE_BASED":
            // Check order amount range
            if (rate.minOrderAmount && orderAmount < Number(rate.minOrderAmount)) applicable = false;
            if (rate.maxOrderAmount && orderAmount > Number(rate.maxOrderAmount)) applicable = false;
            break;

          case "FLAT":
          default:
            // Flat rate — always applicable
            break;
        }

        if (applicable) {
          availableRates.push({
            id: rate.id,
            zoneId: zone.id,
            zoneName: zone.name,
            name: rate.name,
            type: rate.type,
            price,
            estimatedDays: rate.estimatedDays,
          });
        }
      }
    }

    // Sort by price ascending
    availableRates.sort((a, b) => a.price - b.price);

    return NextResponse.json({ rates: availableRates });
  } catch (error) {
    console.error("Calculate shipping error:", error);
    return NextResponse.json({ error: "Failed to calculate shipping" }, { status: 500 });
  }
}
