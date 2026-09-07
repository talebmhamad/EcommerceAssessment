import { isNotFoundError } from "@/features/errors/api-errors";
import type { ProductDetail, ProductVariantListItem } from "@/types/products";

export function getInitialVariantId(product: ProductDetail): number | null {
  return product.type === "SIMPLE" ? (product.variants[0]?.id ?? null) : null;
}

export function findSelectedVariant(
  product: ProductDetail | undefined,
  selectedVariantId: number | null
): ProductVariantListItem | undefined {
  return product?.variants.find((variant) => variant.id === selectedVariantId);
}

export function getUnavailableReason(
  product: ProductDetail | undefined,
  selectedVariant: ProductVariantListItem | undefined
): string | null {
  if (!product) {
    return null;
  }

  if (product.type === "CONFIGURABLE" && !selectedVariant) {
    return "Choose a variant to continue.";
  }

  if (!selectedVariant || selectedVariant.stock <= 0) {
    return "This product is out of stock.";
  }

  return null;
}

export function canAddProductToCart(
  product: ProductDetail | undefined,
  selectedVariant: ProductVariantListItem | undefined
): boolean {
  return Boolean(
    selectedVariant &&
      selectedVariant.stock > 0 &&
      !getUnavailableReason(product, selectedVariant)
  );
}

export function clampQuantity(value: number, max: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(Math.max(Math.trunc(value), 1), Math.max(max, 1));
}

export function isProductNotFoundError(error: unknown): boolean {
  return isNotFoundError(error);
}
