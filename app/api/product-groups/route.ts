import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { productGroups } from "@/lib/schema";
import { eq, asc } from "drizzle-orm";

// GET all product groups with their attributes
export async function GET() {
  try {
    const groups = await db.query.productGroups.findMany({
      where: eq(productGroups.isActive, true),
      orderBy: asc(productGroups.sortOrder),
      with: {
        attributes: true,
      },
    });

    // Parse JSON options for each attribute
    const parsed = groups.map((g) => ({
      ...g,
      attributes: g.attributes.map((a) => ({
        ...a,
        options: a.options ? JSON.parse(a.options) : [],
      })),
    }));

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Product groups GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch product groups" },
      { status: 500 }
    );
  }
}
