export type WishlistProduct = {
  id: number;
  title: string;
  price: string;
};

export type AddWishlistItemRequest = {
  productId: number;
};
