/**
 * ESC/POS Thermal Receipt Printer
 *
 * Industry-standard ESC/POS command support via Web Serial API.
 * Compatible with: Epson TM series, Star TSP series, Bixolon, Citizen, POS-X,
 * and any ESC/POS compatible thermal printer.
 *
 * Features:
 * - Direct thermal printing via Web Serial API (Chrome 89+)
 * - Cash drawer kick (pin 2 / pin 5)
 * - Text formatting (bold, underline, alignment, font size)
 * - QR code generation for ZATCA e-invoicing
 * - Cut paper command
 * - Fallback to browser window.print() for non-supported browsers
 */

// ── ESC/POS Command Constants ──
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

export const CMD = {
  // Initialization
  INIT: new Uint8Array([ESC, 0x40]),                    // Initialize printer
  // Text formatting
  BOLD_ON: new Uint8Array([ESC, 0x45, 0x01]),           // Bold on
  BOLD_OFF: new Uint8Array([ESC, 0x45, 0x00]),          // Bold off
  UNDERLINE_ON: new Uint8Array([ESC, 0x2d, 0x01]),      // Underline on
  UNDERLINE_OFF: new Uint8Array([ESC, 0x2d, 0x00]),     // Underline off
  DOUBLE_HEIGHT: new Uint8Array([ESC, 0x21, 0x10]),     // Double height
  DOUBLE_WIDTH: new Uint8Array([ESC, 0x21, 0x20]),      // Double width
  DOUBLE_SIZE: new Uint8Array([ESC, 0x21, 0x30]),       // Double height + width
  NORMAL_SIZE: new Uint8Array([ESC, 0x21, 0x00]),       // Normal size
  // Alignment
  ALIGN_LEFT: new Uint8Array([ESC, 0x61, 0x00]),        // Left align
  ALIGN_CENTER: new Uint8Array([ESC, 0x61, 0x01]),      // Center align
  ALIGN_RIGHT: new Uint8Array([ESC, 0x61, 0x02]),       // Right align
  // Line feed
  LF: new Uint8Array([LF]),
  FEED_3: new Uint8Array([ESC, 0x64, 0x03]),            // Feed 3 lines
  FEED_5: new Uint8Array([ESC, 0x64, 0x05]),            // Feed 5 lines
  // Cut
  CUT_PARTIAL: new Uint8Array([GS, 0x56, 0x01]),        // Partial cut
  CUT_FULL: new Uint8Array([GS, 0x56, 0x00]),           // Full cut
  // Cash drawer
  DRAWER_PIN2: new Uint8Array([ESC, 0x70, 0x00, 0x19, 0xfa]),  // Kick pin 2
  DRAWER_PIN5: new Uint8Array([ESC, 0x70, 0x01, 0x19, 0xfa]),  // Kick pin 5
  // Barcode / QR
  QR_MODEL: new Uint8Array([GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]),  // QR Model 2
  QR_ERROR: new Uint8Array([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31]),       // Error correction M
  QR_PRINT: new Uint8Array([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]),       // Print QR
} as const;

export interface PrinterConfig {
  /** Paper width in characters (default: 48 for 80mm, 32 for 58mm) */
  paperWidth: number;
  /** Character encoding (default: "cp437") */
  encoding: string;
  /** Auto-cut after print (default: true) */
  autoCut: boolean;
  /** Beep on print (default: false) */
  beepOnPrint: boolean;
  /** Cash drawer pin (default: 2) */
  drawerPin: 2 | 5;
  /** Baud rate for serial connection (default: 9600) */
  baudRate: number;
}

export const DEFAULT_PRINTER_CONFIG: PrinterConfig = {
  paperWidth: 48,
  encoding: "cp437",
  autoCut: true,
  beepOnPrint: false,
  drawerPin: 2,
  baudRate: 9600,
};

export interface ReceiptData {
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  vatNumber?: string;
  orderNumber: string;
  date: Date;
  cashier: string;
  items: Array<{
    name: string;
    variant?: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    discount?: number;
  }>;
  subtotal: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  paymentMethod: string;
  payments?: Array<{ method: string; amount: number }>;
  amountTendered?: number;
  change?: number;
  giftCardUsed?: number;
  storeCreditUsed?: number;
  currency: string;
  zatcaQrData?: string;
  footerMessage?: string;
}

