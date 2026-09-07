"use client";

import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useAuth } from "@/features/auth/AuthProvider";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { getFriendlyErrorMessage } from "@/features/errors/api-errors";
import { queryKeys } from "@/features/query/query-keys";
import { EmptyState } from "@/features/ui/EmptyState";
import {
  ButtonSpinner,
  LoadingState,
  SkeletonBlock
} from "@/features/ui/Loading";
import { formatCurrency } from "@/features/ui/price";
import { getWishlist, removeWishlistItem } from "@/services/api";

export const wishlistQueryKey = queryKeys.wishlist;

export function getWishlistErrorMessage(
  error: unknown,
  fallback: string,
  context: "wishlist" | "wishlistMutation" = "wishlist"
): string {
  return getFriendlyErrorMessage(error, context, fallback);
}

export function WishlistView(): React.ReactElement {
  const { status } = useAuth();
  const queryClient = useQueryClient();
  const removeLocksRef = useRef<Set<number>>(new Set());
  const {
    data: wishlist = [],
    error,
    isError,
    isFetching,
    isLoading,
    refetch
  } = useQuery({
    enabled: status === "authenticated",
    queryFn: getWishlist,
    queryKey: wishlistQueryKey
  });
  const removeMutation = useMutation({
    mutationFn: removeWishlistItem,
    onSuccess: (nextWishlist) => {
      queryClient.setQueryData(wishlistQueryKey, nextWishlist);
      void queryClient.invalidateQueries({ queryKey: wishlistQueryKey });
    },
    onSettled: (_data, _error, productId) => {
      removeLocksRef.current.delete(productId);
    }
  });

  function handleRemove(productId: number): void {
    if (removeLocksRef.current.has(productId) || removeMutation.isPending) {
      return;
    }

    removeLocksRef.current.add(productId);
    removeMutation.mutate(productId);
  }

  return (
    <ProtectedRoute>
      <main className="page-shell">
        <div className="page-content page-content--wide protected-layout">
          <section className="catalog-header" aria-labelledby="wishlist-title">
            <div>
              <p className="eyebrow">Wishlist</p>
              <h1 id="wishlist-title">Saved products</h1>
              <p className="lead">
                Keep track of products you want to revisit.
              </p>
            </div>
          </section>

          <section
            aria-live="polite"
            aria-busy={isLoading || removeMutation.isPending}
          >
            {isLoading ? (
              <>
                <LoadingState message="Loading wishlist..." />
                <div className="wishlist-grid" aria-hidden="true">
                  {Array.from({ length: 3 }, (_, index) => (
                    <article className="wishlist-card" key={index}>
                      <SkeletonBlock className="skeleton--title" />
                      <SkeletonBlock className="skeleton--price" />
                      <SkeletonBlock className="skeleton--button" />
                    </article>
                  ))}
                </div>
              </>
            ) : null}

            {isError ? (
              <div className="catalog-state catalog-state--error" role="alert">
                <p className="message message--error">
                  {getWishlistErrorMessage(
                    error,
                    "Unable to load your wishlist."
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
                      <ButtonSpinner label="Retrying wishlist" />
                      Retrying...
                    </>
                  ) : (
                    "Try again"
                  )}
                </button>
              </div>
            ) : null}

            {!isLoading && !isError && wishlist.length === 0 ? (
              <EmptyState
                action={
                  <Link className="button button--secondary" href="/products">
                    Browse products
                  </Link>
                }
                message="Save products here when you want to revisit them later."
                title="Your wishlist is empty."
              />
            ) : null}

            {!isLoading && !isError && wishlist.length > 0 ? (
              <div className="wishlist-grid" aria-label="Wishlist products">
                {removeMutation.error ? (
                  <div className="wishlist-alert" role="alert">
                    <p className="message message--error">
                      {getWishlistErrorMessage(
                        removeMutation.error,
                        "Unable to update your wishlist.",
                        "wishlistMutation"
                      )}
                    </p>
                  </div>
                ) : null}

                {wishlist.map((product) => {
                  const isRemoving =
                    removeMutation.isPending &&
                    removeMutation.variables === product.id;

                  return (
                    <article
                      aria-busy={isRemoving}
                      className="wishlist-card"
                      key={product.id}
                    >
                      <Link
                        className="wishlist-card__link"
                        href={`/products/${product.id}`}
                      >
                        <h2>{product.title}</h2>
                        <span>{formatCurrency(product.price)}</span>
                      </Link>

                      <button
                        aria-busy={isRemoving}
                        className="button button--danger"
                        disabled={removeMutation.isPending}
                        onClick={() => handleRemove(product.id)}
                        type="button"
                      >
                        {isRemoving ? (
                          <>
                            <ButtonSpinner label="Removing wishlist item" />
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
            ) : null}
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
}
