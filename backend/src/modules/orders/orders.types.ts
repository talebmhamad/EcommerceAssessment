export type OrderItemResponse = {
  id: number;
  productId: number;
  variantId: number;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  productTitle: string;
  variantLabel: string;
};

export type OrderResponse = {
  id: number;
  finalTotal: string;
  createdAt: string;
  items: OrderItemResponse[];
};
