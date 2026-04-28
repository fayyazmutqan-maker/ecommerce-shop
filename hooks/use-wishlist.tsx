"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface WishlistContextValue {
  ids: Set<string>;
  isLoaded: boolean;
  has: (productId: string) => boolean;
  toggle: (productId: string) => Promise<boolean | null>;
  count: number;
}

const WishlistContext = createContext<WishlistContextValue>({
  ids: new Set(),
  isLoaded: false,
  has: () => false,
  toggle: async () => null,
  count: 0,
});

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") {
      const timeout = window.setTimeout(() => {
        setIds(new Set());
        setIsLoaded(status === "unauthenticated");
      }, 0);
      return () => window.clearTimeout(timeout);
    }

    const controller = new AbortController();

    fetch("/api/wishlist/ids", { signal: controller.signal })
      .then((r) => r.json())
      .then((data: string[]) => {
        setIds(new Set(data));
        setIsLoaded(true);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setIsLoaded(true);
      });

    return () => controller.abort();
  }, [status]);

  const has = useCallback((productId: string) => ids.has(productId), [ids]);

  const toggle = useCallback(
    async (productId: string): Promise<boolean | null> => {
      if (status !== "authenticated") return null;

      // Optimistic update
      const wasInList = ids.has(productId);
      setIds((prev) => {
        const next = new Set(prev);
        if (wasInList) next.delete(productId);
        else next.add(productId);
        return next;
      });

      try {
        const res = await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });

        if (!res.ok) {
          // Revert on failure
          setIds((prev) => {
            const next = new Set(prev);
            if (wasInList) next.add(productId);
            else next.delete(productId);
            return next;
          });
          return null;
        }

        const data = await res.json();
        return data.added ?? !wasInList;
      } catch {
        // Revert on error
        setIds((prev) => {
          const next = new Set(prev);
          if (wasInList) next.add(productId);
          else next.delete(productId);
          return next;
        });
        return null;
      }
    },
    [ids, status],
  );

  return (
    <WishlistContext.Provider value={{ ids, isLoaded, has, toggle, count: ids.size }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  return useContext(WishlistContext);
}
