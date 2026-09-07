"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";
import Link from "next/link";
import { useAuth } from "@/features/auth/AuthProvider";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { cartQueryKey } from "@/features/cart/cart-query";
import { getFriendlyErrorMessage } from "@/features/errors/api-errors";
import { queryKeys } from "@/features/query/query-keys";
import { EmptyState } from "@/features/ui/EmptyState";
import {
  ButtonSpinner,
  LoadingState,
  SkeletonBlock
} from "@/features/ui/Loading";
import { formatCurrency } from "@/features/ui/price";
import {
  changeCartItemVariant,
  getCart,
  getProducts,
  removeCartItem,
  updateCartItemQuantity
} from "@/services/api";
import type { Cart, CartLineItem } from "@/types/cart";
import type { ProductListItem, ProductVariantListItem } from "@/types/products";

function formatOptionType(optionType: string | null): string {
  if (!optionType) {
    return "Variant";
  }

  return optionType.charAt(0) + optionType.slice(1).toLowerCase();
}

function formatVariantLabel(variant: ProductVariantListItem): string {
  if (!variant.optionType || !variant.optionValue) {
    return variant.label;
  }

  return `${formatOptionType(variant.optionType)}: ${variant.optionValue}`;
}

function clampQuantity(value: number, max: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(Math.max(Math.trunc(value), 1), Math.max(max, 1));
}

function getProductForItem(
  products: ProductListItem[],
  item: CartLineItem
): ProductListItem | undefined {
  return products.find((product) => product.id === item.product.id);
}

function getVariantOptions(
  products: ProductListItem[],
  item: CartLineItem
): ProductVariantListItem[] {
  const product = getProductForItem(products, item);

  return product?.variants ?? [item.variant];
}

function getStockLabel(item: CartLineItem): string {
  if (item.variant.stock <= 0) {
    return "Out of stock";
  }

  return `${item.variant.stock} available`;
}

