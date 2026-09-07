import type { Cart, CartLineItem } from "@/types/cart";

export function getStockLabel(item: CartLineItem): string {
  if (item.variant.stock <= 0) {
    return "Out of stock";
  }

  return `${item.variant.stock} available`;
}

export function hasStockIssue(cart: Cart | undefined): boolean {
  return Boolean(
    cart?.items.some(
      (item) => item.variant.stock <= 0 || item.quantity > item.variant.stock
    )
  );
}

export function canPlaceCheckoutOrder(
  cart: Cart | undefined,
  isCheckoutPending: boolean
): boolean {
  return Boolean(
    cart && cart.items.length > 0 && !hasStockIssue(cart) && !isCheckoutPending
  );
}
