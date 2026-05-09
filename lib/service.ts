/**
 * ZATCA E-Invoicing Service
 *
 * High-level service that coordinates:
 * - Building UBL 2.1 XML invoices from orders
 * - Hashing and encoding for ZATCA submission
 * - Reporting simplified invoices (B2C) to ZATCA
 * - Maintaining invoice counter and hash chain atomically
 * - Updating order ZATCA status in the database
 */

import { db } from "@/lib/db";
import { orders as ordersTable, storeSettings, refunds as refundsTable } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { toNumber, serializeDecimal } from "@/lib/decimal";
import { generateZatcaQR } from "@/lib/pos/zatca";
import {
  buildZatcaXml,
  hashInvoiceXml,
  generateInvoiceUUID,
  type ZatcaInvoiceLineItem,
} from "./xml-builder";
import {
  reportSimplifiedInvoice,
  type ZatcaEnvironment,
  type ZatcaReportingResponse,
} from "./api-client";

export interface ZatcaReportResult {
  success: boolean;
  status: "REPORTED" | "FAILED" | "NOT_APPLICABLE" | "SKIPPED";
  invoiceHash?: string;
  requestId?: string;
  qrCode?: string;
  errors?: string[];
  warnings?: string[];
}

/**
 * Load ZATCA configuration from store settings
 */
async function loadZatcaConfig() {
  const settings = await db.query.storeSettings.findFirst();
  if (!settings) return null;
  return {
    enabled: settings.zatcaEnabled,
    vatNumber: settings.vatNumber || "",
    commercialRegNo: settings.commercialRegNo || "",
    storeName: settings.storeName || "Store",
    storeAddress: settings.storeAddress || "",
    storePhone: settings.storePhone || "",
    currency: settings.currency || "SAR",
    taxRate: settings.taxRate ?? 0.15,
    environment: (settings.zatcaEnvironment || "sandbox") as ZatcaEnvironment,
    csid: settings.zatcaPcsid || settings.zatcaCsid || "",
    secret: settings.zatcaPcsidSecret || settings.zatcaSecret || "",
    invoiceCounter: settings.zatcaInvoiceCounter || 0,
    previousHash: settings.zatcaPreviousHash || "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==",
  };
}

/**
 * Parse a store address string into structured components.
 * Expected format: "Street, Building, District, City, PostalCode"
 * Falls back to safe defaults.
 */
function parseAddress(address: string) {
  const parts = address.split(",").map((s) => s.trim());
  return {
    street: parts[0] || "Main Street",
    buildingNumber: parts[1] || "0000",
    district: parts[2] || "District",
    city: parts[3] || "Riyadh",
    postalCode: parts[4] || "00000",
  };
}

/**
 * Atomically claim the next invoice counter slot and capture the current
 * previousHash in a single UPDATE … RETURNING statement.
 *
 * This eliminates the race condition where two concurrent orders could both
 * read the same previousHash before either wrote their new hash back,
 * breaking the ZATCA invoice chain integrity.
 *
 * The counter is incremented and the previous hash is read in one atomic
 * DB operation. The caller is responsible for writing the new hash back
 * after a successful (or failed) ZATCA API call.
 */
async function claimInvoiceSlot(): Promise<{
  invoiceCounter: number;
  previousHash: string;
}> {
  const [updated] = await db
    .update(storeSettings)
    .set({
      zatcaInvoiceCounter: sql`${storeSettings.zatcaInvoiceCounter} + 1`,
    })
    .returning({
      counter: storeSettings.zatcaInvoiceCounter,
      prevHash: storeSettings.zatcaPreviousHash,
    });

  if (!updated) {
    throw new Error("Failed to claim invoice slot: storeSettings row not found");
  }

  return {
    invoiceCounter: updated.counter,
    previousHash: updated.prevHash,
  };
}

/**
 * Write the new invoice hash back to storeSettings so the next invoice
 * in the chain uses it as previousHash.
 * Called after both successful and failed ZATCA API submissions —
 * the hash chain must always advance once a slot is claimed.
 */
async function commitInvoiceHash(newHash: string): Promise<void> {
  await db.update(storeSettings).set({ zatcaPreviousHash: newHash });
}

