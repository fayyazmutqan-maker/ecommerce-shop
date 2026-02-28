import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { serializeDecimal } from "@/lib/decimal";
import { audit, auditMeta } from "@/lib/audit";
import { storeSettings } from "@/lib/schema";
import { eq } from "drizzle-orm";

const settingsSchema = z.object({
  storeName: z.string().max(100).optional(),
  storeDescription: z.string().max(500).optional(),
  contactEmail: z.string().email().max(200).optional(),
  contactPhone: z.string().max(30).optional(),
  currency: z.string().max(10).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  shippingFee: z.number().min(0).optional(),
  freeShippingThreshold: z.number().min(0).optional(),
  logo: z.string().url().max(500).optional().nullable(),
  favicon: z.string().url().max(500).optional().nullable(),
  address: z.string().max(500).optional(),
  socialFacebook: z.string().max(300).optional().nullable(),
  socialTwitter: z.string().max(300).optional().nullable(),
  socialInstagram: z.string().max(300).optional().nullable(),
  socialTiktok: z.string().max(300).optional().nullable(),
  commercialRegNo: z.string().max(50).optional().nullable(),
  vatNumber: z.string().max(50).optional().nullable(),
  // Payment Gateway
  tapEnabled: z.boolean().optional(),
  tapTestMode: z.boolean().optional(),
  tapPublicKey: z.string().max(200).optional().nullable(),
  tapSecretKey: z.string().max(200).optional().nullable(),
  codEnabled: z.boolean().optional(),
}).strip();

/** Fields that must NEVER be returned to non-admin callers */
const SENSITIVE_FIELDS = ["tapSecretKey"] as const;

export async function GET() {
  try {
    let settings = await db.query.storeSettings.findFirst();
    if (!settings) {
      const [created] = await db.insert(storeSettings).values({ id: "default", storeName: "ShopFlow" }).returning();
      settings = created;
    }

    // Check if the caller is an admin — only admins see secret keys
    const session = await auth();
    const isAdmin = session?.user?.role === "ADMIN";

    if (!isAdmin) {
      // Strip sensitive fields for non-admin (storefront) callers
      const sanitized = { ...settings } as Record<string, unknown>;
      for (const field of SENSITIVE_FIELDS) {
        delete sanitized[field];
      }
      return NextResponse.json(serializeDecimal(sanitized));
    }

    // Admin gets settings with secret keys masked (last 4 chars only)
    const adminSafe = { ...settings } as Record<string, unknown>;
    if (typeof adminSafe.tapSecretKey === "string" && adminSafe.tapSecretKey) {
      const key = adminSafe.tapSecretKey as string;
      adminSafe.tapSecretKey = key.length > 4 ? `sk_****${key.slice(-4)}` : "sk_****";
    }
    return NextResponse.json(serializeDecimal(adminSafe));
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, createdAt, updatedAt, ...rawData } = body;
    const parsed = settingsSchema.safeParse(rawData);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }
    const data = parsed.data;

    // Protect against overwriting secret key with its masked version
    if (
      typeof data.tapSecretKey === "string" &&
      data.tapSecretKey.startsWith("sk_****")
    ) {
      delete (data as Record<string, unknown>).tapSecretKey;
    }

    let settings = await db.query.storeSettings.findFirst();
    if (settings) {
      const [updated] = await db.update(storeSettings).set(data).where(eq(storeSettings.id, settings.id)).returning();
      settings = updated;
    } else {
      const [created] = await db.insert(storeSettings).values({ id: "default", ...data }).returning();
      settings = created;
    }

    audit({
      action: "SETTINGS_UPDATE",
      userId: session.user.id,
      email: session.user.email || undefined,
      ip: auditMeta(req).ip,
      resource: "settings",
      resourceId: settings.id,
      details: { updatedFields: Object.keys(data) },
      success: true,
    });

    // Mask sensitive fields before returning
    const safeSettings = { ...settings } as Record<string, unknown>;
    if (typeof safeSettings.tapSecretKey === "string" && safeSettings.tapSecretKey) {
      const key = safeSettings.tapSecretKey as string;
      safeSettings.tapSecretKey = key.length > 4 ? `sk_****${key.slice(-4)}` : "sk_****";
    }
    return NextResponse.json(serializeDecimal(safeSettings));
  } catch (error) {
    console.error("Settings PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
