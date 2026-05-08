/**
 * ZATCA Retry API
 *
 * POST /api/zatca/retry
 *
 * Retries ZATCA reporting for a failed order or credit note (refund).
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { reportOrderToZatca, reportCreditNoteToZatca } from "@/lib/zatca/service";
import { zatcaRetryLimiter, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { db } from "@/lib/db";

const retrySchema = z.object({
  orderId: z.string().min(1).optional(),
  refundId: z.string().min(1).optional(),
}).refine((d) => d.orderId || d.refundId, { message: "orderId or refundId is required" });

async function validateZatcaConfiguration() {
  const settings = await db.query.storeSettings.findFirst({
    columns: {
      zatcaEnabled: true,
      vatNumber: true,
      zatcaCsid: true,
      zatcaSecret: true,
      zatcaPcsid: true,
      zatcaPcsidSecret: true,
    },
  });

  if (!settings?.zatcaEnabled) {
    return "ZATCA is not enabled in tax settings";
  }

  const csid = settings.zatcaPcsid || settings.zatcaCsid;
  const secret = settings.zatcaPcsidSecret || settings.zatcaSecret;

  if (!settings.vatNumber || !csid || !secret) {
    return "ZATCA is not fully configured. VAT number, CSID, and secret are required";
  }

  return null;
}

export async function POST(req: Request) {
  try {
    // Rate limit: 3 retries per 60s per IP
    const ip = getClientIp(req);
    const rlResponse = await rateLimitResponse(zatcaRetryLimiter, ip);
    if (rlResponse) return rlResponse;

    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = retrySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const configurationError = await validateZatcaConfiguration();
    if (configurationError) {
      return NextResponse.json(
        { success: false, status: "FAILED", error: configurationError, errors: [configurationError] },
        { status: 400 },
      );
    }

    const result = parsed.data.refundId
      ? await reportCreditNoteToZatca(parsed.data.refundId)
      : await reportOrderToZatca(parsed.data.orderId!);

    return NextResponse.json({
      success: result.success,
      status: result.status,
      invoiceHash: result.invoiceHash,
      errors: result.errors,
      warnings: result.warnings,
    });
  } catch (error) {
    console.error("ZATCA retry error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to retry ZATCA report" },
      { status: 500 },
    );
  }
}
