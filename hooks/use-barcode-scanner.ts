"use client";

import { useEffect, useRef, useCallback } from "react";
import { BarcodeScanner } from "@/lib/pos/barcode-scanner";
import type { BarcodeScannerConfig, ScanCallback } from "@/lib/pos/barcode-scanner";

/**
 * React hook for barcode scanner integration.
 * Manages lifecycle of the BarcodeScanner class and provides
 * a stable callback interface.
 */
export function useBarcodeScanner(
  onScan: ScanCallback,
  config?: Partial<BarcodeScannerConfig>,
  enabled = true,
) {
  const scannerRef = useRef<BarcodeScanner | null>(null);
  const callbackRef = useRef(onScan);

  // Keep callback ref up to date without re-creating scanner
  useEffect(() => {
    callbackRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled) return;

    const scanner = new BarcodeScanner(config);
    scannerRef.current = scanner;

    scanner.onScan((barcode, source) => {
      callbackRef.current(barcode, source);
    });

    scanner.start();

    return () => {
      scanner.destroy();
      scannerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  /** Manually submit a barcode (e.g. from manual entry dialog or camera) */
  const manualScan = useCallback((barcode: string) => {
    scannerRef.current?.manualScan(barcode, "camera");
  }, []);

  return { manualScan };
}
