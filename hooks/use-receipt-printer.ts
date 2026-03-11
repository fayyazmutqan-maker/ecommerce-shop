"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  ReceiptPrinter,
  isWebSerialAvailable,
  generateReceiptHTML,
} from "@/lib/pos/receipt-printer";
import type { PrinterConfig, ReceiptData } from "@/lib/pos/receipt-printer";

export interface UseReceiptPrinterReturn {
  /** Whether the printer is connected via Web Serial */
  connected: boolean;
  /** Whether Web Serial API is supported in this browser */
  serialSupported: boolean;
  /** Connect to a thermal printer via Web Serial API */
  connect: () => Promise<boolean>;
  /** Try to reconnect to previously paired printer */
  reconnect: () => Promise<boolean>;
  /** Disconnect from printer */
  disconnect: () => Promise<void>;
  /** Print a receipt (uses serial if connected, else browser print) */
  printReceipt: (receipt: ReceiptData) => Promise<void>;
  /** Open the cash drawer */
  openCashDrawer: () => Promise<void>;
  /** Print a test page */
  testPrint: () => Promise<void>;
  /** Whether a print is actively in progress */
  printing: boolean;
}

/**
 * React hook for receipt printer management.
 * Supports ESC/POS thermal printing via Web Serial API
 * with automatic fallback to browser's window.print().
 */
export function useReceiptPrinter(
  config?: Partial<PrinterConfig>
): UseReceiptPrinterReturn {
  const [connected, setConnected] = useState(false);
  const [printing, setPrinting] = useState(false);
  const printerRef = useRef<ReceiptPrinter | null>(null);
  const serialSupported = typeof window !== "undefined" && isWebSerialAvailable();

  // Initialize printer instance
  useEffect(() => {
    printerRef.current = new ReceiptPrinter(config);

    // Try to reconnect to previously paired port
    if (serialSupported) {
      printerRef.current.reconnect().then((ok) => {
        if (ok) setConnected(true);
      });
    }

    return () => {
      printerRef.current?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = useCallback(async () => {
    if (!printerRef.current) return false;
    const ok = await printerRef.current.connect();
    setConnected(ok);
    return ok;
  }, []);

  const reconnect = useCallback(async () => {
    if (!printerRef.current) return false;
    const ok = await printerRef.current.reconnect();
    setConnected(ok);
    return ok;
  }, []);

  const disconnect = useCallback(async () => {
    if (!printerRef.current) return;
    await printerRef.current.disconnect();
    setConnected(false);
  }, []);

  const printReceipt = useCallback(async (receipt: ReceiptData) => {
    setPrinting(true);
    try {
      if (printerRef.current?.isConnected()) {
        // Direct ESC/POS thermal print
        await printerRef.current.printReceipt(receipt);
      } else {
        // Fallback: browser print window
        const html = generateReceiptHTML(receipt);
        const win = window.open("", "_blank", "width=400,height=600");
        if (win) {
          win.document.write(html);
          win.document.close();
        }
      }
    } finally {
      setPrinting(false);
    }
  }, []);

  const openCashDrawer = useCallback(async () => {
    if (printerRef.current?.isConnected()) {
      await printerRef.current.openCashDrawer();
    }
  }, []);

  const testPrint = useCallback(async () => {
    if (printerRef.current?.isConnected()) {
      setPrinting(true);
      try {
        await printerRef.current.testPrint();
      } finally {
        setPrinting(false);
      }
    }
  }, []);

  return {
    connected,
    serialSupported,
    connect,
    reconnect,
    disconnect,
    printReceipt,
    openCashDrawer,
    testPrint,
    printing,
  };
}
