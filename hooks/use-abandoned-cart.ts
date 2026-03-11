"use client";

import { useEffect, useRef } from "react";
import { useCartStore } from "@/lib/store";

/**
 * Hook that automatically saves cart data as an abandoned cart
 * when the user has items and navigates away or is idle.
 *
 * Triggers:
 * - `beforeunload` (tab close / navigate away)
 * - Periodic sync every 60 seconds while cart has items
 * - `visibilitychange` when the tab becomes hidden
 */
export function useAbandonedCartTracker() {
  const items = useCartStore((s) => s.items);
  const getTotal = useCartStore((s) => s.getTotal);
  const lastSyncRef = useRef<number>(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync cart to server — debounced & deduplicated
  const syncCart = async (force = false) => {
    if (items.length === 0) return;

    const now = Date.now();
    // Don't sync more than once every 30 seconds unless forced
    if (!force && now - lastSyncRef.current < 30_000) return;
    lastSyncRef.current = now;

    try {
      const payload = {
        items: items.map((item) => ({
          productId: item.productId || item.id,
          variantId: item.variantId || null,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image || "",
          variantName: item.variantName || "",
        })),
        subtotal: getTotal(),
      };

      // Use sendBeacon for beforeunload, fetch otherwise
      const url = "/api/abandoned-carts";
      if (typeof navigator.sendBeacon === "function" && force) {
        navigator.sendBeacon(url, JSON.stringify(payload));
      } else {
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        });
      }
    } catch {
      // Silently fail — this is non-critical
    }
  };

  useEffect(() => {
    if (items.length === 0) return;

    // Debounce: sync 5 seconds after any cart change
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => syncCart(), 5000);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  useEffect(() => {
    // Sync on tab close / navigate away
    const handleBeforeUnload = () => {
      if (items.length > 0) syncCart(true);
    };

    // Sync when tab becomes hidden
    const handleVisibilityChange = () => {
      if (document.hidden && items.length > 0) syncCart(true);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Periodic sync every 60 seconds
    const interval = setInterval(() => {
      if (items.length > 0) syncCart();
    }, 60_000);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);
}
