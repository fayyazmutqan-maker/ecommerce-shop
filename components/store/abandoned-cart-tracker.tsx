"use client";

import { useAbandonedCartTracker } from "@/hooks/use-abandoned-cart";

/**
 * Client component that silently tracks cart abandonment.
 * Placed in the store layout to run on every store page.
 */
export function AbandonedCartTracker() {
  useAbandonedCartTracker();
  return null;
}
