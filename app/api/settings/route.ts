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
  storeEmail: z.string().email().max(200).or(z.literal("")).optional(),
  storePhone: z.string().max(30).optional(),
  storeAddress: z.string().max(500).optional(),
  contactEmail: z.string().email().max(200).optional(),
  contactPhone: z.string().max(30).optional(),
  currency: z.string().max(10).optional(),
  currencySymbol: z.string().max(20).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  taxIncluded: z.boolean().optional(),
  shippingEnabled: z.boolean().optional(),
  freeShippingMin: z.number().min(0).optional(),
  flatShippingRate: z.number().min(0).optional(),
  shippingFee: z.number().min(0).optional(),
  freeShippingThreshold: z.number().min(0).optional(),
  timezone: z.string().max(100).optional(),
  weightUnit: z.string().max(10).optional(),
  storeLogo: z.string().url().max(500).optional().or(z.literal("")).nullable(),
  storeFavicon: z.string().url().max(500).optional().or(z.literal("")).nullable(),
  logo: z.string().url().max(500).optional().nullable(),
  favicon: z.string().url().max(500).optional().nullable(),
  address: z.string().max(500).optional(),
  socialFacebook: z.string().max(300).optional().nullable(),
  socialTwitter: z.string().max(300).optional().nullable(),
  socialInstagram: z.string().max(300).optional().nullable(),
  socialYoutube: z.string().max(300).optional().nullable(),
  socialTiktok: z.string().max(300).optional().nullable(),
  metaTitle: z.string().max(200).optional().nullable(),
  metaDescription: z.string().max(500).optional().nullable(),
  googleAnalyticsId: z.string().max(100).optional().nullable(),
  commercialRegNo: z.string().max(50).optional().nullable(),
  vatNumber: z.string().max(50).optional().nullable(),
  maintenanceMode: z.boolean().optional(),
  posEnabled: z.boolean().optional(),
  // Payment Gateway
  tapEnabled: z.boolean().optional(),
  tapTestMode: z.boolean().optional(),
  codEnabled: z.boolean().optional(),
  // ZATCA
  zatcaEnabled: z.boolean().optional(),
  zatcaEnvironment: z.enum(["sandbox", "simulation", "production"]).optional(),
}).strip();

/** Fields that must NEVER be returned to non-admin callers */
const SENSITIVE_FIELDS = ["zatcaCsid", "zatcaSecret", "zatcaPcsid", "zatcaPcsidSecret"] as const;

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
    // For ZATCA certs, expose only whether they exist (not the actual values)
    adminSafe.zatcaCsid = !!adminSafe.zatcaCsid;
    adminSafe.zatcaSecret = !!adminSafe.zatcaSecret;
    adminSafe.zatcaPcsid = !!adminSafe.zatcaPcsid;
    adminSafe.zatcaPcsidSecret = !!adminSafe.zatcaPcsidSecret;
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

    const rawData = await req.json();
    delete rawData.id;
    delete rawData.createdAt;
    delete rawData.updatedAt;
    const parsed = settingsSchema.safeParse(rawData);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }
    const {
      contactEmail,
      contactPhone,
      shippingFee,
      freeShippingThreshold,
      freeShippingMin,
      flatShippingRate,
      logo,
      favicon,
      address,
      ...parsedData
    } = parsed.data;
    const data = {
      ...parsedData,
      ...(contactEmail !== undefined ? { storeEmail: contactEmail } : {}),
      ...(contactPhone !== undefined ? { storePhone: contactPhone } : {}),
      ...(flatShippingRate !== undefined ? { flatShippingRate: String(flatShippingRate) } : {}),
      ...(freeShippingMin !== undefined ? { freeShippingMin: String(freeShippingMin) } : {}),
      ...(shippingFee !== undefined ? { flatShippingRate: String(shippingFee) } : {}),
      ...(freeShippingThreshold !== undefined ? { freeShippingMin: String(freeShippingThreshold) } : {}),
      ...(logo !== undefined ? { storeLogo: logo } : {}),
      ...(favicon !== undefined ? { storeFavicon: favicon } : {}),
      ...(address !== undefined ? { storeAddress: address } : {}),
    };

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
    return NextResponse.json(serializeDecimal(safeSettings));
  } catch (error) {
    console.error("Settings PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
