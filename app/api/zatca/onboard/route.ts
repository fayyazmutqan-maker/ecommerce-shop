/**
 * ZATCA Onboarding API
 *
 * POST /api/zatca/onboard
 * 
 * Handles the full ZATCA e-invoicing onboarding flow:
 * - Step 1: Generate CSR and get Compliance CSID
 * - Step 2: Run a compliance invoice check
 * - Step 3: Exchange compliance CSID for Production CSID
 *
 * Each step is triggered via a "step" field in the request body.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { storeSettings } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { audit, auditMeta } from "@/lib/audit";
import { zatcaOnboardLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import {
  getComplianceCsid,
  checkInvoiceCompliance,
  getProductionCsid,
  type ZatcaEnvironment,
} from "@/lib/zatca/api-client";
import { buildZatcaXml, hashInvoiceXml, generateInvoiceUUID } from "@/lib/zatca/xml-builder";

const stepSchema = z.discriminatedUnion("step", [
  z.object({
    step: z.literal("compliance-csid"),
    csr: z.string().min(1, "CSR is required"),
    otp: z.string().min(1, "OTP is required"),
  }),
  z.object({
    step: z.literal("compliance-check"),
  }),
  z.object({
    step: z.literal("production-csid"),
    requestId: z.string().min(1, "Compliance request ID is required"),
  }),
]);

export async function POST(req: Request) {
  try {
    // Rate limit: 3 onboarding attempts per 5 minutes
    const ip = getClientIp(req);
    const rlResponse = await rateLimitResponse(zatcaOnboardLimiter, ip);
    if (rlResponse) return rlResponse;

    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = stepSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const settings = await db.query.storeSettings.findFirst();
    if (!settings) {
      return NextResponse.json({ error: "Store settings not found" }, { status: 404 });
    }

    const environment = (settings.zatcaEnvironment || "sandbox") as ZatcaEnvironment;

    // ── Step 1: Get Compliance CSID ────────────────────
    if (data.step === "compliance-csid") {
      const result = await getComplianceCsid(environment, data.csr, data.otp);

      // Save compliance CSID and secret to DB
      await db.update(storeSettings).set({
        zatcaCsid: result.binarySecurityToken,
        zatcaSecret: result.secret,
        // Store the request ID — needed for production CSID exchange
        zatcaPcsid: null,
        zatcaPcsidSecret: null,
      }).where(eq(storeSettings.id, settings.id));

      audit({
        action: "ZATCA_ONBOARD",
        userId: session.user.id,
        email: session.user.email || undefined,
        ip: auditMeta(req).ip,
        resource: "zatca",
        resourceId: "compliance-csid",
        details: {
          step: "compliance-csid",
          environment,
          requestId: result.requestID,
          disposition: result.dispositionMessage,
        },
        success: true,
      });

      return NextResponse.json({
        success: true,
        requestId: result.requestID,
        disposition: result.dispositionMessage,
        warnings: result.warnings,
      });
    }

    // ── Step 2: Compliance Invoice Check ───────────────
    if (data.step === "compliance-check") {
      if (!settings.zatcaCsid || !settings.zatcaSecret) {
        return NextResponse.json(
          { error: "No compliance CSID found. Complete Step 1 first." },
          { status: 400 },
        );
      }

      if (!settings.vatNumber || !settings.commercialRegNo) {
        return NextResponse.json(
          { error: "VAT number and Commercial Registration Number are required" },
          { status: 400 },
        );
      }

      // Build a sample invoice for compliance check
      const uuid = generateInvoiceUUID();
      const now = new Date();
      const xml = buildZatcaXml({
        invoiceNumber: "COMP-CHECK-001",
        uuid,
        issueDate: now.toISOString().slice(0, 10),
        issueTime: now.toISOString().slice(11, 19),
        invoiceTypeCode: "388",
        invoiceSubType: "0200000",
        sellerName: settings.storeName || "Store",
        sellerVatNumber: settings.vatNumber,
        sellerStreet: "Main Street",
        sellerBuildingNumber: "1234",
        sellerCity: "Riyadh",
        sellerPostalCode: "12345",
        sellerDistrict: "District",
        sellerCountry: "SA",
        sellerCRN: settings.commercialRegNo,
        buyerName: "Test Customer",
        currency: settings.currency || "SAR",
        lineItems: [{
          id: "1",
          name: "Compliance Test Item",
          quantity: 1,
          unitPrice: 100,
          taxAmount: 15,
          lineTotal: 100,
          taxPercent: 15,
        }],
        totalWithoutVat: 100,
        totalVat: 15,
        totalWithVat: 115,
        discountAmount: 0,
        previousInvoiceHash: settings.zatcaPreviousHash || "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==",
        invoiceCounter: 0,
      });

      const invoiceHash = hashInvoiceXml(xml);
      const invoiceXmlBase64 = Buffer.from(xml, "utf-8").toString("base64");

      const result = await checkInvoiceCompliance(
        environment,
        settings.zatcaCsid,
        settings.zatcaSecret,
        invoiceXmlBase64,
        invoiceHash,
        uuid,
      );

      audit({
        action: "ZATCA_ONBOARD",
        userId: session.user.id,
        email: session.user.email || undefined,
        ip: auditMeta(req).ip,
        resource: "zatca",
        resourceId: "compliance-check",
        details: {
          step: "compliance-check",
          environment,
          status: result.validationResults.status,
        },
        success: result.validationResults.status === "PASS" || result.validationResults.status === "WARNING",
      });

      return NextResponse.json({
        success: result.validationResults.status === "PASS" || result.validationResults.status === "WARNING",
        validationStatus: result.validationResults.status,
        reportingStatus: result.reportingStatus,
        clearanceStatus: result.clearanceStatus,
        info: result.validationResults.infoMessages,
        warnings: result.validationResults.warningMessages,
        errors: result.validationResults.errorMessages,
      });
    }

    // ── Step 3: Get Production CSID ───────────────────
    if (data.step === "production-csid") {
      if (!settings.zatcaCsid || !settings.zatcaSecret) {
        return NextResponse.json(
          { error: "No compliance CSID found. Complete Steps 1 and 2 first." },
          { status: 400 },
        );
      }

      const result = await getProductionCsid(
        environment,
        settings.zatcaCsid,
        settings.zatcaSecret,
        data.requestId,
      );

      // Save production CSID and secret
      await db.update(storeSettings).set({
        zatcaPcsid: result.binarySecurityToken,
        zatcaPcsidSecret: result.secret,
      }).where(eq(storeSettings.id, settings.id));

      audit({
        action: "ZATCA_ONBOARD",
        userId: session.user.id,
        email: session.user.email || undefined,
        ip: auditMeta(req).ip,
        resource: "zatca",
        resourceId: "production-csid",
        details: {
          step: "production-csid",
          environment,
          requestId: result.requestID,
          disposition: result.dispositionMessage,
        },
        success: true,
      });

      return NextResponse.json({
        success: true,
        requestId: result.requestID,
        disposition: result.dispositionMessage,
        warnings: result.warnings,
      });
    }

    return NextResponse.json({ error: "Invalid step" }, { status: 400 });
  } catch (error) {
    console.error("ZATCA onboarding error:", error);
    const message = error instanceof Error ? error.message : "ZATCA onboarding failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
