import type { VariantOptionType } from "@/types/products";

export type CartItemProduct = {
  id: number;
  title: string;
};

export type CartItemVariant = {
  id: number;
  label: string;
  optionType: VariantOptionType | null;
  optionValue: string | null;
  stock: number;
};

export type CartLineItem = {
  id: number;
  product: CartItemProduct;
  variant: CartItemVariant;
  quantity: number;
  unitPrice: string;
  subtotal: string;
};

export type Cart = {
  items: CartLineItem[];
  total: string;
};

export type CartItem = {
  id: number;
  productId: number;
  variantId: number;
  quantity: number;
};

export type AddCartItemRequest = {
  productId: number;
  variantId: number;
  quantity: number;
};

export type UpdateCartQuantityRequest = {
  quantity: number;
};

export type ChangeCartVariantRequest = {
  variantId: number;
};
