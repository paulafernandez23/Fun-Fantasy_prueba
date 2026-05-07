import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { calculateCartTotal, validateCartItem } from '../lib/cartService';

export interface CartItem {
  cartItemId: string; // UUID of the item configuration in the cart
  id: string; // original Supabase ID
  title: string;
  price: number;
  image_url: string;
  quantity: number;
  selectedSize?: string;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        if (!validateCartItem(item)) return;
        set((state) => {
          const existingItemIndex = state.items.findIndex((i) => i.cartItemId === item.cartItemId);
          if (existingItemIndex !== -1) {
            // Immutable atomic update for existing item
            const newItems = [...state.items];
            newItems[existingItemIndex] = {
              ...newItems[existingItemIndex],
              quantity: newItems[existingItemIndex].quantity + item.quantity
            };
            return { items: newItems };
          }
          // Immutable atomic append for new item
          return { items: [...state.items, item] };
        });
      },
      removeItem: (cartItemId) => {
        set((state) => ({
          items: state.items.filter((i) => i.cartItemId !== cartItemId),
        }));
      },
      updateQuantity: (cartItemId, quantity) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.cartItemId === cartItemId ? { ...i, quantity: Math.max(1, quantity) } : i
          ),
        }));
      },
      clearCart: () => set({ items: [] }),
      getTotal: () => {
        return calculateCartTotal(get().items);
      },
    }),
    {
      name: 'ecommerce-cart',
    }
  )
);
