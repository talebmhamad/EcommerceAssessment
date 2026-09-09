"use client";

import { useEffect, useState } from "react";
import { useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useAuth } from "@/features/auth/AuthProvider";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { cartMutationKey, cartQueryKey, createCartMutationOptions } from "@/features/cart/cart-query";
import { getFriendlyErrorMessage } from "@/features/errors/api-errors";
import { queryKeys } from "@/features/query/query-keys";
import { EmptyState } from "@/features/ui/EmptyState";
import {
  ButtonSpinner,
  LoadingState,
  SkeletonBlock,
} from "@/features/ui/Loading";
import { formatCurrency } from "@/features/ui/price";
import {
  changeCartItemVariant,
  getCart,
  getProducts,
  removeCartItem,
  updateCartItemQuantity,
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
  item: CartLineItem,
): ProductListItem | undefined {
  return products.find((product) => product.id === item.product.id);
}

function getVariantOptions(
  products: ProductListItem[],
  item: CartLineItem,
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

const primaryButtonClassName =
  "inline-flex min-h-[var(--control-height)] items-center justify-center gap-2 rounded-[var(--radius)] border border-[var(--accent)] bg-[var(--accent)] px-[18px] text-center font-extrabold leading-none text-white no-underline transition hover:-translate-y-px hover:border-[var(--accent-strong)] hover:bg-[var(--accent-strong)] hover:shadow-[var(--shadow-sm)] disabled:cursor-not-allowed disabled:opacity-[0.55]";

const secondaryButtonClassName =
  "inline-flex min-h-[var(--control-height)] items-center justify-center gap-2 rounded-[var(--radius)] border border-[var(--border)] bg-white px-[18px] text-center font-extrabold leading-none text-[var(--foreground)] no-underline transition hover:-translate-y-px hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)] hover:shadow-[var(--shadow-sm)] disabled:cursor-not-allowed disabled:opacity-[0.55]";

const dangerButtonClassName =
  "inline-flex min-h-[var(--control-height)] w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius)] border border-[#f3b6b1] bg-white px-4 text-center font-extrabold leading-none text-[var(--danger)] no-underline transition enabled:hover:-translate-y-px enabled:hover:border-[var(--danger)] enabled:hover:bg-[var(--danger-bg)] enabled:hover:shadow-[var(--shadow-sm)] disabled:cursor-not-allowed disabled:opacity-[0.55] md:col-span-2 xl:col-span-1 xl:w-auto";

const cartLinesClassName = "grid min-w-0 gap-3.5";

const cartLineClassName =
  "grid min-h-[126px] min-w-0 grid-cols-1 gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--panel)] p-4 shadow-[0_1px_2px_rgb(23_32_51_/_4%)] md:grid-cols-2 xl:grid-cols-[minmax(140px,1.4fr)_minmax(180px,1.1fr)_minmax(80px,0.55fr)_132px_minmax(84px,0.6fr)_auto] xl:items-center";

const cartAlertClassName =
  "flex flex-col gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--panel)] p-3.5 shadow-[0_1px_2px_rgb(23_32_51_/_4%)] sm:flex-row sm:items-center sm:justify-between";

const cartErrorAlertClassName = `${cartAlertClassName} border-[#f3b6b1] bg-[#fff8f7]`;

const cartSummaryClassName =
  "grid min-w-0 gap-[18px] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--panel)] p-5 shadow-[var(--shadow-sm)] max-sm:p-4 xl:sticky xl:top-[92px] xl:min-w-[280px]";

const fieldLabelClassName = "grid min-w-0 gap-2 md:col-span-2 xl:col-span-1";

const selectClassName =
  "min-h-[42px] w-full min-w-0 rounded-[var(--radius)] border border-[var(--border)] bg-white px-2.5 py-2 text-[var(--foreground)] transition hover:border-[var(--border-strong)] focus:border-[var(--accent)] focus:outline-none focus:ring-4 focus:ring-[var(--focus-ring)] disabled:bg-[#eef2f7] disabled:text-[var(--muted)]";

const priceBlockClassName = "grid min-w-0 gap-[7px]";

export function CartView(): React.ReactElement {
  const { status } = useAuth();
  const queryClient = useQueryClient();
  const isAuthenticated = status === "authenticated";
  const isCartMutating = useIsMutating({ mutationKey: cartMutationKey }) > 0;
  const [quantityDrafts, setQuantityDrafts] = useState<Record<number, string>>(
    {},
  );

  const {
    data: cart,
    error: cartError,
    isError: isCartError,
    isFetching: isCartFetching,
    isLoading: isCartLoading,
    refetch: refetchCart,
  } = useQuery({
    enabled: isAuthenticated,
    queryFn: getCart,
    queryKey: cartQueryKey,
  });
  const {
    data: products = [],
    error: productsError,
    isError: isProductsError,
    isFetching: isProductsFetching,
    isLoading: isProductsLoading,
    refetch: refetchProducts,
  } = useQuery({
    enabled: isAuthenticated,
    queryFn: getProducts,
    queryKey: queryKeys.products,
  });

  useEffect(() => {
    if (!cart) {
      return;
    }

    setQuantityDrafts(
      Object.fromEntries(
        cart.items.map((item) => [item.id, String(item.quantity)]),
      ),
    );
  }, [cart]);

  const updateCartCache = (nextCart: Cart): void => {
    queryClient.setQueryData(cartQueryKey, nextCart);
  };

  const quantityMutation = useMutation(createCartMutationOptions(queryClient, {
    mutationFn: ({
      cartItemId,
      quantity,
    }: {
      cartItemId: number;
      quantity: number;
    }) => updateCartItemQuantity(cartItemId, { quantity }),
    onSuccess: updateCartCache,
    onError: (_error, { cartItemId }) => {
      const confirmedItem = queryClient.getQueryData<Cart>(cartQueryKey)?.items
        .find((item) => item.id === cartItemId);
      if (confirmedItem) {
        setQuantityDrafts((drafts) => ({
          ...drafts,
          [cartItemId]: String(confirmedItem.quantity),
        }));
      }
    },
  }));
  const variantMutation = useMutation(createCartMutationOptions(queryClient, {
    mutationFn: ({
      cartItemId,
      variantId,
    }: {
      cartItemId: number;
      variantId: number;
    }) => changeCartItemVariant(cartItemId, { variantId }),
    onSuccess: updateCartCache,
  }));
  const removeMutation = useMutation(createCartMutationOptions(queryClient, {
    mutationFn: removeCartItem,
    onSuccess: updateCartCache,
  }));

  const mutationError =
    quantityMutation.error ?? variantMutation.error ?? removeMutation.error;
  function isCartBusy(): boolean {
    return queryClient.isMutating({ mutationKey: cartMutationKey }) > 0;
  }

  function resetMutationErrors(): void {
    quantityMutation.reset();
    variantMutation.reset();
    removeMutation.reset();
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
      [item.id]: String(
        clampQuantity(Number(numericValue), item.variant.stock),
      ),
    }));
  }

  function commitQuantity(item: CartLineItem): void {
    if (isCartBusy()) {
      return;
    }

    const nextQuantity = clampQuantity(
      Number(quantityDrafts[item.id]),
      item.variant.stock,
    );

    setQuantityDrafts((drafts) => ({
      ...drafts,
      [item.id]: String(nextQuantity),
    }));

    if (nextQuantity === item.quantity || item.variant.stock < 1) {
      return;
    }

    resetMutationErrors();
    quantityMutation.mutate({
      cartItemId: item.id,
      quantity: nextQuantity,
    });
  }

  function adjustQuantity(item: CartLineItem, delta: number): void {
    if (isCartBusy()) {
      return;
    }

    const nextQuantity = clampQuantity(
      item.quantity + delta,
      item.variant.stock,
    );

    if (nextQuantity === item.quantity || item.variant.stock < 1) {
      return;
    }

    resetMutationErrors();
    setQuantityDrafts((drafts) => ({
      ...drafts,
      [item.id]: String(nextQuantity),
    }));
    quantityMutation.mutate({
      cartItemId: item.id,
      quantity: nextQuantity,
    });
  }

  function handleVariantChange(item: CartLineItem, variantId: number): void {
    if (variantId === item.variant.id || isCartBusy()) {
      return;
    }

    resetMutationErrors();
    variantMutation.mutate({
      cartItemId: item.id,
      variantId,
    });
  }

  function handleRemove(item: CartLineItem): void {
    if (isCartBusy()) {
      return;
    }

    resetMutationErrors();
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
                <div className={cartLinesClassName} aria-hidden="true">
                  {Array.from({ length: 2 }, (_, index) => (
                    <article className={cartLineClassName} key={index}>
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
                    "Unable to load your cart.",
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
              <div className="grid min-w-0 grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
                <div className={cartLinesClassName} aria-label="Cart items">
                  {isProductsError ? (
                    <div className={cartAlertClassName} role="alert">
                      <p className="message message--error">
                        {getFriendlyErrorMessage(
                          productsError,
                          "products",
                          "Unable to load variant choices.",
                        )}
                      </p>
                      <button
                        className={secondaryButtonClassName}
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
                    <div className={cartErrorAlertClassName} role="alert">
                      <p className="message message--error">
                        {getFriendlyErrorMessage(
                          mutationError,
                          "cartMutation",
                          "Unable to update your cart.",
                        )}
                      </p>
                    </div>
                  ) : null}

                  {cart.items.map((item) => {
                    const variants = getVariantOptions(products, item);
                    const isPending = isCartMutating;
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
                        className={cartLineClassName}
                        key={item.id}
                      >
                        <div className="grid min-w-0 gap-[7px] md:col-span-2 xl:col-span-1">
                          <h2 className="m-0 break-words text-base leading-[1.35]">
                            {item.product.title}
                          </h2>
                          <p className="m-0 break-words font-bold text-[var(--accent-strong)]">
                            {formatVariantLabel(item.variant)}
                          </p>
                          <p className="message">{getStockLabel(item)}</p>
                          {isUpdatingVariant ? (
                            <p className="message" role="status">
                              Updating variant...
                            </p>
                          ) : null}
                        </div>

                        <label className={fieldLabelClassName}>
                          <span className="text-[0.82rem] font-extrabold text-[var(--foreground)]">
                            Selected variant
                          </span>
                          <select
                            className={selectClassName}
                            disabled={isVariantSelectDisabled}
                            onChange={(event) =>
                              handleVariantChange(
                                item,
                                Number(event.target.value),
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

                        <div className={priceBlockClassName}>
                          <span className="status-label">Unit price</span>
                          <strong className="break-words text-[1.02rem]">
                            {formatCurrency(item.unitPrice)}
                          </strong>
                        </div>

                        <div className="grid min-w-0 gap-[7px]">
                          <span className="status-label">Quantity</span>
                          <div className="grid min-h-[var(--control-height)] w-full grid-cols-[36px_minmax(52px,1fr)_36px] sm:w-[132px]">
                            <button
                              aria-label={`Decrease ${item.product.title} quantity`}
                              className="min-w-0 cursor-pointer rounded-l-[var(--radius)] border border-[var(--border)] bg-white text-center font-extrabold text-[var(--foreground)] transition enabled:hover:border-[var(--accent)] enabled:hover:bg-[var(--accent-soft)] enabled:hover:text-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-[0.55]"
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
                              className="min-w-0 rounded-none border-y border-[var(--border)] bg-white text-center text-[var(--foreground)] disabled:bg-[#eef2f7] disabled:text-[var(--muted)]"
                              disabled={isPending || item.variant.stock < 1}
                              inputMode="numeric"
                              max={Math.max(item.variant.stock, 1)}
                              min={1}
                              onBlur={() => commitQuantity(item)}
                              onChange={(event) =>
                                handleQuantityDraftChange(
                                  item,
                                  event.target.value,
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
                              className="min-w-0 cursor-pointer rounded-r-[var(--radius)] border border-[var(--border)] bg-white text-center font-extrabold text-[var(--foreground)] transition enabled:hover:border-[var(--accent)] enabled:hover:bg-[var(--accent-soft)] enabled:hover:text-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-[0.55]"
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

                        <div
                          className={`${priceBlockClassName} md:col-span-1 xl:col-span-1`}
                        >
                          <span className="status-label">Subtotal</span>
                          <strong className="break-words text-[1.28rem]">
                            {formatCurrency(item.subtotal)}
                          </strong>
                        </div>

                        <button
                          className={dangerButtonClassName}
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

                <aside
                  className={cartSummaryClassName}
                  aria-label="Cart summary"
                >
                  <div>
                    <span className="status-label">Total</span>
                    <strong className="text-[1.28rem]">
                      {formatCurrency(cart.total)}
                    </strong>
                  </div>
                  <Link
                    aria-disabled={isCartMutating}
                    className={primaryButtonClassName}
                    href="/checkout"
                    onClick={(event) => {
                      // An input blur may have started a save before this click.
                      if (isCartBusy()) event.preventDefault();
                    }}
                  >
                    Checkout
                  </Link>
                  <Link className={secondaryButtonClassName} href="/products">
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
