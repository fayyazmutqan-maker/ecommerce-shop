import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItemData } from "@/types";

interface CartStore {
  items: CartItemData[];
  addItem: (item: CartItemData) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const itemProductId = item.productId || item.id;
        const existing = get().items.find(
          (i) =>
            (i.productId || i.id) === itemProductId && i.variantId === item.variantId
        );
        if (existing) {
          set({
            items: get().items.map((i) =>
              (i.productId || i.id) === itemProductId && i.variantId === item.variantId
                ? {
                    ...i,
                    quantity: Math.min(
                      i.quantity + item.quantity,
                      i.maxQuantity || 9999
                    ),
                  }
                : i
            ),
          });
        } else {
          set({ items: [...get().items, { ...item, productId: itemProductId }] });
        }
      },

      removeItem: (id) => {
        set({ items: get().items.filter((i) => (i.productId || i.id) !== id) });
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          set({ items: get().items.filter((i) => (i.productId || i.id) !== id) });
          return;
        }
        set({
          items: get().items.map((i) =>
            (i.productId || i.id) === id
              ? { ...i, quantity: Math.min(quantity, i.maxQuantity || 9999) }
              : i
          ),
        });
      },

      clearCart: () => set({ items: [] }),

      getTotal: () =>
        get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),

      getItemCount: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    {
      name: "cart-storage",
    }
  )
);
