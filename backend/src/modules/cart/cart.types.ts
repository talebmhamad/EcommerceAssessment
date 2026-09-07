export type CartItemResponse = {
  id: number;
  productId: number;
  variantId: number;
  quantity: number;
};

export type CartItemProductResponse = {
  id: number;
  title: string;
};

export type CartItemVariantResponse = {
  id: number;
  label: string;
  optionType: string | null;
  optionValue: string | null;
  stock: number;
};

export type CartLineItemResponse = {
  id: number;
  product: CartItemProductResponse;
  variant: CartItemVariantResponse;
  quantity: number;
  unitPrice: string;
  subtotal: string;
};

export type CartResponse = {
  items: CartLineItemResponse[];
  total: string;
};
