export type CheckoutOrderItem = {
  id: number;
  productId: number;
  variantId: number;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  productTitle: string;
  variantLabel: string;
};

export type CheckoutOrder = {
  id: number;
  finalTotal: string;
  createdAt: string;
  items: CheckoutOrderItem[];
};
