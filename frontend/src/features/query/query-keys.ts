export const queryKeys = {
  cart: ["cart"] as const,
  order: (orderId: string | number) => ["orders", String(orderId)] as const,
  product: (productId: string | number) =>
    ["products", String(productId)] as const,
  products: ["products"] as const,
  wishlist: ["wishlist"] as const
};
