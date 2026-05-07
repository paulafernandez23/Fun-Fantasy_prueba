import { CartItem } from '../store/cartStore';

/**
 * Calculates the total price of all items in the cart.
 */
export function calculateCartTotal(items: CartItem[]): number {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
}

/**
 * Validates a cart item before adding it to the cart.
 * (Placeholder for future stock/price validation against Firestore)
 */
export function validateCartItem(item: CartItem): boolean {
  if (item.quantity <= 0) return false;
  if (item.price < 0) return false;
  return true;
}
