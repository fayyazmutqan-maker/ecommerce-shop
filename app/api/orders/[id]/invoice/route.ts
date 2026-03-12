import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { orders, storeSettings } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { serializeDecimal } from "@/lib/decimal";
import { generateZatcaQR } from "@/lib/pos/zatca";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function toNum(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") return parseFloat(val) || 0;
  return 0;
}

/**
 * GET /api/orders/[id]/invoice — Generate PDF invoice with ZATCA QR code
 */
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        items: {
          with: {
            product: { columns: { id: true, name: true } },
            variant: { columns: { id: true, name: true } },
          },
        },
        shippingAddress: true,
        billingAddress: true,
        user: { columns: { id: true, name: true, email: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Authorization: admin/staff can view any, customers only their own
    const isAdmin = session.user.role === "ADMIN" || session.user.role === "STAFF";
    if (!isAdmin && (!order.userId || order.userId !== session.user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const o = serializeDecimal(order);

    // Load store settings
    const settings = await db.query.storeSettings.findFirst();
    const storeName = settings?.storeName || "Store";
    const storeAddress = settings?.storeAddress || "";
    const storePhone = settings?.storePhone || "";
    const storeEmail = settings?.storeEmail || "";
    const vatNumber = settings?.vatNumber || "";
    const commercialRegNo = settings?.commercialRegNo || "";
    const zatcaEnabled = settings?.zatcaEnabled ?? true;
    const currency = settings?.currency || "SAR";
    const taxRate = settings?.taxRate ?? 0.15;

    // ─── Build PDF ───
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = 15;

    // Header: Store name + invoice title
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(storeName, margin, y);
    doc.setFontSize(20);
    doc.text("INVOICE", pageWidth - margin, y, { align: "right" });
    y += 8;

    // Store info line
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const storeInfoParts: string[] = [];
    if (storeAddress) storeInfoParts.push(storeAddress);
    if (storePhone) storeInfoParts.push(storePhone);
    if (storeEmail) storeInfoParts.push(storeEmail);
    if (storeInfoParts.length > 0) {
      doc.text(storeInfoParts.join("  |  "), margin, y);
      y += 4;
    }
    if (vatNumber) {
      doc.text(`VAT No: ${vatNumber}`, margin, y);
      if (commercialRegNo) {
        doc.text(`CR No: ${commercialRegNo}`, margin + 60, y);
      }
      y += 4;
    }

    // Divider
    y += 2;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // Invoice details (left) + Billing (right)
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Invoice Details", margin, y);
    doc.text("Bill To", pageWidth / 2 + 5, y);
    y += 5;
    doc.setFont("helvetica", "normal");

    // Left column: invoice details
    const orderDate = new Date(o.createdAt);
    const invoiceDate = orderDate.toLocaleDateString("en-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const invoiceTime = orderDate.toLocaleTimeString("en-SA", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const invoiceLines = [
      `Invoice #: ${o.orderNumber}`,
      `Date: ${invoiceDate}  ${invoiceTime}`,
      `Status: ${o.paymentStatus}`,
      `Payment: ${o.paymentMethod?.toUpperCase() || "N/A"}`,
    ];
    for (const line of invoiceLines) {
      doc.text(line, margin, y);
      y += 4;
    }

    // Right column: billing address
    const addr = o.billingAddress || o.shippingAddress;
    let addrY = y - 4 * invoiceLines.length;
    if (addr) {
      const addrLines = [
        `${addr.firstName} ${addr.lastName}`,
        ...(addr.company ? [addr.company] : []),
        addr.address1,
        ...(addr.address2 ? [addr.address2] : []),
        `${addr.city}${addr.state ? ", " + addr.state : ""} ${addr.postalCode}`,
        addr.country,
        ...(addr.phone ? [addr.phone] : []),
      ];
      for (const line of addrLines) {
        doc.text(line, pageWidth / 2 + 5, addrY);
        addrY += 4;
      }
    } else {
      doc.text(o.email, pageWidth / 2 + 5, addrY);
      addrY += 4;
    }

    y = Math.max(y, addrY) + 4;

    // Items table
    const tableData = o.items.map((item: { name: string; variantName?: string | null; sku?: string | null; quantity: number; price: string | number; totalPrice: string | number }) => [
      item.name + (item.variantName ? ` (${item.variantName})` : ""),
      item.sku || "—",
      String(item.quantity),
      `${currency} ${toNum(item.price).toFixed(2)}`,
      `${currency} ${toNum(item.totalPrice).toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Item", "SKU", "Qty", "Unit Price", "Total"]],
      body: tableData,
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255], fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { cellWidth: 25 },
        2: { cellWidth: 15, halign: "center" },
        3: { cellWidth: 30, halign: "right" },
        4: { cellWidth: 30, halign: "right" },
      },
      alternateRowStyles: { fillColor: [248, 248, 248] },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 6;

    // Summary
    const summaryX = pageWidth - margin - 70;
    const summaryValX = pageWidth - margin;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");

    const summaryLines: [string, string][] = [
      ["Subtotal", `${currency} ${toNum(o.subtotal).toFixed(2)}`],
    ];
    if (toNum(o.discountAmount) > 0) {
      summaryLines.push(["Discount", `- ${currency} ${toNum(o.discountAmount).toFixed(2)}`]);
    }
    summaryLines.push(["Shipping", toNum(o.shippingAmount) > 0 ? `${currency} ${toNum(o.shippingAmount).toFixed(2)}` : "Free"]);
    const vatPercent = (taxRate * 100).toFixed(taxRate * 100 % 1 === 0 ? 0 : 1);
    summaryLines.push([`VAT (${vatPercent}%)`, `${currency} ${toNum(o.taxAmount).toFixed(2)}`]);

    for (const [label, val] of summaryLines) {
      doc.text(label, summaryX, y);
      doc.text(val, summaryValX, y, { align: "right" });
      y += 5;
    }

    // Total
    y += 1;
    doc.setDrawColor(200, 200, 200);
    doc.line(summaryX, y, summaryValX, y);
    y += 5;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Total", summaryX, y);
    doc.text(`${currency} ${toNum(o.totalAmount).toFixed(2)}`, summaryValX, y, { align: "right" });
    y += 10;

    // ─── ZATCA QR Code ───
    if (zatcaEnabled && vatNumber) {
      const qrData = generateZatcaQR({
        sellerName: storeName,
        vatNumber,
        timestamp: new Date(o.createdAt),
        totalWithVat: toNum(o.totalAmount),
        vatAmount: toNum(o.taxAmount),
      });

      // Generate QR code image as data URL
      const qrDataUrl = await QRCode.toDataURL(qrData, {
        width: 120,
        margin: 1,
        errorCorrectionLevel: "M",
      });

      // Check if we need a new page
      if (y + 45 > doc.internal.pageSize.getHeight() - 15) {
        doc.addPage();
        y = 15;
      }

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("ZATCA E-Invoice QR", margin, y);
      y += 3;
      doc.addImage(qrDataUrl, "PNG", margin, y, 35, 35);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(`VAT Reg: ${vatNumber}`, margin + 40, y + 8);
      if (commercialRegNo) {
        doc.text(`CR No: ${commercialRegNo}`, margin + 40, y + 12);
      }
      doc.text("This QR code contains ZATCA-compliant", margin + 40, y + 18);
      doc.text("TLV-encoded invoice data.", margin + 40, y + 22);
      y += 40;
    }

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 12;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated on ${new Date().toLocaleDateString("en-SA")} — ${storeName}`, margin, footerY);
    doc.text(`Invoice ${o.orderNumber}`, pageWidth - margin, footerY, { align: "right" });

    // Return PDF
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="invoice-${o.orderNumber}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Invoice generation error:", error);
    return NextResponse.json({ error: "Failed to generate invoice" }, { status: 500 });
  }
}
