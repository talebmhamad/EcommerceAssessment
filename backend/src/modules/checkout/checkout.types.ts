import type { CartResponse } from "../cart/cart.types";

export type CheckoutValidationResponse = CartResponse;

export type CheckoutOrderItemResponse = {
  id: number;
  productId: number;
  variantId: number;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  productTitle: string;
  variantLabel: string;
};

export type CheckoutOrderResponse = {
  id: number;
  finalTotal: string;
  createdAt: string;
  items: CheckoutOrderItemResponse[];
};
