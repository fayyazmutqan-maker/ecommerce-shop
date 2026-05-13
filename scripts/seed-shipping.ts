import "dotenv/config";
import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import ws from "ws";
import * as schema from "../lib/schema";

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({ connectionString });
const db = drizzle(pool, { schema });

const shippingSeeds = [
  {
    name: "Saudi Arabia",
    countries: ["SA"],
    regions: ["*"],
    sortOrder: 1,
    rates: [
      {
        name: "Standard Delivery",
        type: "FLAT",
        price: "25.00",
        estimatedDays: "3-5 business days",
        sortOrder: 1,
      },
      {
        name: "Express Delivery",
        type: "FLAT",
        price: "50.00",
        estimatedDays: "1-2 business days",
        sortOrder: 2,
      },
      {
        name: "Free Shipping over SAR 200",
        type: "FREE",
        price: "0.00",
        minOrderAmount: "200.00",
        estimatedDays: "3-5 business days",
        sortOrder: 3,
      },
    ],
  },
  {
    name: "United Arab Emirates",
    countries: ["AE"],
    regions: ["*"],
    sortOrder: 2,
    rates: [
      {
        name: "UAE Standard Delivery",
        type: "FLAT",
        price: "35.00",
        estimatedDays: "4-7 business days",
        sortOrder: 1,
      },
      {
        name: "UAE Express Delivery",
        type: "FLAT",
        price: "75.00",
        estimatedDays: "2-4 business days",
        sortOrder: 2,
      },
      {
        name: "Free UAE Shipping over AED 300",
        type: "FREE",
        price: "0.00",
        minOrderAmount: "300.00",
        estimatedDays: "4-7 business days",
        sortOrder: 3,
      },
    ],
  },
];

async function upsertShippingZone(seed: (typeof shippingSeeds)[number]) {
  const existing = await db.query.shippingZones.findFirst({
    where: eq(schema.shippingZones.name, seed.name),
  });

  const zone = existing
    ? (
        await db
          .update(schema.shippingZones)
          .set({
            countries: JSON.stringify(seed.countries),
            regions: JSON.stringify(seed.regions),
            isActive: true,
            sortOrder: seed.sortOrder,
          })
          .where(eq(schema.shippingZones.id, existing.id))
          .returning()
      )[0]
    : (
        await db
          .insert(schema.shippingZones)
          .values({
            name: seed.name,
            countries: JSON.stringify(seed.countries),
            regions: JSON.stringify(seed.regions),
            isActive: true,
            sortOrder: seed.sortOrder,
          })
          .returning()
      )[0];

  await db.delete(schema.shippingRates).where(eq(schema.shippingRates.zoneId, zone.id));
  await db.insert(schema.shippingRates).values(
    seed.rates.map((rate) => ({
      zoneId: zone.id,
      name: rate.name,
      type: rate.type,
      price: rate.price,
      minOrderAmount: "minOrderAmount" in rate ? rate.minOrderAmount : null,
      estimatedDays: rate.estimatedDays,
      isActive: true,
      sortOrder: rate.sortOrder,
    })),
  );

  return zone;
}

function normalizeJsonArray(value: string | null, fallback: string[]) {
  if (!value) return JSON.stringify(fallback);
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return JSON.stringify(parsed.map(String));
  } catch {
    const parts = value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length > 0) return JSON.stringify(parts);
  }
  return JSON.stringify(fallback);
}

async function normalizeLegacyZones() {
  const zones = await db.query.shippingZones.findMany();

  for (const zone of zones) {
    await db
      .update(schema.shippingZones)
      .set({
        countries: normalizeJsonArray(zone.countries, ["*"]),
        regions: zone.regions ? normalizeJsonArray(zone.regions, ["*"]) : JSON.stringify(["*"]),
      })
      .where(eq(schema.shippingZones.id, zone.id));
  }
}

async function main() {
  console.log("Seeding shipping zones and rates...");

  for (const seed of shippingSeeds) {
    const zone = await upsertShippingZone(seed);
    console.log(`Seeded ${seed.name}: ${zone.id} (${seed.rates.length} rates)`);
  }

  await normalizeLegacyZones();
  console.log("Normalized legacy shipping zone JSON fields.");

  console.log("Shipping seed complete.");
}

main()
  .catch((error) => {
    console.error("Shipping seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