/** Check if Web Serial API is available */
export function isWebSerialAvailable(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

/**
 * ESC/POS Thermal Receipt Printer
 */
// Web Serial API type (not in all TS libs)
interface WebSerialPort {
  open(options: Record<string, unknown>): Promise<void>;
  close(): Promise<void>;
  writable: WritableStream<Uint8Array>;
  readable: ReadableStream<Uint8Array>;
}

export class ReceiptPrinter {
  private config: PrinterConfig;
  private port: WebSerialPort | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private connected = false;
  private encoder = new TextEncoder();

  constructor(config: Partial<PrinterConfig> = {}) {
    this.config = { ...DEFAULT_PRINTER_CONFIG, ...config };
  }

  /** Check connection status */
  isConnected(): boolean {
    return this.connected;
  }

  /** Connect to printer via Web Serial API */
  async connect(): Promise<boolean> {
    if (!isWebSerialAvailable()) {
      console.warn("Web Serial API not available — use browser print fallback");
      return false;
    }

    try {
      // Request serial port (shows browser picker dialog)
      this.port = await (navigator as Navigator & { serial: { requestPort: (options?: object) => Promise<WebSerialPort> } }).serial.requestPort({
        filters: [] // Accept any serial device
      });

      await this.port.open({
        baudRate: this.config.baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: "none",
        flowControl: "none",
      });

      if (this.port.writable) {
        this.writer = this.port.writable.getWriter();
        this.connected = true;

        // Initialize printer
        await this.write(CMD.INIT);

        return true;
      }

      return false;
    } catch (err) {
      console.error("Failed to connect to printer:", err);
      this.connected = false;
      return false;
    }
  }

  /** Reconnect to a previously paired port */
  async reconnect(): Promise<boolean> {
    if (!isWebSerialAvailable()) return false;

    try {
      const serial = (navigator as Navigator & { serial: { getPorts: () => Promise<WebSerialPort[]> } }).serial;
      const ports = await serial.getPorts();

      if (ports.length > 0) {
        this.port = ports[0];
        await this.port.open({
          baudRate: this.config.baudRate,
          dataBits: 8,
          stopBits: 1,
          parity: "none",
          flowControl: "none",
        });

        if (this.port.writable) {
          this.writer = this.port.writable.getWriter();
          this.connected = true;
          await this.write(CMD.INIT);
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  /** Disconnect from printer */
  async disconnect(): Promise<void> {
    try {
      if (this.writer) {
        await this.writer.close();
        this.writer = null;
      }
      if (this.port) {
        await this.port.close();
        this.port = null;
      }
    } catch {
      // Ignore close errors
    }
    this.connected = false;
  }

  /** Write raw bytes to printer */
  private async write(data: Uint8Array): Promise<void> {
    if (!this.writer) throw new Error("Printer not connected");
    await this.writer.write(data);
  }

  /** Write text to printer */
  private async writeText(text: string): Promise<void> {
    await this.write(this.encoder.encode(text));
  }

  /** Print a separator line */
  private async printSeparator(char = "-"): Promise<void> {
    await this.writeText(char.repeat(this.config.paperWidth));
    await this.write(CMD.LF);
  }

  /** Print a two-column row (label + value, right-aligned) */
  private async printRow(left: string, right: string): Promise<void> {
    const space = this.config.paperWidth - left.length - right.length;
    const padding = space > 0 ? " ".repeat(space) : " ";
    await this.writeText(`${left}${padding}${right}`);
    await this.write(CMD.LF);
  }

  /** Generate QR code data command for ESC/POS */
  private qrDataCmd(data: string): Uint8Array {
    const encoded = this.encoder.encode(data);
    const len = encoded.length + 3;
    const pL = len & 0xff;
    const pH = (len >> 8) & 0xff;
    return new Uint8Array([GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30, ...encoded]);
  }

  /** Set QR code size */
  private qrSizeCmd(size: number): Uint8Array {
    return new Uint8Array([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, size]);
  }

  /** Open cash drawer */
  async openCashDrawer(): Promise<void> {
    if (!this.connected) {
      console.warn("Printer not connected — cannot open cash drawer");
      return;
    }
    const cmd = this.config.drawerPin === 5 ? CMD.DRAWER_PIN5 : CMD.DRAWER_PIN2;
    await this.write(cmd);
  }

  /**
   * Print a full receipt
   */
  async printReceipt(receipt: ReceiptData): Promise<void> {
    if (!this.connected) {
      throw new Error("Printer not connected");
    }

    const w = this.config.paperWidth;
    const curr = receipt.currency;

    // Initialize
    await this.write(CMD.INIT);

    // ─── Header ───
    await this.write(CMD.ALIGN_CENTER);
    await this.write(CMD.DOUBLE_SIZE);
    await this.writeText(receipt.storeName);
    await this.write(CMD.LF);
    await this.write(CMD.NORMAL_SIZE);

    if (receipt.storeAddress) {
      await this.writeText(receipt.storeAddress);
      await this.write(CMD.LF);
    }
    if (receipt.storePhone) {
      await this.writeText(`Tel: ${receipt.storePhone}`);
      await this.write(CMD.LF);
    }
    if (receipt.vatNumber) {
      await this.writeText(`VAT: ${receipt.vatNumber}`);
      await this.write(CMD.LF);
    }

    // ─── Order Info ───
    await this.write(CMD.ALIGN_LEFT);
    await this.printSeparator("=");
    await this.printRow("Order:", receipt.orderNumber);
    await this.printRow("Date:", receipt.date.toLocaleString("en-SA"));
    await this.printRow("Cashier:", receipt.cashier);
    await this.printSeparator("-");

    // ─── Items ───
    // Header
    await this.write(CMD.BOLD_ON);
    const itemHeader = "Item";
    const qtyH = "Qty";
    const priceH = "Price";
    const totalH = "Total";
    const col1 = w - 6 - 10 - 10;
    await this.writeText(
      itemHeader.padEnd(col1) + qtyH.padStart(6) + priceH.padStart(10) + totalH.padStart(10)
    );
    await this.write(CMD.LF);
    await this.write(CMD.BOLD_OFF);
    await this.printSeparator("-");

    for (const item of receipt.items) {
      const name = item.variant ? `${item.name} (${item.variant})` : item.name;
      const qty = `x${item.quantity}`;
      const price = `${curr} ${item.unitPrice.toFixed(2)}`;
      const total = `${curr} ${item.lineTotal.toFixed(2)}`;

      // If name is too long, print on separate lines
      if (name.length > col1 - 1) {
        await this.writeText(name);
        await this.write(CMD.LF);
        await this.writeText("".padEnd(col1) + qty.padStart(6) + price.padStart(10) + total.padStart(10));
      } else {
        await this.writeText(
          name.padEnd(col1) + qty.padStart(6) + price.padStart(10) + total.padStart(10)
        );
      }
      await this.write(CMD.LF);

      if (item.discount && item.discount > 0) {
        await this.writeText(`  Discount: -${item.discount}%`);
        await this.write(CMD.LF);
      }
    }

    // ─── Totals ───
    await this.printSeparator("-");
    await this.printRow("Subtotal:", `${curr} ${receipt.subtotal.toFixed(2)}`);

    if (receipt.discount > 0) {
      await this.printRow("Discount:", `-${curr} ${receipt.discount.toFixed(2)}`);
    }

    await this.printRow(`VAT (${(receipt.taxRate * 100).toFixed(0)}%):`, `${curr} ${receipt.taxAmount.toFixed(2)}`);

    if (receipt.giftCardUsed && receipt.giftCardUsed > 0) {
      await this.printRow("Gift Card:", `-${curr} ${receipt.giftCardUsed.toFixed(2)}`);
    }
    if (receipt.storeCreditUsed && receipt.storeCreditUsed > 0) {
      await this.printRow("Store Credit:", `-${curr} ${receipt.storeCreditUsed.toFixed(2)}`);
    }

    await this.printSeparator("=");
    await this.write(CMD.BOLD_ON);
    await this.write(CMD.DOUBLE_HEIGHT);
    await this.printRow("TOTAL:", `${curr} ${receipt.total.toFixed(2)}`);
    await this.write(CMD.NORMAL_SIZE);
    await this.write(CMD.BOLD_OFF);
    await this.printSeparator("=");

    // ─── Payment Info ───
    if (receipt.payments && receipt.payments.length > 1) {
      await this.writeText("Split Payment:");
      await this.write(CMD.LF);
      for (const p of receipt.payments) {
        await this.printRow(`  ${p.method}:`, `${curr} ${p.amount.toFixed(2)}`);
      }
    } else {
      await this.printRow("Payment:", receipt.paymentMethod);
    }

    if (receipt.amountTendered && receipt.amountTendered > receipt.total) {
      await this.printRow("Tendered:", `${curr} ${receipt.amountTendered.toFixed(2)}`);
      await this.write(CMD.BOLD_ON);
      await this.printRow("Change:", `${curr} ${(receipt.change || 0).toFixed(2)}`);
      await this.write(CMD.BOLD_OFF);
    }

    // ─── ZATCA QR Code ───
    if (receipt.zatcaQrData) {
      await this.write(CMD.LF);
      await this.write(CMD.ALIGN_CENTER);
      // Set QR size (6 = medium)
      await this.write(this.qrSizeCmd(6));
      // Set model
      await this.write(CMD.QR_MODEL);
      // Set error correction
      await this.write(CMD.QR_ERROR);
      // Store QR data
      await this.write(this.qrDataCmd(receipt.zatcaQrData));
      // Print QR
      await this.write(CMD.QR_PRINT);
      await this.write(CMD.LF);
      await this.writeText("Scan for e-invoice");
      await this.write(CMD.LF);
    }

    // ─── Footer ───
    await this.write(CMD.LF);
    await this.write(CMD.ALIGN_CENTER);
    await this.writeText(receipt.footerMessage || "Thank you for your purchase!");
    await this.write(CMD.LF);
    await this.writeText(receipt.storeName);
    await this.write(CMD.LF);

    // Feed and cut
    await this.write(CMD.FEED_5);
    if (this.config.autoCut) {
      await this.write(CMD.CUT_PARTIAL);
    }
  }

  /** Test print — prints a test page */
  async testPrint(): Promise<void> {
    if (!this.connected) throw new Error("Printer not connected");

    await this.write(CMD.INIT);
    await this.write(CMD.ALIGN_CENTER);
    await this.write(CMD.DOUBLE_SIZE);
    await this.writeText("PRINTER TEST");
    await this.write(CMD.LF);
    await this.write(CMD.NORMAL_SIZE);
    await this.printSeparator("=");
    await this.writeText("Connection: OK");
    await this.write(CMD.LF);
    await this.writeText(`Paper: ${this.config.paperWidth} cols`);
    await this.write(CMD.LF);
    await this.writeText(`Baud: ${this.config.baudRate}`);
    await this.write(CMD.LF);
    await this.printSeparator("=");
    await this.write(CMD.BOLD_ON);
    await this.writeText("Bold Text");
    await this.write(CMD.LF);
    await this.write(CMD.BOLD_OFF);
    await this.write(CMD.UNDERLINE_ON);
    await this.writeText("Underlined Text");
    await this.write(CMD.LF);
    await this.write(CMD.UNDERLINE_OFF);
    await this.write(CMD.ALIGN_LEFT);
    await this.writeText("Left aligned");
    await this.write(CMD.LF);
    await this.write(CMD.ALIGN_RIGHT);
    await this.writeText("Right aligned");
    await this.write(CMD.LF);
    await this.write(CMD.ALIGN_CENTER);
    await this.writeText("Center aligned");
    await this.write(CMD.LF);
    await this.printSeparator("-");
    await this.writeText(new Date().toLocaleString());
    await this.write(CMD.LF);
    await this.write(CMD.FEED_3);
    await this.write(CMD.CUT_PARTIAL);
  }
}

/**
 * Fallback: generate receipt HTML for browser printing
 * Used when Web Serial is not available
 */
export function generateReceiptHTML(receipt: ReceiptData): string {
  const curr = receipt.currency;

  const itemRows = receipt.items.map((item) => {
    const name = item.variant ? `${item.name} <small>(${item.variant})</small>` : item.name;
    return `<tr>
      <td style="padding:2px 0;vertical-align:top">${name}${item.discount ? `<br><small style="color:#666">-${item.discount}%</small>` : ""}</td>
      <td style="text-align:center;padding:2px 4px">${item.quantity}</td>
      <td style="text-align:right;padding:2px 0">${curr} ${item.unitPrice.toFixed(2)}</td>
      <td style="text-align:right;padding:2px 0">${curr} ${item.lineTotal.toFixed(2)}</td>
    </tr>`;
  }).join("");

  const paymentRows = receipt.payments && receipt.payments.length > 1
    ? receipt.payments.map((p) =>
      `<div style="display:flex;justify-content:space-between"><span>${p.method}</span><span>${curr} ${p.amount.toFixed(2)}</span></div>`
    ).join("")
    : `<div>Payment: ${receipt.paymentMethod}</div>`;

  return `<!DOCTYPE html><html><head>
    <title>Receipt — ${receipt.orderNumber}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family:'Courier New',monospace; font-size:12px; max-width:300px; margin:0 auto; padding:10px; }
      .center { text-align:center; }
      .bold { font-weight:bold; }
      .divider { border-top:1px dashed #000; margin:8px 0; }
      .double-divider { border-top:2px solid #000; margin:8px 0; }
      table { width:100%; border-collapse:collapse; }
      td { padding:2px 0; vertical-align:top; }
      .total-row { font-size:16px; font-weight:bold; }
      .qr-container { text-align:center; margin:8px 0; }
      .qr-container img { width:120px; height:120px; }
      @media print {
        @page { size:80mm auto; margin:0; }
        body { max-width:100%; padding:2mm; }
      }
    </style>
  </head><body>
    <div class="center bold" style="font-size:18px">${receipt.storeName}</div>
    ${receipt.storeAddress ? `<div class="center">${receipt.storeAddress}</div>` : ""}
    ${receipt.storePhone ? `<div class="center">Tel: ${receipt.storePhone}</div>` : ""}
    ${receipt.vatNumber ? `<div class="center">VAT: ${receipt.vatNumber}</div>` : ""}
    <div class="double-divider"></div>
    <div style="display:flex;justify-content:space-between"><span>Order:</span><span>${receipt.orderNumber}</span></div>
    <div style="display:flex;justify-content:space-between"><span>Date:</span><span>${receipt.date.toLocaleString("en-SA")}</span></div>
    <div style="display:flex;justify-content:space-between"><span>Cashier:</span><span>${receipt.cashier}</span></div>
    <div class="divider"></div>
    <table>
      <tr style="font-weight:bold;border-bottom:1px solid #000">
        <td>Item</td><td style="text-align:center">Qty</td>
        <td style="text-align:right">Price</td><td style="text-align:right">Total</td>
      </tr>
      ${itemRows}
    </table>
    <div class="divider"></div>
    <div style="display:flex;justify-content:space-between"><span>Subtotal</span><span>${curr} ${receipt.subtotal.toFixed(2)}</span></div>
    ${receipt.discount > 0 ? `<div style="display:flex;justify-content:space-between;color:#16a34a"><span>Discount</span><span>-${curr} ${receipt.discount.toFixed(2)}</span></div>` : ""}
    <div style="display:flex;justify-content:space-between"><span>VAT (${(receipt.taxRate * 100).toFixed(0)}%)</span><span>${curr} ${receipt.taxAmount.toFixed(2)}</span></div>
    ${receipt.giftCardUsed && receipt.giftCardUsed > 0 ? `<div style="display:flex;justify-content:space-between;color:#16a34a"><span>Gift Card</span><span>-${curr} ${receipt.giftCardUsed.toFixed(2)}</span></div>` : ""}
    ${receipt.storeCreditUsed && receipt.storeCreditUsed > 0 ? `<div style="display:flex;justify-content:space-between;color:#16a34a"><span>Store Credit</span><span>-${curr} ${receipt.storeCreditUsed.toFixed(2)}</span></div>` : ""}
    <div class="double-divider"></div>
    <div class="total-row" style="display:flex;justify-content:space-between">
      <span>TOTAL</span><span>${curr} ${receipt.total.toFixed(2)}</span>
    </div>
    <div class="double-divider"></div>
    ${paymentRows}
    ${receipt.amountTendered && receipt.amountTendered > receipt.total ? `
      <div style="display:flex;justify-content:space-between"><span>Tendered</span><span>${curr} ${receipt.amountTendered.toFixed(2)}</span></div>
      <div class="bold" style="display:flex;justify-content:space-between"><span>Change</span><span>${curr} ${(receipt.change || 0).toFixed(2)}</span></div>
    ` : ""}
    ${receipt.zatcaQrData ? `
      <div class="divider"></div>
      <div class="qr-container">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(receipt.zatcaQrData)}" alt="ZATCA QR" />
        <div style="font-size:10px;margin-top:4px">Scan for e-invoice verification</div>
      </div>
    ` : ""}
    <div class="divider"></div>
    <div class="center" style="margin-top:8px">${receipt.footerMessage || "Thank you for your purchase!"}</div>
    <div class="center bold">${receipt.storeName}</div>
    <script>window.onload=()=>{window.print();}</script>
  </body></html>`;
}
