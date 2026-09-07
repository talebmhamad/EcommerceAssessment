"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useAuth } from "@/features/auth/AuthProvider";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import {
  getFriendlyErrorMessage,
  isNotFoundError
} from "@/features/errors/api-errors";
import { queryKeys } from "@/features/query/query-keys";
import {
  ButtonSpinner,
  LoadingState,
  SkeletonBlock
} from "@/features/ui/Loading";
import { formatCurrency } from "@/features/ui/price";
import { getOrder } from "@/services/api";

type OrderConfirmationViewProps = {
  orderId: string;
};

export function OrderConfirmationView({
  orderId
}: OrderConfirmationViewProps): React.ReactElement {
  const { status } = useAuth();
  const {
    data: order,
    error,
    isError,
    isFetching,
    isLoading,
    refetch
  } = useQuery({
    enabled: status === "authenticated",
    queryFn: () => getOrder(orderId),
    queryKey: queryKeys.order(orderId)
  });
  const notFound = isNotFoundError(error);

  return (
    <ProtectedRoute>
      <main className="page-shell">
        <div className="page-content page-content--wide protected-layout">
          <section className="catalog-header" aria-labelledby="order-title">
            <div>
              <p className="eyebrow">Confirmation</p>
              <h1 id="order-title">Order confirmation</h1>
              <p className="lead">
                Your order details are loaded from the stored checkout record.
              </p>
            </div>
          </section>

          <section aria-live="polite" aria-busy={isLoading || isFetching}>
            {isLoading ? (
              <>
                <LoadingState message="Loading order..." />
                <div className="checkout-layout" aria-hidden="true">
                  <div className="checkout-lines">
                    {Array.from({ length: 2 }, (_, index) => (
                      <article className="checkout-line" key={index}>
                        <SkeletonBlock className="skeleton--title" />
                        <SkeletonBlock className="skeleton--price" />
                        <SkeletonBlock className="skeleton--price" />
                      </article>
                    ))}
                  </div>
                  <aside className="cart-summary">
                    <SkeletonBlock className="skeleton--price" />
                    <SkeletonBlock className="skeleton--button" />
                  </aside>
                </div>
              </>
            ) : null}

            {isError && notFound ? (
              <div className="catalog-state">
                <div>
                  <p className="eyebrow">Not found</p>
                  <p className="message">
                    This order could not be found for your account.
                  </p>
                </div>
                <Link className="button button--secondary" href="/products">
                  View products
                </Link>
              </div>
            ) : null}

            {isError && !notFound ? (
              <div className="catalog-state catalog-state--error" role="alert">
                <p className="message message--error">
                  {getFriendlyErrorMessage(
                    error,
                    "order",
                    "Unable to load this order."
                  )}
                </p>
                <button
                  className="button button--secondary"
                  disabled={isFetching}
                  onClick={() => void refetch()}
                  type="button"
                >
                  {isFetching ? (
                    <>
                      <ButtonSpinner label="Retrying order" />
                      Retrying...
                    </>
                  ) : (
                    "Try again"
                  )}
                </button>
              </div>
            ) : null}

            {!isLoading && !isError && order ? (
              <div className="order-confirmation">
                <section
                  className="checkout-success"
                  aria-labelledby="confirmed-order-title"
                >
                  <div>
                    <p className="eyebrow">Order placed</p>
                    <h2 id="confirmed-order-title">
                      Thank you for your order.
                    </h2>
                    <p className="lead">
                      Order #{order.id} is confirmed with a final total of{" "}
                      <strong>{formatCurrency(order.finalTotal)}</strong>.
                    </p>
                  </div>
                </section>

                <div className="checkout-layout">
                  <div className="checkout-lines" aria-label="Ordered items">
                    {order.items.map((item) => (
                      <article className="checkout-line" key={item.id}>
                        <div>
                          <h3>{item.productTitle}</h3>
                          <p className="cart-line__variant">
                            {item.variantLabel}
                          </p>
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

                  <aside className="cart-summary" aria-label="Order summary">
                    <div>
                      <span className="status-label">Order number</span>
                      <strong>#{order.id}</strong>
                    </div>
                    <div>
                      <span className="status-label">Final total</span>
                      <strong>{formatCurrency(order.finalTotal)}</strong>
                    </div>
                    <Link className="button button--secondary" href="/products">
                      Continue shopping
                    </Link>
                  </aside>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
}
