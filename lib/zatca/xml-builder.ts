/**
 * ZATCA UBL 2.1 Simplified Tax Invoice XML Builder
 *
 * Generates ZATCA Phase 2 compliant XML invoices for B2C (simplified) invoices.
 * Following ZATCA E-Invoice XML Implementation Standard v1.3
 *
 * References:
 * - ZATCA E-Invoicing Developer Portal
 * - UBL 2.1 (ISO/IEC 19845:2015)
 * - Saudi e-Invoice XML Standard (CIUS-SA)
 */

import { createHash } from "crypto";

export interface ZatcaInvoiceLineItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
  lineTotal: number;
  taxPercent: number;
}

export interface ZatcaInvoiceInput {
  invoiceNumber: string;
  uuid: string;
  issueDate: string;        // YYYY-MM-DD
  issueTime: string;        // HH:mm:ss
  invoiceTypeCode: "388" | "381" | "383"; // 388=Invoice, 381=Credit Note, 383=Debit Note
  invoiceSubType: "0200000"; // Simplified (B2C)
  // Seller
  sellerName: string;
  sellerVatNumber: string;
  sellerStreet: string;
  sellerBuildingNumber: string;
  sellerCity: string;
  sellerPostalCode: string;
  sellerDistrict: string;
  sellerCountry: string;
  sellerCRN: string;
  // Buyer (minimal for simplified)
  buyerName?: string;
  // Amounts
  currency: string;
  lineItems: ZatcaInvoiceLineItem[];
  totalWithoutVat: number;
  totalVat: number;
  totalWithVat: number;
  discountAmount: number;
  // Chaining
  previousInvoiceHash: string;
  invoiceCounter: number;
  // Credit Note / Debit Note — reference to original invoice
  billingReferenceId?: string; // Original invoice number (required for 381/383)
  // Payment means code (10=Cash, 30=Credit, 42=Bank transfer, 48=Card)
  paymentMeansCode?: string;
  // Credit note instruction note (reason for credit note - required by ZATCA for 381)
  instructionNote?: string;
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Build the UBL 2.1 XML string for a ZATCA simplified tax invoice or credit note
 */
export function buildZatcaXml(input: ZatcaInvoiceInput): string {
  const isCreditNote = input.invoiceTypeCode === "381";
  const isDebitNote = input.invoiceTypeCode === "383";
  const quantityTag = isCreditNote ? "CreditedQuantity" : isDebitNote ? "DebitedQuantity" : "InvoicedQuantity";
  const lineTag = isCreditNote ? "CreditNoteLine" : isDebitNote ? "DebitNoteLine" : "InvoiceLine";
  const rootTag = isCreditNote ? "CreditNote" : isDebitNote ? "DebitNote" : "Invoice";
  const rootNs = isCreditNote
    ? "urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2"
    : isDebitNote
      ? "urn:oasis:names:specification:ubl:schema:xsd:DebitNote-2"
      : "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2";
  const typeCodeTag = isCreditNote ? "CreditNoteTypeCode" : isDebitNote ? "DebitNoteTypeCode" : "InvoiceTypeCode";
  const paymentMeansCode = input.paymentMeansCode || "10"; // Default cash

  const lines = input.lineItems.map((item, idx) => `
    <cac:${lineTag}>
      <cbc:ID>${idx + 1}</cbc:ID>
      <cbc:${quantityTag} unitCode="PCE">${item.quantity}</cbc:${quantityTag}>
      <cbc:LineExtensionAmount currencyID="${input.currency}">${item.lineTotal.toFixed(2)}</cbc:LineExtensionAmount>
      <cac:TaxTotal>
        <cbc:TaxAmount currencyID="${input.currency}">${item.taxAmount.toFixed(2)}</cbc:TaxAmount>
        <cbc:RoundingAmount currencyID="${input.currency}">${(item.lineTotal + item.taxAmount).toFixed(2)}</cbc:RoundingAmount>
      </cac:TaxTotal>
      <cac:Item>
        <cbc:Name>${escapeXml(item.name)}</cbc:Name>
        <cac:ClassifiedTaxCategory>
          <cbc:ID>S</cbc:ID>
          <cbc:Percent>${item.taxPercent.toFixed(2)}</cbc:Percent>
          <cac:TaxScheme>
            <cbc:ID>VAT</cbc:ID>
          </cac:TaxScheme>
        </cac:ClassifiedTaxCategory>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="${input.currency}">${item.unitPrice.toFixed(2)}</cbc:PriceAmount>
      </cac:Price>
    </cac:${lineTag}>`).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<${rootTag} xmlns="${rootNs}"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
  <cbc:ID>${escapeXml(input.invoiceNumber)}</cbc:ID>
  <cbc:UUID>${escapeXml(input.uuid)}</cbc:UUID>
  <cbc:IssueDate>${input.issueDate}</cbc:IssueDate>
  <cbc:IssueTime>${input.issueTime}</cbc:IssueTime>
  <cbc:${typeCodeTag} name="${input.invoiceSubType}">${input.invoiceTypeCode}</cbc:${typeCodeTag}>
  <cbc:DocumentCurrencyCode>${input.currency}</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>${input.currency}</cbc:TaxCurrencyCode>${input.instructionNote ? `
  <cbc:Note>${escapeXml(input.instructionNote)}</cbc:Note>` : ""}
  <cac:AdditionalDocumentReference>
    <cbc:ID>ICV</cbc:ID>
    <cbc:UUID>${input.invoiceCounter}</cbc:UUID>
  </cac:AdditionalDocumentReference>
  <cac:AdditionalDocumentReference>
    <cbc:ID>PIH</cbc:ID>
    <cac:Attachment>
      <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${input.previousInvoiceHash}</cbc:EmbeddedDocumentBinaryObject>
    </cac:Attachment>
  </cac:AdditionalDocumentReference>${input.billingReferenceId ? `
  <cac:BillingReference>
    <cac:InvoiceDocumentReference>
      <cbc:ID>${escapeXml(input.billingReferenceId)}</cbc:ID>
    </cac:InvoiceDocumentReference>
  </cac:BillingReference>` : ""}
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="CRN">${escapeXml(input.sellerCRN)}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(input.sellerStreet)}</cbc:StreetName>
        <cbc:BuildingNumber>${escapeXml(input.sellerBuildingNumber)}</cbc:BuildingNumber>
        <cbc:CityName>${escapeXml(input.sellerCity)}</cbc:CityName>
        <cbc:PostalZone>${escapeXml(input.sellerPostalCode)}</cbc:PostalZone>
        <cbc:CitySubdivisionName>${escapeXml(input.sellerDistrict)}</cbc:CitySubdivisionName>
        <cac:Country>
          <cbc:IdentificationCode>${escapeXml(input.sellerCountry)}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(input.sellerVatNumber)}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(input.sellerName)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(input.buyerName || "Customer")}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>${paymentMeansCode}</cbc:PaymentMeansCode>
  </cac:PaymentMeans>${input.discountAmount > 0 ? `
  <cac:AllowanceCharge>
    <cbc:ChargeIndicator>false</cbc:ChargeIndicator>
    <cbc:AllowanceChargeReason>Discount</cbc:AllowanceChargeReason>
    <cbc:Amount currencyID="${input.currency}">${input.discountAmount.toFixed(2)}</cbc:Amount>
    <cac:TaxCategory>
      <cbc:ID>S</cbc:ID>
      <cbc:Percent>${(input.lineItems[0]?.taxPercent ?? 15).toFixed(2)}</cbc:Percent>
      <cac:TaxScheme>
        <cbc:ID>VAT</cbc:ID>
      </cac:TaxScheme>
    </cac:TaxCategory>
  </cac:AllowanceCharge>` : ""}
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${input.currency}">${input.totalVat.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${input.currency}">${input.totalWithoutVat.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${input.currency}">${input.totalVat.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${(input.lineItems[0]?.taxPercent ?? 15).toFixed(2)}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${input.currency}">${input.totalVat.toFixed(2)}</cbc:TaxAmount>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${input.currency}">${input.totalWithoutVat.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${input.currency}">${input.totalWithoutVat.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${input.currency}">${input.totalWithVat.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:AllowanceTotalAmount currencyID="${input.currency}">${input.discountAmount.toFixed(2)}</cbc:AllowanceTotalAmount>
    <cbc:PayableAmount currencyID="${input.currency}">${input.totalWithVat.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>${lines}
</${rootTag}>`;

  return xml;
}

/**
 * Compute SHA-256 hash of the XML invoice, returned as Base64
 */
export function hashInvoiceXml(xml: string): string {
  return createHash("sha256").update(xml, "utf-8").digest("base64");
}

/**
 * Generate a UUID v4 for the invoice
 */
export function generateInvoiceUUID(): string {
  const hex = [...Array(32)]
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${(8 + Math.floor(Math.random() * 4)).toString(16)}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
