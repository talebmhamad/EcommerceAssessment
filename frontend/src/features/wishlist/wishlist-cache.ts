import type { WishlistProduct } from "@/types/wishlist";

export function mergeWishlistProduct(
  wishlist: WishlistProduct[] | undefined,
  product: WishlistProduct
): WishlistProduct[] {
  if (!wishlist) {
    return [product];
  }

  if (wishlist.some((item) => item.id === product.id)) {
    return wishlist;
  }

  return [...wishlist, product];
}
