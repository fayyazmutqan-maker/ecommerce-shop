/**
 * Meta Conversion Event Hook
 *
 * Lightweight client-side hook for sending server-side conversion events
 * to Meta Conversions API via our API endpoint.
 */

"use client";

import { useCallback } from "react";

type ConversionEvent =
  | { event: "ViewContent"; productId: string; productName: string; value: number; currency?: string }
  | { event: "AddToCart"; productId: string; value: number; currency?: string; quantity?: number }
  | { event: "InitiateCheckout"; value: number; currency?: string; items: { id: string; quantity: number }[] }
  | { event: "Search"; query: string }
  | { event: "PageView" };

function sendEvent(data: ConversionEvent) {
  // Use navigator.sendBeacon for non-blocking delivery
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon("/api/channels/meta/events", JSON.stringify(data));
  } else {
    fetch("/api/channels/meta/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      keepalive: true,
    }).catch(() => {});
  }
}

export function useMetaTracking() {
  const trackProductView = useCallback(
    (productId: string, productName: string, value: number, currency = "SAR") => {
      sendEvent({ event: "ViewContent", productId, productName, value, currency });
    },
    [],
  );

  const trackAddToCart = useCallback(
    (productId: string, value: number, quantity = 1, currency = "SAR") => {
      sendEvent({ event: "AddToCart", productId, value, currency, quantity });
    },
    [],
  );

  const trackInitiateCheckout = useCallback(
    (value: number, items: { id: string; quantity: number }[], currency = "SAR") => {
      sendEvent({ event: "InitiateCheckout", value, currency, items });
    },
    [],
  );

  const trackSearch = useCallback((query: string) => {
    sendEvent({ event: "Search", query });
  }, []);

  return { trackProductView, trackAddToCart, trackInitiateCheckout, trackSearch };
}
