/**
 * ZATCA E-Invoicing QR Code Generator
 *
 * Generates TLV (Tag-Length-Value) encoded data for ZATCA Phase 2 compliance.
 * Required fields per ZATCA specification:
 * 1. Seller Name
 * 2. VAT Registration Number
 * 3. Invoice Timestamp (ISO 8601)
 * 4. Invoice Total (with VAT)
 * 5. VAT Amount
 *
 * The TLV data is Base64 encoded and can be embedded in a QR code.
 * This is mandatory for all Saudi Arabian businesses.
 */

function encodeTLV(tag: number, value: string): Uint8Array {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(value);
  const result = new Uint8Array(2 + encoded.length);
  result[0] = tag;
  result[1] = encoded.length;
  result.set(encoded, 2);
  return result;
}

function concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export interface ZatcaInvoiceData {
  /** Seller/Store name */
  sellerName: string;
  /** VAT registration number (15 digits for Saudi Arabia) */
  vatNumber: string;
  /** Invoice date/time */
  timestamp: Date;
  /** Total amount including VAT */
  totalWithVat: number;
  /** VAT amount */
  vatAmount: number;
}

/**
 * Generate ZATCA-compliant QR code data string (Base64 TLV)
 */
export function generateZatcaQR(data: ZatcaInvoiceData): string {
  const tlv1 = encodeTLV(1, data.sellerName);
  const tlv2 = encodeTLV(2, data.vatNumber);
  const tlv3 = encodeTLV(3, data.timestamp.toISOString());
  const tlv4 = encodeTLV(4, data.totalWithVat.toFixed(2));
  const tlv5 = encodeTLV(5, data.vatAmount.toFixed(2));

  const combined = concatUint8Arrays(tlv1, tlv2, tlv3, tlv4, tlv5);
  return uint8ArrayToBase64(combined);
}

/**
 * Decode ZATCA QR code data for verification
 */
export function decodeZatcaQR(base64: string): ZatcaInvoiceData | null {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const decoder = new TextDecoder();
    const fields: Record<number, string> = {};
    let offset = 0;

    while (offset < bytes.length) {
      const tag = bytes[offset];
      const length = bytes[offset + 1];
      const value = decoder.decode(bytes.slice(offset + 2, offset + 2 + length));
      fields[tag] = value;
      offset += 2 + length;
    }

    return {
      sellerName: fields[1] || "",
      vatNumber: fields[2] || "",
      timestamp: new Date(fields[3] || ""),
      totalWithVat: parseFloat(fields[4] || "0"),
      vatAmount: parseFloat(fields[5] || "0"),
    };
  } catch {
    return null;
  }
}
