/**
 * Universal Barcode Scanner Handler
 *
 * Supports:
 * - HID keyboard-wedge scanners (most common — Honeywell, Zebra, Symbol, Datalogic)
 * - Prefix/suffix detection (configurable)
 * - EAN-13, UPC-A, Code 128, Code 39, QR, DataMatrix
 * - Works regardless of input focus state
 * - Configurable debounce timing for different scanner speeds
 * - Audio + visual feedback
 */

export interface BarcodeScannerConfig {
  /** Min characters to consider a valid scan (default: 4) */
  minLength: number;
  /** Max ms between keystrokes from scanner (default: 50ms for fast scanners) */
  maxKeystrokeInterval: number;
  /** Prefix character the scanner sends before barcode (optional) */
  prefix: string | null;
  /** Suffix character / key the scanner sends after barcode (default: "Enter") */
  suffix: string;
  /** Whether to intercept scans even when input is focused (default: true) */
  interceptInputFocus: boolean;
  /** Play beep sound on successful scan (default: true) */
  enableSound: boolean;
  /** Prevent default behavior on scan keys (default: true) */
  preventDefault: boolean;
}

export const DEFAULT_SCANNER_CONFIG: BarcodeScannerConfig = {
  minLength: 4,
  maxKeystrokeInterval: 50,
  prefix: null,
  suffix: "Enter",
  interceptInputFocus: true,
  enableSound: true,
  preventDefault: true,
};

export type ScanCallback = (barcode: string, source: "keyboard" | "serial" | "camera") => void;

/**
 * Keyboard-wedge barcode scanner detector.
 * HID barcode scanners type characters very rapidly (<50ms between keystrokes)
 * and terminate with Enter. We detect this pattern to distinguish from
 * normal human typing.
 */
export class BarcodeScanner {
  private config: BarcodeScannerConfig;
  private buffer = "";
  private lastKeyTime = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private listeners: Set<ScanCallback> = new Set();
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private scanning = false;

  constructor(config: Partial<BarcodeScannerConfig> = {}) {
    this.config = { ...DEFAULT_SCANNER_CONFIG, ...config };
  }

  /** Subscribe to scan events */
  onScan(cb: ScanCallback): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /** Start listening for keyboard-wedge scanner input */
  start(): void {
    if (this.keydownHandler) return; // already running

    this.keydownHandler = (e: KeyboardEvent) => {
      const now = performance.now();
      const timeSinceLastKey = now - this.lastKeyTime;
      const isInInput = (e.target as HTMLElement)?.tagName === "INPUT" ||
        (e.target as HTMLElement)?.tagName === "TEXTAREA";

      // If not intercepting input focus and we're in an input, skip
      if (!this.config.interceptInputFocus && isInInput) return;

      // Handle suffix (Enter key by default) — finalize scan
      if (e.key === this.config.suffix) {
        if (this.buffer.length >= this.config.minLength && this.scanning) {
          const barcode = this.buffer.trim();
          this.resetBuffer();

          // Prevent the Enter from submitting forms or triggering other actions
          if (this.config.preventDefault) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
          }

          // If focus was in an input, clear the scanner text from it
          if (isInInput) {
            const input = e.target as HTMLInputElement;
            const currentVal = input.value;
            if (currentVal.endsWith(barcode) || currentVal.includes(barcode)) {
              // Remove the barcode text that the scanner typed into the input
              input.value = currentVal.replace(barcode, "").trim();
              // Trigger React's onChange
              const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLInputElement.prototype, "value"
              )?.set;
              nativeInputValueSetter?.call(input, input.value);
              input.dispatchEvent(new Event("input", { bubbles: true }));
            }
          }

          this.emitScan(barcode);
          return;
        }
        // Not a scan — reset
        this.resetBuffer();
        return;
      }

      // Handle prefix
      if (this.config.prefix && e.key === this.config.prefix && this.buffer.length === 0) {
        this.scanning = true;
        this.lastKeyTime = now;
        if (this.config.preventDefault) {
          e.preventDefault();
        }
        return;
      }

      // Only accept printable single characters
      if (e.key.length !== 1) return;

      // Check timing — if too slow, this is human typing, not a scanner
      if (this.buffer.length > 0 && timeSinceLastKey > this.config.maxKeystrokeInterval) {
        this.resetBuffer();
      }

      // Start or continue buffering
      if (this.buffer.length === 0) {
        this.scanning = true;
      }

      this.buffer += e.key;
      this.lastKeyTime = now;

      // Auto-reset if no more input comes quickly
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.resetBuffer();
      }, this.config.maxKeystrokeInterval * 3);

      // If we're in an input and the scan looks valid (rapid typing),
      // prevent the character from being typed
      if (isInInput && this.scanning && this.buffer.length > 2 && this.config.preventDefault) {
        e.preventDefault();
      }
    };

    // Use capture phase to intercept before React handlers
    window.addEventListener("keydown", this.keydownHandler, { capture: true });
  }

  /** Stop listening */
  stop(): void {
    if (this.keydownHandler) {
      window.removeEventListener("keydown", this.keydownHandler, { capture: true });
      this.keydownHandler = null;
    }
    this.resetBuffer();
  }

  /** Manually trigger a scan (e.g. from camera or manual entry) */
  manualScan(barcode: string, source: "serial" | "camera" = "camera"): void {
    if (barcode.length >= this.config.minLength) {
      this.emitScan(barcode, source);
    }
  }

  private emitScan(barcode: string, source: "keyboard" | "serial" | "camera" = "keyboard"): void {
    this.listeners.forEach((cb) => cb(barcode, source));
  }

  private resetBuffer(): void {
    this.buffer = "";
    this.scanning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  destroy(): void {
    this.stop();
    this.listeners.clear();
  }
}

/** Validate common barcode formats */
export function validateBarcode(code: string): {
  valid: boolean;
  format: string;
} {
  // EAN-13
  if (/^\d{13}$/.test(code)) {
    const digits = code.split("").map(Number);
    const check = digits.pop()!;
    const sum = digits.reduce((s, d, i) => s + d * (i % 2 === 0 ? 1 : 3), 0);
    const valid = (10 - (sum % 10)) % 10 === check;
    return { valid, format: "EAN-13" };
  }

  // UPC-A
  if (/^\d{12}$/.test(code)) {
    const digits = code.split("").map(Number);
    const check = digits.pop()!;
    const sum = digits.reduce((s, d, i) => s + d * (i % 2 === 0 ? 3 : 1), 0);
    const valid = (10 - (sum % 10)) % 10 === check;
    return { valid, format: "UPC-A" };
  }

  // EAN-8
  if (/^\d{8}$/.test(code)) {
    return { valid: true, format: "EAN-8" };
  }

  // Code 128 — alphanumeric, variable length
  if (/^[A-Za-z0-9\-. $/+%]{1,48}$/.test(code)) {
    return { valid: true, format: "Code-128" };
  }

  // Code 39
  if (/^[A-Z0-9\-. $/+%*]{1,43}$/.test(code)) {
    return { valid: true, format: "Code-39" };
  }

  // QR / DataMatrix — any content
  if (code.length >= 1) {
    return { valid: true, format: "QR/DataMatrix" };
  }

  return { valid: false, format: "Unknown" };
}
