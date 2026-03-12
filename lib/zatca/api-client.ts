/**
 * ZATCA Fatoora API Client
 *
 * Handles all communication with ZATCA's e-invoicing platform:
 * - Compliance CSID issuance
 * - Production CSID issuance
 * - Invoice compliance check
 * - Simplified invoice reporting (B2C)
 * - Standard invoice clearance (B2B)
 *
 * API Base URLs:
 *  - Sandbox:    https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal
 *  - Simulation: https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation
 *  - Production: https://gw-fatoora.zatca.gov.sa/e-invoicing/core
 */

const ZATCA_URLS: Record<string, string> = {
  sandbox: "https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal",
  simulation: "https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation",
  production: "https://gw-fatoora.zatca.gov.sa/e-invoicing/core",
};

export type ZatcaEnvironment = "sandbox" | "simulation" | "production";

export interface ZatcaCsidResponse {
  requestID: string;
  dispositionMessage: string;
  binarySecurityToken: string; // Base64-encoded X.509 certificate
  secret: string;
  errors?: ZatcaError[];
  warnings?: ZatcaWarning[];
}

export interface ZatcaReportingResponse {
  reportingStatus: "REPORTED" | "NOT_REPORTED";
  clearanceStatus?: "CLEARED" | "NOT_CLEARED";
  validationResults: {
    status: "PASS" | "WARNING" | "ERROR";
    infoMessages?: ZatcaMessage[];
    warningMessages?: ZatcaMessage[];
    errorMessages?: ZatcaMessage[];
  };
  warnings?: ZatcaWarning[];
  errors?: ZatcaError[];
}

export interface ZatcaComplianceResponse {
  reportingStatus: string;
  clearanceStatus: string;
  validationResults: {
    status: "PASS" | "WARNING" | "ERROR";
    infoMessages?: ZatcaMessage[];
    warningMessages?: ZatcaMessage[];
    errorMessages?: ZatcaMessage[];
  };
  warnings?: ZatcaWarning[];
  errors?: ZatcaError[];
}

interface ZatcaMessage {
  type: string;
  code: string;
  category: string;
  message: string;
  status: string;
}

interface ZatcaError {
  code: string;
  message: string;
}

interface ZatcaWarning {
  code: string;
  message: string;
}

function getBaseUrl(environment: ZatcaEnvironment): string {
  return ZATCA_URLS[environment] || ZATCA_URLS.sandbox;
}

/**
 * Build the Basic Auth header from CSID (certificate) and secret
 */
function buildAuthHeader(csid: string, secret: string): string {
  return `Basic ${Buffer.from(`${csid}:${secret}`).toString("base64")}`;
}

/**
 * Step 1: Get Compliance CSID
 *
 * Sends a CSR (Certificate Signing Request) to ZATCA to get a compliance certificate.
 * The OTP is provided by ZATCA during onboarding.
 */
export async function getComplianceCsid(
  environment: ZatcaEnvironment,
  csr: string,
  otp: string,
): Promise<ZatcaCsidResponse> {
  const baseUrl = getBaseUrl(environment);
  const response = await fetch(`${baseUrl}/compliance`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept-Version": "V2",
      OTP: otp,
    },
    body: JSON.stringify({ csr }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ZATCA Compliance CSID failed (${response.status}): ${text}`);
  }

  return response.json();
}

/**
 * Step 2: Compliance Invoice Check
 *
 * Submit an invoice to verify it's compliant before going to production.
 */
export async function checkInvoiceCompliance(
  environment: ZatcaEnvironment,
  csid: string,
  secret: string,
  invoiceXmlBase64: string,
  invoiceHash: string,
  uuid: string,
): Promise<ZatcaComplianceResponse> {
  const baseUrl = getBaseUrl(environment);
  const response = await fetch(`${baseUrl}/compliance/invoices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept-Version": "V2",
      "Accept-Language": "en",
      Authorization: buildAuthHeader(csid, secret),
    },
    body: JSON.stringify({
      invoiceHash,
      uuid,
      invoice: invoiceXmlBase64,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ZATCA Compliance check failed (${response.status}): ${text}`);
  }

  return response.json();
}

/**
 * Step 3: Get Production CSID
 *
 * Exchange the compliance CSID for a production CSID.
 * Requires the compliance request ID from step 1.
 */
export async function getProductionCsid(
  environment: ZatcaEnvironment,
  csid: string,
  secret: string,
  complianceRequestId: string,
): Promise<ZatcaCsidResponse> {
  const baseUrl = getBaseUrl(environment);
  const response = await fetch(`${baseUrl}/production/csids`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept-Version": "V2",
      Authorization: buildAuthHeader(csid, secret),
    },
    body: JSON.stringify({ compliance_request_id: complianceRequestId }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ZATCA Production CSID failed (${response.status}): ${text}`);
  }

  return response.json();
}

/**
 * Report a Simplified Invoice (B2C)
 *
 * Simplified invoices are reported to ZATCA (not cleared in real-time).
 * Must be reported within 24 hours of issuance.
 */
export async function reportSimplifiedInvoice(
  environment: ZatcaEnvironment,
  csid: string,
  secret: string,
  invoiceXmlBase64: string,
  invoiceHash: string,
  uuid: string,
): Promise<ZatcaReportingResponse> {
  const baseUrl = getBaseUrl(environment);
  const response = await fetch(`${baseUrl}/invoices/reporting/single`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept-Version": "V2",
      "Accept-Language": "en",
      "Clearance-Status": "0",
      Authorization: buildAuthHeader(csid, secret),
    },
    body: JSON.stringify({
      invoiceHash,
      uuid,
      invoice: invoiceXmlBase64,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ZATCA Reporting failed (${response.status}): ${text}`);
  }

  return response.json();
}

/**
 * Clear a Standard Invoice (B2B)
 *
 * Standard invoices must be cleared by ZATCA in near real-time before being sent to the buyer.
 */
export async function clearStandardInvoice(
  environment: ZatcaEnvironment,
  csid: string,
  secret: string,
  invoiceXmlBase64: string,
  invoiceHash: string,
  uuid: string,
): Promise<ZatcaReportingResponse> {
  const baseUrl = getBaseUrl(environment);
  const response = await fetch(`${baseUrl}/invoices/clearance/single`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept-Version": "V2",
      "Accept-Language": "en",
      "Clearance-Status": "1",
      Authorization: buildAuthHeader(csid, secret),
    },
    body: JSON.stringify({
      invoiceHash,
      uuid,
      invoice: invoiceXmlBase64,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ZATCA Clearance failed (${response.status}): ${text}`);
  }

  return response.json();
}
