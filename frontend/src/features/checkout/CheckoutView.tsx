"use client";

import { useRef } from "react";
import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient
} from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { cartMutationKey, cartQueryKey, createCartMutationOptions } from "@/features/cart/cart-query";
import {
  canPlaceCheckoutOrder,
  getStockLabel,
  hasStockIssue
} from "@/features/checkout/checkout-state";
import {
  getFriendlyErrorMessage,
  getValidationIssueMessages
} from "@/features/errors/api-errors";
import { queryKeys } from "@/features/query/query-keys";
import { EmptyState } from "@/features/ui/EmptyState";
import {
  ButtonSpinner,
  LoadingState,
  SkeletonBlock
} from "@/features/ui/Loading";
import { formatCurrency } from "@/features/ui/price";
import { getCart, placeOrder } from "@/services/api";
import type { Cart, CartLineItem } from "@/types/cart";

function formatOptionType(optionType: string | null): string {
  if (!optionType) {
    return "Variant";
  }

  return optionType.charAt(0) + optionType.slice(1).toLowerCase();
}

function formatVariantLabel(item: CartLineItem): string {
  if (!item.variant.optionType || !item.variant.optionValue) {
    return item.variant.label;
  }

  return `${formatOptionType(item.variant.optionType)}: ${item.variant.optionValue}`;
}

export function CheckoutView(): React.ReactElement {
  const { status } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const checkoutLockRef = useRef(false);
  const isCartMutating = useIsMutating({ mutationKey: cartMutationKey }) > 0;
  const {
    data: cart,
    error: cartError,
    isError: isCartError,
    isFetching: isCartFetching,
    isLoading: isCartLoading,
    refetch
  } = useQuery({
    enabled: status === "authenticated",
    queryFn: getCart,
    queryKey: cartQueryKey,
    refetchOnMount: "always"
  });
  const checkoutMutation = useMutation(createCartMutationOptions(queryClient, {
    mutationFn: placeOrder,
    onSuccess: (order) => {
      queryClient.setQueryData<Cart>(cartQueryKey, {
        items: [],
        total: "0.00"
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.products });
      router.replace(`/orders/${order.id}/confirmation`);
    },
    onError: () => {
      checkoutLockRef.current = false;
    }
  }));

  const stockIssue = hasStockIssue(cart);
  const cartItemCount = cart?.items.length ?? 0;
  const isCartEmpty = cartItemCount === 0;
  const canPlaceOrder = canPlaceCheckoutOrder(
    cart,
    isCartMutating || isCartFetching || isCartError
  );

  function handlePlaceOrder(): void {
    if (!canPlaceOrder || checkoutLockRef.current || queryClient.isMutating({ mutationKey: cartMutationKey }) > 0) {
      return;
    }

    checkoutLockRef.current = true;
    checkoutMutation.mutate();
  }

  return (
    <ProtectedRoute>
      <main className="page-shell">
        <div className="page-content page-content--wide protected-layout">
          <section className="catalog-header" aria-labelledby="checkout-title">
            <div>
              <p className="eyebrow">Checkout</p>
              <h1 id="checkout-title">Review order</h1>
              <p className="lead">
                Review your items and total before placing your order.
              </p>
            </div>
          </section>

          <section
            aria-live="polite"
            aria-busy={isCartLoading || checkoutMutation.isPending}
          >
            {isCartLoading ? (
              <>
                <LoadingState message="Loading checkout..." />
                <div className="checkout-lines" aria-hidden="true">
                  {Array.from({ length: 2 }, (_, index) => (
                    <article className="checkout-line" key={index}>
                      <SkeletonBlock className="skeleton--title" />
                      <SkeletonBlock className="skeleton--price" />
                      <SkeletonBlock className="skeleton--price" />
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
                  onClick={() => void refetch()}
                  type="button"
                >
                  {isCartFetching ? (
                    <>
                      <ButtonSpinner label="Retrying checkout" />
                      Retrying...
                    </>
                  ) : (
                    "Try again"
                  )}
                </button>
              </div>
            ) : null}

            {!isCartLoading && !isCartError && isCartEmpty ? (
              <EmptyState
                action={
                  <Link className="button button--secondary" href="/products">
                    Browse products
                  </Link>
                }
                message="Your cart is empty, so there is nothing to check out."
                title="No checkout items yet."
              />
            ) : null}

            {!isCartLoading && !isCartError && cart && cart.items.length > 0 ? (
                <div className="checkout-layout">
                  <div className="checkout-lines" aria-label="Checkout items">
                    {stockIssue ? (
                      <div className="cart-alert cart-alert--error" role="alert">
                        <p className="message message--error">
                          One or more cart items no longer have enough stock.
                          Update the cart before placing the order.
                        </p>
                        <Link className="button button--secondary" href="/cart">
                          Edit cart
                        </Link>
                      </div>
                    ) : null}

                    {checkoutMutation.error ? (
                      <div className="cart-alert cart-alert--error" role="alert">
                        <div>
                          <p className="message message--error">
                            {getFriendlyErrorMessage(
                              checkoutMutation.error,
                              "checkout",
                              "Unable to place your order."
                            )}
                          </p>
                          {getValidationIssueMessages(
                            checkoutMutation.error
                          ).map((detail) => (
                            <p className="message message--error" key={detail}>
                              {detail}
                            </p>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {cart.items.map((item) => (
                      <article className="checkout-line" key={item.id}>
                        <div>
                          <h2>{item.product.title}</h2>
                          <p className="cart-line__variant">
                            {formatVariantLabel(item)}
                          </p>
                          <p className="message">{getStockLabel(item)}</p>
                        </div>

                        <div className="cart-price-block">
                          <span className="status-label">Quantity</span>
                          <strong>{item.quantity}</strong>
                        </div>

                        <div className="cart-price-block">
                          <span className="status-label">Subtotal</span>
                          <strong>{formatCurrency(item.subtotal)}</strong>
                        </div>
                      </article>
                    ))}
                  </div>

                  <aside
                    aria-busy={checkoutMutation.isPending}
                    className="cart-summary"
                    aria-label="Checkout summary"
                  >
                    <div>
                      <span className="status-label">Final total</span>
                      <strong>{formatCurrency(cart.total)}</strong>
                    </div>
                    <button
                      className="button"
                      disabled={!canPlaceOrder}
                      onClick={handlePlaceOrder}
                      type="button"
                    >
                      {checkoutMutation.isPending
                        ? (
                          <>
                            <ButtonSpinner label="Placing order" />
                            Placing order...
                          </>
                        )
                        : "Place Order"}
                    </button>
                    <Link className="button button--secondary" href="/cart">
                      Edit cart
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