/**
 * Report a simplified invoice (B2C) to ZATCA for a given order.
 *
 * This function:
 * 1. Loads store settings and ZATCA config
 * 2. Fetches the order with items
 * 3. Atomically claims the next invoice counter slot + previousHash
 * 4. Builds the UBL 2.1 XML
 * 5. Hashes and encodes the XML
 * 6. Generates the ZATCA QR code
 * 7. Reports to ZATCA API
 * 8. Commits the new hash to maintain chain integrity
 * 9. Updates the order with the ZATCA status
 */
export async function reportOrderToZatca(orderId: string): Promise<ZatcaReportResult> {
  try {
    // 1. Load config
    const config = await loadZatcaConfig();
    if (!config || !config.enabled) {
      await db.update(ordersTable).set({ zatcaStatus: "NOT_APPLICABLE" }).where(eq(ordersTable.id, orderId));
      return { success: true, status: "NOT_APPLICABLE" };
    }

    if (!config.vatNumber || !config.csid || !config.secret) {
      return { success: true, status: "SKIPPED", errors: ["ZATCA not fully configured — missing CSID or VAT number"] };
    }

    // 2. Fetch order
    const order = await db.query.orders.findFirst({
      where: eq(ordersTable.id, orderId),
      with: {
        items: true,
        shippingAddress: true,
        billingAddress: true,
        user: { columns: { name: true } },
      },
    });

    if (!order) {
      return { success: false, status: "FAILED", errors: ["Order not found"] };
    }

    const o = serializeDecimal(order);
    const taxRate = config.taxRate * 100; // e.g. 15

    // 3. Atomically claim invoice slot — counter + previousHash in one DB op.
    //    No two concurrent orders can get the same slot.
    const { invoiceCounter, previousHash } = await claimInvoiceSlot();

    // 4. Build line items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lineItems: ZatcaInvoiceLineItem[] = o.items.map((item: any) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unitPrice: toNumber(item.price),
      taxAmount: toNumber(item.taxAmount),
      lineTotal: toNumber(item.totalPrice),
      taxPercent: taxRate,
    }));

    // 5. Build XML
    const now = new Date(o.createdAt);
    const uuid = generateInvoiceUUID();
    const addr = parseAddress(config.storeAddress);
    const buyerName = o.user?.name || (o.shippingAddress ? `${o.shippingAddress.firstName} ${o.shippingAddress.lastName}` : "Customer");

    const pm = (o.paymentMethod || "cash").toLowerCase();
    const paymentMeansCode = pm.includes("card") || pm.includes("tap") ? "48"
      : pm.includes("transfer") || pm.includes("bank") ? "42"
      : "10";

    const xml = buildZatcaXml({
      invoiceNumber: o.orderNumber,
      uuid,
      issueDate: now.toISOString().slice(0, 10),
      issueTime: now.toISOString().slice(11, 19),
      invoiceTypeCode: "388",
      invoiceSubType: "0200000",
      sellerName: config.storeName,
      sellerVatNumber: config.vatNumber,
      sellerStreet: addr.street,
      sellerBuildingNumber: addr.buildingNumber,
      sellerCity: addr.city,
      sellerPostalCode: addr.postalCode,
      sellerDistrict: addr.district,
      sellerCountry: "SA",
      sellerCRN: config.commercialRegNo || "0000000000",
      buyerName,
      currency: config.currency,
      lineItems,
      totalWithoutVat: toNumber(o.subtotal) - toNumber(o.discountAmount),
      totalVat: toNumber(o.taxAmount),
      totalWithVat: toNumber(o.totalAmount),
      discountAmount: toNumber(o.discountAmount),
      previousInvoiceHash: previousHash,
      invoiceCounter,
      paymentMeansCode,
    });

    // 6. Hash the XML
    const invoiceHash = hashInvoiceXml(xml);
    const invoiceXmlBase64 = Buffer.from(xml, "utf-8").toString("base64");

    // 7. Generate ZATCA QR code
    const qrCode = generateZatcaQR({
      sellerName: config.storeName,
      vatNumber: config.vatNumber,
      timestamp: now,
      totalWithVat: toNumber(o.totalAmount),
      vatAmount: toNumber(o.taxAmount),
    });

    // 8. Report to ZATCA — always commit hash regardless of API outcome
    let response: ZatcaReportingResponse;
    try {
      response = await reportSimplifiedInvoice(
        config.environment,
        config.csid,
        config.secret,
        invoiceXmlBase64,
        invoiceHash,
        uuid,
      );
    } catch (apiError) {
      const errorMsg = apiError instanceof Error ? apiError.message : "ZATCA API call failed";

      // Commit hash even on API failure — chain integrity must be maintained
      await commitInvoiceHash(invoiceHash);

      await db.update(ordersTable).set({
        zatcaStatus: "FAILED",
        zatcaInvoiceHash: invoiceHash,
      }).where(eq(ordersTable.id, orderId));

      return { success: false, status: "FAILED", invoiceHash, qrCode, errors: [errorMsg] };
    }

    // 9. Commit hash and update order
    await commitInvoiceHash(invoiceHash);

    const reported = response.reportingStatus === "REPORTED";
    await db.update(ordersTable).set({
      zatcaStatus: reported ? "REPORTED" : "FAILED",
      zatcaReportedAt: reported ? new Date() : null,
      zatcaInvoiceHash: invoiceHash,
      zatcaRequestId: uuid,
    }).where(eq(ordersTable.id, orderId));

    const warnings = [
      ...(response.validationResults.warningMessages?.map((m) => m.message) || []),
      ...(response.warnings?.map((w) => w.message) || []),
    ];
    const errors = [
      ...(response.validationResults.errorMessages?.map((m) => m.message) || []),
      ...(response.errors?.map((e) => e.message) || []),
    ];

    return {
      success: reported,
      status: reported ? "REPORTED" : "FAILED",
      invoiceHash,
      requestId: uuid,
      qrCode,
      warnings: warnings.length > 0 ? warnings : undefined,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("ZATCA reporting error:", msg);

    try {
      await db.update(ordersTable).set({ zatcaStatus: "FAILED" }).where(eq(ordersTable.id, orderId));
    } catch {
      // db update failed too — just log
    }

    return { success: false, status: "FAILED", errors: [msg] };
  }
}

