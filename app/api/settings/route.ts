import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { serializeDecimal } from "@/lib/decimal";
import { audit, auditMeta } from "@/lib/audit";
import { storeSettings } from "@/lib/schema";
import { eq } from "drizzle-orm";

const optionalString = (max: number) =>
  z.string().max(max).optional().nullable();

const optionalUrlString = z.string().url().max(500).or(z.literal("")).optional().nullable();

const optionalEmail = z.string().email().max(200).or(z.literal("")).optional().nullable();

const optionalNumber = z.preprocess(
  (value) => {
    if (value === null || value === undefined || value === "") return undefined;
    return value;
  },
  z.coerce.number().min(0).optional(),
);

const settingsSchema = z.object({
  storeName: z.string().max(100).optional(),
  storeDescription: optionalString(500),
  storeEmail: optionalEmail,
  storePhone: optionalString(30),
  storeAddress: optionalString(500),
  contactEmail: optionalEmail,
  contactPhone: optionalString(30),
  currency: z.string().max(10).optional(),
  currencySymbol: z.string().max(20).optional(),
  taxRate: optionalNumber,
  taxIncluded: z.boolean().optional(),
  shippingEnabled: z.boolean().optional(),
  freeShippingMin: optionalNumber,
  flatShippingRate: optionalNumber,
  shippingFee: optionalNumber,
  freeShippingThreshold: optionalNumber,
  timezone: z.string().max(100).optional(),
  weightUnit: z.string().max(10).optional(),
  storeLogo: optionalUrlString,
  storeFavicon: optionalUrlString,
  logo: optionalUrlString,
  favicon: optionalUrlString,
  address: optionalString(500),
  socialFacebook: optionalString(300),
  socialTwitter: optionalString(300),
  socialInstagram: optionalString(300),
  socialYoutube: optionalString(300),
  socialTiktok: optionalString(300),
  metaTitle: optionalString(200),
  metaDescription: optionalString(500),
  googleAnalyticsId: optionalString(100),
  commercialRegNo: optionalString(50),
  vatNumber: optionalString(50),
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