export function CartView(): React.ReactElement {
  const { status } = useAuth();
  const queryClient = useQueryClient();
  const isAuthenticated = status === "authenticated";
  const lineLocksRef = useRef<Set<number>>(new Set());
  const [quantityDrafts, setQuantityDrafts] = useState<Record<number, string>>(
    {}
  );

  const {
    data: cart,
    error: cartError,
    isError: isCartError,
    isFetching: isCartFetching,
    isLoading: isCartLoading,
    refetch: refetchCart
  } = useQuery({
    enabled: isAuthenticated,
    queryFn: getCart,
    queryKey: cartQueryKey
  });
  const {
    data: products = [],
    error: productsError,
    isError: isProductsError,
    isFetching: isProductsFetching,
    isLoading: isProductsLoading,
    refetch: refetchProducts
  } = useQuery({
    enabled: isAuthenticated,
    queryFn: getProducts,
    queryKey: queryKeys.products
  });

  useEffect(() => {
    if (!cart) {
      return;
    }

    setQuantityDrafts(
      Object.fromEntries(
        cart.items.map((item) => [item.id, String(item.quantity)])
      )
    );
  }, [cart]);

  const updateCartCache = (nextCart: Cart): void => {
    queryClient.setQueryData(cartQueryKey, nextCart);
  };

  const quantityMutation = useMutation({
    mutationFn: ({
      cartItemId,
      quantity
    }: {
      cartItemId: number;
      quantity: number;
    }) => updateCartItemQuantity(cartItemId, { quantity }),
    onSuccess: updateCartCache,
    onSettled: (_data, _error, variables) => {
      lineLocksRef.current.delete(variables.cartItemId);
    }
  });
  const variantMutation = useMutation({
    mutationFn: ({
      cartItemId,
      variantId
    }: {
      cartItemId: number;
      variantId: number;
    }) => changeCartItemVariant(cartItemId, { variantId }),
    onSuccess: updateCartCache,
    onSettled: (_data, _error, variables) => {
      lineLocksRef.current.delete(variables.cartItemId);
    }
  });
  const removeMutation = useMutation({
    mutationFn: removeCartItem,
    onSuccess: updateCartCache,
    onSettled: (_data, _error, variables) => {
      lineLocksRef.current.delete(variables);
    }
  });

  const mutationError =
    quantityMutation.error ?? variantMutation.error ?? removeMutation.error;
  const pendingCartItemIds = useMemo(
    () =>
      new Set(
        [
          quantityMutation.variables?.cartItemId,
          variantMutation.variables?.cartItemId,
          removeMutation.variables
        ].filter((value): value is number => typeof value === "number")
      ),
    [
      quantityMutation.variables,
      variantMutation.variables,
      removeMutation.variables
    ]
  );

  function isLinePending(cartItemId: number): boolean {
    return (
      lineLocksRef.current.has(cartItemId) ||
      (pendingCartItemIds.has(cartItemId) &&
        (quantityMutation.isPending ||
          variantMutation.isPending ||
          removeMutation.isPending))
    );
  }

  function isQuantityPending(cartItemId: number): boolean {
    return (
      quantityMutation.isPending &&
      quantityMutation.variables?.cartItemId === cartItemId
    );
  }

  function isVariantPending(cartItemId: number): boolean {
    return (
      variantMutation.isPending &&
      variantMutation.variables?.cartItemId === cartItemId
    );
  }

  function isRemovePending(cartItemId: number): boolean {
    return removeMutation.isPending && removeMutation.variables === cartItemId;
  }

  function handleQuantityDraftChange(item: CartLineItem, value: string): void {
    const numericValue = value.replace(/\D/g, "");

    if (!numericValue) {
      setQuantityDrafts((drafts) => ({ ...drafts, [item.id]: "" }));
      return;
    }

    setQuantityDrafts((drafts) => ({
      ...drafts,
      [item.id]: String(clampQuantity(Number(numericValue), item.variant.stock))
    }));
  }

  function commitQuantity(item: CartLineItem): void {
    if (isLinePending(item.id)) {
      return;
    }

    const nextQuantity = clampQuantity(
      Number(quantityDrafts[item.id]),
      item.variant.stock
    );

    setQuantityDrafts((drafts) => ({
      ...drafts,
      [item.id]: String(nextQuantity)
    }));

    if (nextQuantity === item.quantity || item.variant.stock < 1) {
      return;
    }

    lineLocksRef.current.add(item.id);
    quantityMutation.mutate({
      cartItemId: item.id,
      quantity: nextQuantity
    });
  }

  function adjustQuantity(item: CartLineItem, delta: number): void {
    if (isLinePending(item.id)) {
      return;
    }

    const nextQuantity = clampQuantity(
      item.quantity + delta,
      item.variant.stock
    );

    if (nextQuantity === item.quantity || item.variant.stock < 1) {
      return;
    }

    lineLocksRef.current.add(item.id);
    setQuantityDrafts((drafts) => ({
      ...drafts,
      [item.id]: String(nextQuantity)
    }));
    quantityMutation.mutate({
      cartItemId: item.id,
      quantity: nextQuantity
    });
  }

  function handleVariantChange(item: CartLineItem, variantId: number): void {
    if (variantId === item.variant.id || isLinePending(item.id)) {
      return;
    }

    lineLocksRef.current.add(item.id);
    variantMutation.mutate({
      cartItemId: item.id,
      variantId
    });
  }

  function handleRemove(item: CartLineItem): void {
    if (isLinePending(item.id)) {
      return;
    }

    lineLocksRef.current.add(item.id);
    removeMutation.mutate(item.id);
  }

  return (
    <ProtectedRoute>
      <main className="page-shell">
        <div className="page-content page-content--wide protected-layout">
          <section className="catalog-header" aria-labelledby="cart-title">
            <div>
              <p className="eyebrow">Cart</p>
              <h1 id="cart-title">Shopping cart</h1>
              <p className="lead">
                Review selected items, adjust quantities, and keep variant
                choices in sync with current stock.
              </p>
            </div>
          </section>

          <section
            aria-live="polite"
            aria-busy={
              isCartLoading ||
              quantityMutation.isPending ||
              variantMutation.isPending ||
              removeMutation.isPending
            }
          >
            {isCartLoading ? (
              <>
                <LoadingState message="Loading cart..." />
                <div className="cart-lines" aria-hidden="true">
                  {Array.from({ length: 2 }, (_, index) => (
                    <article className="cart-line" key={index}>
                      <SkeletonBlock className="skeleton--title" />
                      <SkeletonBlock />
                      <SkeletonBlock className="skeleton--price" />
                      <SkeletonBlock className="skeleton--button" />
                      <SkeletonBlock className="skeleton--price" />
                      <SkeletonBlock className="skeleton--button" />
                    </article>
                  ))}
                </div>
              </>
            ) : null}

            {isCartError ? (
              <div className="catalog-state catalog-state--error" role="alert">
                <p className="message message--error">
                  {getFriendlyErrorMessage(
                    cartError,
                    "cart",
                    "Unable to load your cart."
                  )}
                </p>
                <button
                  className="button button--secondary"
                  disabled={isCartFetching}
                  onClick={() => void refetchCart()}
                  type="button"
                >
                  {isCartFetching ? (
                    <>
                      <ButtonSpinner label="Retrying cart" />
                      Retrying...
                    </>
                  ) : (
                    "Try again"
                  )}
                </button>
              </div>
            ) : null}

            {!isCartLoading && !isCartError && cart?.items.length === 0 ? (
              <EmptyState
                action={
                  <Link className="button button--secondary" href="/products">
                    Browse products
                  </Link>
                }
                message="Add products to your cart when you are ready to check out."
                title="Your cart is empty."
              />
            ) : null}

            {!isCartLoading && !isCartError && cart && cart.items.length > 0 ? (
              <div className="cart-layout">
                <div className="cart-lines" aria-label="Cart items">
                  {isProductsError ? (
                    <div className="cart-alert" role="alert">
                      <p className="message message--error">
                        {getFriendlyErrorMessage(
                          productsError,
                          "products",
                          "Unable to load variant choices."
                        )}
                      </p>
                      <button
                        className="button button--secondary"
                        disabled={isProductsFetching}
                        onClick={() => void refetchProducts()}
                        type="button"
                      >
                        {isProductsFetching ? (
                          <>
                            <ButtonSpinner label="Retrying variants" />
                            Retrying...
                          </>
                        ) : (
                          "Retry variants"
                        )}
                      </button>
                    </div>
                  ) : null}

                  {mutationError ? (
                    <div className="cart-alert cart-alert--error" role="alert">
                      <p className="message message--error">
                        {getFriendlyErrorMessage(
                          mutationError,
                          "cartMutation",
                          "Unable to update your cart."
                        )}
                      </p>
                    </div>
                  ) : null}

                  {cart.items.map((item) => {
                    const variants = getVariantOptions(products, item);
                    const isPending = isLinePending(item.id);
                    const isUpdatingQuantity = isQuantityPending(item.id);
                    const isUpdatingVariant = isVariantPending(item.id);
                    const isRemoving = isRemovePending(item.id);
                    const isVariantSelectDisabled =
                      isPending ||
                      isProductsLoading ||
                      variants.length <= 1 ||
                      isProductsError;
                    const quantityDraft =
                      quantityDrafts[item.id] ?? String(item.quantity);

                    return (
                      <article
                        aria-busy={isPending}
                        className="cart-line"
                        key={item.id}
                      >
                        <div className="cart-line__details">
                          <h2>{item.product.title}</h2>
                          <p className="cart-line__variant">
                            {formatVariantLabel(item.variant)}
                          </p>
                          <p className="message">{getStockLabel(item)}</p>
                          {isUpdatingVariant ? (
                            <p className="message" role="status">
                              Updating variant...
                            </p>
                          ) : null}
                        </div>

                        <label className="cart-select">
                          <span>Selected variant</span>
                          <select
                            disabled={isVariantSelectDisabled}
                            onChange={(event) =>
                              handleVariantChange(
                                item,
                                Number(event.target.value)
                              )
                            }
                            value={item.variant.id}
                          >
                            {variants.map((variant) => {
                              const isCurrentVariant =
                                variant.id === item.variant.id;
                              const cannotSupportQuantity =
                                variant.stock < item.quantity;
                              const isUnavailable =
                                !isCurrentVariant &&
                                (variant.stock < 1 || cannotSupportQuantity);

                              return (
                                <option
                                  disabled={isUnavailable}
                                  key={variant.id}
                                  value={variant.id}
                                >
                                  {formatVariantLabel(variant)} -{" "}
                                  {variant.stock < 1
                                    ? "out of stock"
                                    : `${variant.stock} available`}
                                </option>
                              );
                            })}
                          </select>
                        </label>

                        <div className="cart-price-block">
                          <span className="status-label">Unit price</span>
                          <strong>{formatCurrency(item.unitPrice)}</strong>
                        </div>

                        <div className="cart-quantity">
                          <span className="status-label">Quantity</span>
                          <div className="cart-quantity__controls">
                            <button
                              aria-label={`Decrease ${item.product.title} quantity`}
                              disabled={
                                isPending ||
                                item.quantity <= 1 ||
                                item.variant.stock < 1
                              }
                              onClick={() => adjustQuantity(item, -1)}
                              type="button"
                            >
                              {isUpdatingQuantity ? (
                                <ButtonSpinner label="Updating quantity" />
                              ) : (
                                "-"
                              )}
                            </button>
                            <input
                              aria-label={`Quantity for ${item.product.title}`}
                              disabled={isPending || item.variant.stock < 1}
                              inputMode="numeric"
                              max={Math.max(item.variant.stock, 1)}
                              min={1}
                              onBlur={() => commitQuantity(item)}
                              onChange={(event) =>
                                handleQuantityDraftChange(
                                  item,
                                  event.target.value
                                )
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.currentTarget.blur();
                                }
                              }}
                              type="number"
                              value={quantityDraft}
                            />
                            <button
                              aria-label={`Increase ${item.product.title} quantity`}
                              disabled={
                                isPending ||
                                item.quantity >= item.variant.stock ||
                                item.variant.stock < 1
                              }
                              onClick={() => adjustQuantity(item, 1)}
                              type="button"
                            >
                              {isUpdatingQuantity ? (
                                <ButtonSpinner label="Updating quantity" />
                              ) : (
                                "+"
                              )}
                            </button>
                          </div>
                        </div>

                        <div className="cart-price-block cart-price-block--subtotal">
                          <span className="status-label">Subtotal</span>
                          <strong>{formatCurrency(item.subtotal)}</strong>
                        </div>

                        <button
                          className="button button--danger cart-remove"
                          disabled={isPending}
                          onClick={() => handleRemove(item)}
                          type="button"
                        >
                          {isRemoving ? (
                            <>
                              <ButtonSpinner label="Removing item" />
                              Removing...
                            </>
                          ) : (
                            "Remove"
                          )}
                        </button>
                      </article>
                    );
                  })}
                </div>

                <aside className="cart-summary" aria-label="Cart summary">
                  <div>
                    <span className="status-label">Total</span>
                    <strong>{formatCurrency(cart.total)}</strong>
                  </div>
                  <Link className="button" href="/checkout">
                    Checkout
                  </Link>
                  <Link className="button button--secondary" href="/products">
                    Browse products
                  </Link>
                </aside>
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
}
