"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useAuth } from "@/features/auth/AuthProvider";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { mergeCartItem } from "@/features/cart/cart-cache";
import { getFriendlyErrorMessage } from "@/features/errors/api-errors";
import { queryKeys } from "@/features/query/query-keys";
import { getWishlistErrorMessage, wishlistQueryKey } from "@/features/wishlist/WishlistView";
import { mergeWishlistProduct } from "@/features/wishlist/wishlist-cache";
import {
  ButtonSpinner,
  LoadingState,
  SkeletonBlock
} from "@/features/ui/Loading";
import { formatCurrency } from "@/features/ui/price";
import {
  addCartItem,
  addWishlistItem,
  getProduct,
  getWishlist
} from "@/services/api";
import type { Cart } from "@/types/cart";
import type { ProductVariantListItem } from "@/types/products";
import type { WishlistProduct } from "@/types/wishlist";
import {
  canAddProductToCart,
  clampQuantity,
  findSelectedVariant,
  getInitialVariantId,
  getUnavailableReason,
  isProductNotFoundError
} from "./product-detail-state";

type ProductDetailViewProps = {
  productId: string;
};

function formatOptionType(optionType: string | null): string {
  if (!optionType) {
    return "Variant";
  }

  return optionType.charAt(0) + optionType.slice(1).toLowerCase();
}