/**
 * Report a Credit Note (refund) to ZATCA.
 *
 * ZATCA requires that when a refund is issued against a reported invoice,
 * a Credit Note (type code 381) must be reported referencing the original invoice.
 *
 * Uses the same atomic claimInvoiceSlot / commitInvoiceHash pattern to
 * prevent hash-chain race conditions.
 */
export async function reportCreditNoteToZatca(refundId: string): Promise<ZatcaReportResult> {
  try {
    const config = await loadZatcaConfig();
    if (!config || !config.enabled) {
      await db.update(refundsTable).set({ zatcaStatus: "NOT_APPLICABLE" }).where(eq(refundsTable.id, refundId));
      return { success: true, status: "NOT_APPLICABLE" };
    }

    if (!config.vatNumber || !config.csid || !config.secret) {
      return { success: true, status: "SKIPPED", errors: ["ZATCA not fully configured"] };
    }

    // Fetch refund with items and parent order
    const refund = await db.query.refunds.findFirst({
      where: eq(refundsTable.id, refundId),
      with: {
        items: {
          with: { orderItem: true },
        },
        order: {
          with: {
            user: { columns: { name: true } },
            shippingAddress: true,
          },
        },
      },
    });

    if (!refund) {
      return { success: false, status: "FAILED", errors: ["Refund not found"] };
    }

    // Only report if the original order was reported to ZATCA
    if (refund.order.zatcaStatus !== "REPORTED" && refund.order.zatcaStatus !== "CLEARED") {
      await db.update(refundsTable).set({ zatcaStatus: "NOT_APPLICABLE" }).where(eq(refundsTable.id, refundId));
      return { success: true, status: "NOT_APPLICABLE" };
    }

    const r = serializeDecimal(refund);
    const taxRate = config.taxRate * 100;

    // Atomically claim invoice slot
    const { invoiceCounter, previousHash } = await claimInvoiceSlot();

    // Build credit note line items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lineItems: ZatcaInvoiceLineItem[] = r.items.map((item: any) => {
      const unitPrice = toNumber(item.orderItem.price);
      const totalInclVat = toNumber(item.amount);
      const lineTotal = totalInclVat / (1 + config.taxRate);
      const taxAmount = totalInclVat - lineTotal;
      return {
        id: item.id,
        name: item.orderItem.name,
        quantity: item.quantity,
        unitPrice,
        taxAmount: Math.round(taxAmount * 100) / 100,
        lineTotal: Math.round(lineTotal * 100) / 100,
        taxPercent: taxRate,
      };
    });

    const totalWithVat = toNumber(r.amount);
    const totalWithoutVat = Math.round((totalWithVat / (1 + config.taxRate)) * 100) / 100;
    const totalVat = Math.round((totalWithVat - totalWithoutVat) * 100) / 100;

    const creditNoteNumber = `CN-${r.order.orderNumber}-${refundId.slice(-6)}`;

    const paymentMethod = r.order.paymentMethod || "cash";
    const paymentMeansCode = paymentMethod.toLowerCase().includes("card") || paymentMethod.toLowerCase().includes("tap") ? "48"
      : paymentMethod.toLowerCase().includes("transfer") || paymentMethod.toLowerCase().includes("bank") ? "42"
      : "10";

    const now = new Date();
    const uuid = generateInvoiceUUID();
    const addr = parseAddress(config.storeAddress);
    const buyerName = r.order.user?.name || (r.order.shippingAddress ? `${r.order.shippingAddress.firstName} ${r.order.shippingAddress.lastName}` : "Customer");

    const xml = buildZatcaXml({
      invoiceNumber: creditNoteNumber,
      uuid,
      issueDate: now.toISOString().slice(0, 10),
      issueTime: now.toISOString().slice(11, 19),
      invoiceTypeCode: "381",
      invoiceSubType: "0200000",
      sellerName: config.storeName,
      sellerVatNumber: config.vatNumber,
      sellerStreet: addr.street,
      sellerBuildingNumber: addr.buildingNumber,
      sellerCity: addr.city,
      sellerPostalCode: addr.postalCode,
      sellerDistrict: addr.district,
      sellerCountry: "SA",
      sellerCRN: config.commercialRegNo || "0000000000",
      buyerName,
      currency: config.currency,
      lineItems,
      totalWithoutVat,
      totalVat,
      totalWithVat,
      discountAmount: 0,
      previousInvoiceHash: previousHash,
      invoiceCounter,
      billingReferenceId: r.order.orderNumber,
      paymentMeansCode,
      instructionNote: r.reason || "Refund",
    });

    const invoiceHash = hashInvoiceXml(xml);
    const invoiceXmlBase64 = Buffer.from(xml, "utf-8").toString("base64");

    const qrCode = generateZatcaQR({
      sellerName: config.storeName,
      vatNumber: config.vatNumber,
      timestamp: now,
      totalWithVat,
      vatAmount: totalVat,
    });

    let response: ZatcaReportingResponse;
    try {
      response = await reportSimplifiedInvoice(
        config.environment,
        config.csid,
        config.secret,
        invoiceXmlBase64,
        invoiceHash,
        uuid,
      );
    } catch (apiError) {
      const errorMsg = apiError instanceof Error ? apiError.message : "ZATCA API call failed";

      // Always commit hash to maintain chain integrity
      await commitInvoiceHash(invoiceHash);

      await db.update(refundsTable).set({
        zatcaStatus: "FAILED",
        zatcaInvoiceHash: invoiceHash,
        zatcaCreditNoteNumber: creditNoteNumber,
      }).where(eq(refundsTable.id, refundId));

      return { success: false, status: "FAILED", invoiceHash, qrCode, errors: [errorMsg] };
    }

    // Commit hash and update refund
    await commitInvoiceHash(invoiceHash);

    const reported = response.reportingStatus === "REPORTED";
    await db.update(refundsTable).set({
      zatcaStatus: reported ? "REPORTED" : "FAILED",
      zatcaReportedAt: reported ? new Date() : null,
      zatcaInvoiceHash: invoiceHash,
      zatcaCreditNoteNumber: creditNoteNumber,
    }).where(eq(refundsTable.id, refundId));

    const warnings = [
      ...(response.validationResults.warningMessages?.map((m) => m.message) || []),
      ...(response.warnings?.map((w) => w.message) || []),
    ];
    const errors = [
      ...(response.validationResults.errorMessages?.map((m) => m.message) || []),
      ...(response.errors?.map((e) => e.message) || []),
    ];

    return {
      success: reported,
      status: reported ? "REPORTED" : "FAILED",
      invoiceHash,
      requestId: uuid,
      warnings: warnings.length > 0 ? warnings : undefined,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("ZATCA credit note error:", msg);

    try {
      await db.update(refundsTable).set({ zatcaStatus: "FAILED" }).where(eq(refundsTable.id, refundId));
    } catch {
      // ignore
    }

    return { success: false, status: "FAILED", errors: [msg] };
  }
}
