"use client";

import { useQuery } from "@tanstack/react-query";
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
import { getProducts } from "@/services/api";
import type { ProductListItem } from "@/types/products";

function formatOptionType(optionType: string | null): string {
  if (!optionType) {
    return "Default";
  }

  return optionType.charAt(0) + optionType.slice(1).toLowerCase();
}

function getVariantSummary(product: ProductListItem): string {
  const totalStock = product.variants.reduce(
    (total, variant) => total + variant.stock,
    0
  );

  if (product.type === "SIMPLE") {
    return totalStock > 0 ? `${totalStock} in stock` : "Out of stock";
  }

  const optionType = formatOptionType(product.variants[0]?.optionType ?? null);
  const availableCount = product.variants.filter(
    (variant) => variant.stock > 0
  ).length;

  return `${product.variants.length} ${optionType.toLowerCase()} options, ${availableCount} available`;
}

function getVariantLabels(product: ProductListItem): string {
  return product.variants
    .map((variant) => {
      const stockLabel = variant.stock > 0 ? `${variant.stock}` : "0";
      return `${variant.label} (${stockLabel})`;
    })
    .join(", ");
}

export function ProductCatalog(): React.ReactElement {
  const { status } = useAuth();
  const {
    data: products = [],
    error,
    isError,
    isFetching,
    isLoading,
    refetch
  } = useQuery({
    enabled: status === "authenticated",
    queryFn: getProducts,
    queryKey: queryKeys.products
  });

  return (
    <ProtectedRoute>
      <main className="page-shell">
        <div className="page-content page-content--wide protected-layout">
          <section className="catalog-header" aria-labelledby="products-title">
            <div>
              <p className="eyebrow">Catalog</p>
              <h1 id="products-title">Products</h1>
              <p className="lead">
                Browse the protected product catalog and choose an item to view
                its details.
              </p>
            </div>
          </section>

          <section aria-live="polite" aria-busy={isLoading}>
            {isLoading ? (
              <>
                <LoadingState message="Loading products..." />
                <div className="product-grid product-grid--loading">
                  {Array.from({ length: 6 }, (_, index) => (
                    <article className="product-card" key={index}>
                      <SkeletonBlock className="skeleton--pill" />
                      <SkeletonBlock className="skeleton--title" />
                      <SkeletonBlock className="skeleton--price" />
                      <SkeletonBlock />
                      <SkeletonBlock />
                    </article>
                  ))}
                </div>
              </>
            ) : null}

            {isError ? (
              <div className="catalog-state catalog-state--error" role="alert">
                <p className="message message--error">
                  {getFriendlyErrorMessage(
                    error,
                    "products",
                    "Unable to load products right now."
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

            {!isLoading && !isError && products.length === 0 ? (
              <EmptyState
                action={
                  <button
                    className="button button--secondary"
                    disabled={isFetching}
                    onClick={() => void refetch()}
                    type="button"
                  >
                    {isFetching ? (
                      <>
                        <ButtonSpinner label="Retrying products" />
                        Retrying...
                      </>
                    ) : (
                      "Try again"
                    )}
                  </button>
                }
                eyebrow="No products"
                message="The catalog did not return any products."
                title="No products are available."
              />
            ) : null}

            {!isLoading && !isError && products.length > 0 ? (
              <div className="product-grid">
                {products.map((product) => (
                  <Link
                    className="product-card"
                    href={`/products/${product.id}`}
                    key={product.id}
                  >
                    <span className="product-card__type">
                      {product.type === "CONFIGURABLE"
                        ? "Configurable"
                        : "Simple"}
                    </span>
                    <h2>{product.title}</h2>
                    <span className="product-card__price">
                      {formatCurrency(product.price)}
                    </span>
                    <p className="product-card__summary">
                      {getVariantSummary(product)}
                    </p>
                    <p className="product-card__variants">
                      {getVariantLabels(product)}
                    </p>
                  </Link>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
}