export function ProductDetailView({
  productId
}: ProductDetailViewProps): React.ReactElement {
  const { status } = useAuth();
  const queryClient = useQueryClient();
  const isAuthenticated = status === "authenticated";
  const cartSubmitLockRef = useRef(false);
  const wishlistSubmitLockRef = useRef(false);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    null
  );
  const [quantity, setQuantity] = useState(1);
  const [cartSuccessMessage, setCartSuccessMessage] = useState<string | null>(
    null
  );
  const {
    data: product,
    error,
    isError,
    isLoading,
    refetch
  } = useQuery({
    enabled: isAuthenticated,
    queryFn: () => getProduct(productId),
    queryKey: queryKeys.product(productId)
  });
  const { data: wishlist = [], isLoading: isWishlistLoading } = useQuery({
    enabled: isAuthenticated,
    queryFn: getWishlist,
    queryKey: wishlistQueryKey
  });
  const wishlistMutation = useMutation({
    mutationFn: addWishlistItem,
    onSuccess: (wishlistProduct) => {
      queryClient.setQueryData(
        wishlistQueryKey,
        (current: WishlistProduct[] | undefined) =>
          mergeWishlistProduct(current, wishlistProduct)
      );
      void queryClient.invalidateQueries({ queryKey: wishlistQueryKey });
    },
    onSettled: () => {
      wishlistSubmitLockRef.current = false;
    }
  });
  const cartMutation = useMutation({
    mutationFn: addCartItem,
    onSuccess: (cartItem, variables) => {
      const variant = product?.variants.find(
        (item) => item.id === variables.variantId
      );

      if (product && variant) {
        queryClient.setQueryData(queryKeys.cart, (current: Cart | undefined) =>
          mergeCartItem(current, cartItem, product, variant)
        );
      }

      setCartSuccessMessage("Added to cart.");
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart });
    },
    onSettled: () => {
      cartSubmitLockRef.current = false;
    }
  });

  useEffect(() => {
    if (!product) {
      return;
    }

    setSelectedVariantId(getInitialVariantId(product));
  }, [product]);

  useEffect(() => {
    setQuantity(1);
  }, [selectedVariantId]);

  const selectedVariant = useMemo(
    () => findSelectedVariant(product, selectedVariantId),
    [product, selectedVariantId]
  );
  const maxQuantity = selectedVariant?.stock ?? 0;
  const unavailableReason = getUnavailableReason(product, selectedVariant);
  const canAddToCart = canAddProductToCart(product, selectedVariant);
  const isNotFound = isProductNotFoundError(error);
  const visibleStock = selectedVariant ? selectedVariant.stock : product?.totalStock;
  const isInWishlist = Boolean(
    product && wishlist.some((wishlistProduct) => wishlistProduct.id === product.id)
  );
  const canAddToWishlist =
    Boolean(product) &&
    !isInWishlist &&
    !isWishlistLoading &&
    !wishlistMutation.isPending;

  function handleVariantChange(variant: ProductVariantListItem): void {
    if (variant.stock <= 0) {
      return;
    }

    setCartSuccessMessage(null);
    setSelectedVariantId(variant.id);
  }

  function handleQuantityChange(value: string): void {
    setCartSuccessMessage(null);
    setQuantity(clampQuantity(Number(value), maxQuantity));
  }

  function handleAddToCart(): void {
    if (
      !product ||
      !selectedVariant ||
      !canAddToCart ||
      cartMutation.isPending ||
      cartSubmitLockRef.current
    ) {
      return;
    }

    cartSubmitLockRef.current = true;
    setCartSuccessMessage(null);
    cartMutation.mutate({
      productId: product.id,
      quantity,
      variantId: selectedVariant.id
    });
  }

  function handleAddToWishlist(): void {
    if (!product || !canAddToWishlist || wishlistSubmitLockRef.current) {
      return;
    }

    wishlistSubmitLockRef.current = true;
    wishlistMutation.mutate({ productId: product.id });
  }

  return (
    <ProtectedRoute>
      <main className="page-shell">
        <div className="page-content page-content--wide protected-layout">
          <section className="detail-header" aria-label="Product navigation">
            <Link className="text-link" href="/products">
              Back to products
            </Link>
          </section>

          <section
            aria-live="polite"
            aria-busy={
              isLoading || cartMutation.isPending || wishlistMutation.isPending
            }
          >
            {isLoading ? (
              <>
                <LoadingState message="Loading product..." />
                <div className="product-detail" aria-hidden="true">
                  <article className="product-detail__main">
                    <SkeletonBlock className="skeleton--pill" />
                    <SkeletonBlock className="skeleton--title skeleton--wide" />
                    <SkeletonBlock className="skeleton--price" />
                    <SkeletonBlock />
                    <SkeletonBlock className="skeleton--wide" />
                  </article>
                  <aside className="purchase-panel">
                    <SkeletonBlock className="skeleton--title" />
                    <SkeletonBlock />
                    <SkeletonBlock />
                    <SkeletonBlock className="skeleton--button" />
                  </aside>
                </div>
              </>
            ) : null}

            {isError && isNotFound ? (
              <div className="catalog-state">
                <div>
                  <p className="eyebrow">Not found</p>
                  <p className="message">
                    This product is no longer available in the catalog.
                  </p>
                </div>
                <Link className="button button--secondary" href="/products">
                  View products
                </Link>
              </div>
            ) : null}

            {isError && !isNotFound ? (
              <div className="catalog-state catalog-state--error" role="alert">
                <p className="message message--error">
                  {getFriendlyErrorMessage(
                    error,
                    "product",
                    "Unable to load this product right now."
                  )}
                </p>
                <button
                  className="button button--secondary"
                  onClick={() => void refetch()}
                  type="button"
                >
                  Try again
                </button>
              </div>
            ) : null}

            {!isLoading && !isError && product ? (
              <div className="product-detail">
                <article className="product-detail__main">
                  <p className="eyebrow">
                    {product.type === "CONFIGURABLE"
                      ? "Configurable product"
                      : "Simple product"}
                  </p>
                  <h1>{product.title}</h1>
                  <span className="product-detail__price">
                    {formatCurrency(product.price)}
                  </span>
                  <p className="product-detail__description">
                    {product.description}
                  </p>
                </article>

                <aside className="purchase-panel" aria-label="Purchase options">
                  <div className="stock-row">
                    <span className="status-label">Remaining stock</span>
                    <strong>{visibleStock ?? 0}</strong>
                  </div>

                  <fieldset className="variant-selector">
                    <legend>
                      {product.type === "CONFIGURABLE"
                        ? `Select ${formatOptionType(product.variants[0]?.optionType ?? null)}`
                        : "Variant"}
                    </legend>

                    <div className="variant-options">
                      {product.variants.map((variant) => {
                        const isSelected = selectedVariantId === variant.id;
                        const isOutOfStock = variant.stock <= 0;

                        return (
                          <label
                            className={
                              isOutOfStock
                                ? "variant-option variant-option--disabled"
                                : "variant-option"
                            }
                            key={variant.id}
                          >
                            <input
                              checked={isSelected}
                              disabled={
                                product.type === "SIMPLE" || isOutOfStock
                              }
                              name="product-variant"
                              onChange={() => handleVariantChange(variant)}
                              type="radio"
                              value={variant.id}
                            />
                            <span>
                              <strong>{variant.label}</strong>
                              <small>
                                {isOutOfStock
                                  ? "Out of stock"
                                  : `${variant.stock} available`}
                              </small>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  <label className="quantity-selector" htmlFor="quantity">
                    <span>Quantity</span>
                    <input
                      disabled={!selectedVariant || maxQuantity <= 0}
                      id="quantity"
                      max={Math.max(maxQuantity, 1)}
                      min={1}
                      onChange={(event) =>
                        handleQuantityChange(event.target.value)
                      }
                      type="number"
                      value={quantity}
                    />
                  </label>

                  {unavailableReason ? (
                    <p className="message">{unavailableReason}</p>
                  ) : null}

                  {wishlistMutation.error ? (
                    <p className="message message--error" role="alert">
                      {getWishlistErrorMessage(
                        wishlistMutation.error,
                        "Unable to update your wishlist.",
                        "wishlistMutation"
                      )}
                    </p>
                  ) : null}

                  {cartMutation.error ? (
                    <p className="message message--error" role="alert">
                      {getFriendlyErrorMessage(
                        cartMutation.error,
                        "cartMutation",
                        "Unable to add this item to your cart."
                      )}
                    </p>
                  ) : null}

                  {cartSuccessMessage ? (
                    <p className="message" role="status">
                      {cartSuccessMessage}
                    </p>
                  ) : null}

                  <div className="purchase-actions">
                    <button
                      className="button"
                      disabled={!canAddToCart || cartMutation.isPending}
                      aria-busy={cartMutation.isPending}
                      onClick={handleAddToCart}
                      type="button"
                    >
                      {cartMutation.isPending ? (
                        <>
                          <ButtonSpinner label="Adding to cart" />
                          Adding...
                        </>
                      ) : (
                        "Add to Cart"
                      )}
                    </button>
                    <button
                      className="button button--secondary"
                      disabled={!canAddToWishlist}
                      aria-busy={wishlistMutation.isPending}
                      onClick={handleAddToWishlist}
                      type="button"
                    >
                      {wishlistMutation.isPending ? (
                          <>
                            <ButtonSpinner label="Adding to wishlist" />
                            Adding...
                          </>
                      ) : isWishlistLoading ? (
                        <>
                          <ButtonSpinner label="Checking wishlist" />
                          Checking...
                        </>
                      ) : isInWishlist ? (
                        "In Wishlist"
                      ) : (
                        "Add to Wishlist"
                      )}
                    </button>
                  </div>
                </aside>
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
}
