import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { refunds } from "@/lib/schema";
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

export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const refund = await db.query.refunds.findFirst({
      where: eq(refunds.id, id),
      with: {
        items: {
          with: {
            orderItem: true,
          },
        },
        order: {
          with: {
            shippingAddress: true,
            billingAddress: true,
            user: { columns: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!refund) {
      return NextResponse.json({ error: "Refund not found" }, { status: 404 });
    }

    const isAdmin = session.user.role === "ADMIN" || session.user.role === "STAFF";
    if (!isAdmin && (!refund.order.userId || refund.order.userId !== session.user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const r = serializeDecimal(refund);
    const settings = await db.query.storeSettings.findFirst();
    const storeName = settings?.storeName || "Store";
    const storeAddress = settings?.storeAddress || "";
    const storePhone = settings?.storePhone || "";
    const storeEmail = settings?.storeEmail || "";
    const vatNumber = settings?.vatNumber || "";
    const commercialRegNo = settings?.commercialRegNo || "";
    const zatcaEnabled = settings?.zatcaEnabled ?? true;
    const currency = r.order.currency || settings?.currency || "SAR";
    const taxRate = settings?.taxRate ?? 0.15;
    const vatPercent = (taxRate * 100).toFixed(taxRate * 100 % 1 === 0 ? 0 : 1);

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = 15;

    const creditNoteNumber = r.zatcaCreditNoteNumber || `CN-${r.order.orderNumber}-${r.id.slice(-6)}`;

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(storeName, margin, y);
    doc.text("CREDIT NOTE", pageWidth - margin, y, { align: "right" });
    y += 8;

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
      if (commercialRegNo) doc.text(`CR No: ${commercialRegNo}`, margin + 60, y);
      y += 4;
    }

    y += 2;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.text("Credit Note Details", margin, y);
    doc.text("Credit To", pageWidth / 2 + 5, y);
    y += 5;
    doc.setFont("helvetica", "normal");

    const createdAt = new Date(r.createdAt);
    const detailLines = [
      `Credit Note #: ${creditNoteNumber}`,
      `Original Invoice #: ${r.order.orderNumber}`,
      `Date: ${createdAt.toLocaleDateString("en-SA")}  ${createdAt.toLocaleTimeString("en-SA", { hour: "2-digit", minute: "2-digit" })}`,
      `Status: ${r.status}`,
      `Reason: ${r.reason || "Refund"}`,
    ];
    for (const line of detailLines) {
      doc.text(line, margin, y);
      y += 4;
    }

    const addr = r.order.billingAddress || r.order.shippingAddress;
    let addrY = y - 4 * detailLines.length;
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
      doc.text(r.order.email, pageWidth / 2 + 5, addrY);
      addrY += 4;
    }

    y = Math.max(y, addrY) + 4;

    const itemRows = r.items.map((item: {
      quantity: number;
      amount: string | number;
      orderItem: { name: string; sku?: string | null; price: string | number; variantName?: string | null };
    }) => {
      const name = item.orderItem.name + (item.orderItem.variantName ? ` (${item.orderItem.variantName})` : "");
      return [
        name,
        item.orderItem.sku || "-",
        String(item.quantity),
        `${currency} ${toNum(item.orderItem.price).toFixed(2)}`,
        `${currency} ${toNum(item.amount).toFixed(2)}`,
      ];
    });

    const itemTotal = r.items.reduce((sum: number, item: { amount: string | number }) => sum + toNum(item.amount), 0);
    const adjustment = Math.round((toNum(r.amount) - itemTotal) * 100) / 100;
    if (Math.abs(adjustment) >= 0.01) {
      itemRows.push([
        "Shipping / order-level adjustment",
        "-",
        "1",
        `${currency} ${adjustment.toFixed(2)}`,
        `${currency} ${adjustment.toFixed(2)}`,
      ]);
    }

    autoTable(doc, {
      startY: y,
      head: [["Credited Item", "SKU", "Qty", "Unit Price", "Credit Amount"]],
      body: itemRows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255], fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { cellWidth: 25 },
        2: { cellWidth: 15, halign: "center" },
        3: { cellWidth: 30, halign: "right" },
        4: { cellWidth: 32, halign: "right" },
      },
      alternateRowStyles: { fillColor: [248, 248, 248] },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 6;

    const totalWithVat = toNum(r.amount);
    const totalWithoutVat = Math.round((totalWithVat / (1 + taxRate)) * 100) / 100;
    const totalVat = Math.round((totalWithVat - totalWithoutVat) * 100) / 100;
    const summaryX = pageWidth - margin - 75;
    const summaryValX = pageWidth - margin;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Credit before VAT", summaryX, y);
    doc.text(`${currency} ${totalWithoutVat.toFixed(2)}`, summaryValX, y, { align: "right" });
    y += 5;
    doc.text(`VAT reversed (${vatPercent}%)`, summaryX, y);
    doc.text(`${currency} ${totalVat.toFixed(2)}`, summaryValX, y, { align: "right" });
    y += 6;
    doc.setDrawColor(200, 200, 200);
    doc.line(summaryX, y, summaryValX, y);
    y += 5;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Total Credit", summaryX, y);
    doc.text(`${currency} ${totalWithVat.toFixed(2)}`, summaryValX, y, { align: "right" });
    y += 10;

    if (zatcaEnabled && vatNumber) {
      const qrData = generateZatcaQR({
        sellerName: storeName,
        vatNumber,
        timestamp: new Date(r.createdAt),
        totalWithVat,
        vatAmount: totalVat,
      });

      const qrDataUrl = await QRCode.toDataURL(qrData, {
        width: 120,
        margin: 1,
        errorCorrectionLevel: "M",
      });

      if (y + 45 > doc.internal.pageSize.getHeight() - 15) {
        doc.addPage();
        y = 15;
      }

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("ZATCA Credit Note QR", margin, y);
      y += 3;
      doc.addImage(qrDataUrl, "PNG", margin, y, 35, 35);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(`VAT Reg: ${vatNumber}`, margin + 40, y + 8);
      if (commercialRegNo) doc.text(`CR No: ${commercialRegNo}`, margin + 40, y + 12);
      doc.text("This credit note reverses value from the referenced original invoice.", margin + 40, y + 18);
      y += 40;
    }

    const footerY = doc.internal.pageSize.getHeight() - 12;
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated on ${new Date().toLocaleDateString("en-SA")} - ${storeName}`, margin, footerY);
    doc.text(creditNoteNumber, pageWidth - margin, footerY, { align: "right" });

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="credit-note-${creditNoteNumber}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Credit note generation error:", error);
    return NextResponse.json({ error: "Failed to generate credit note" }, { status: 500 });
  }
}
