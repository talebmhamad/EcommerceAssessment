import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { getLoginValidationMessage, isLoginBusy } from "../features/auth/login-state";
import { getProtectedRouteState } from "../features/auth/protected-route-state";
import { mergeCartItem } from "../features/cart/cart-cache";
import {
  canPlaceCheckoutOrder,
  getStockLabel,
  hasStockIssue
} from "../features/checkout/checkout-state";
import { getFriendlyErrorMessage } from "../features/errors/api-errors";
import {
  canAddProductToCart,
  clampQuantity,
  findSelectedVariant,
  getInitialVariantId,
  getUnavailableReason
} from "../features/products/product-detail-state";
import { EmptyState } from "../features/ui/EmptyState";
import { ButtonSpinner, LoadingState } from "../features/ui/Loading";
import { mergeWishlistProduct } from "../features/wishlist/wishlist-cache";
import { ApiClientError } from "../services/api";
import type { Cart } from "../types/cart";
import type { ProductDetail } from "../types/products";

const configurableProduct: ProductDetail = {
  description: "A configurable test product.",
  id: 10,
  price: "20.00",
  title: "Configurable Product",
  totalStock: 3,
  type: "CONFIGURABLE",
  variants: [
    {
      id: 101,
      label: "Small",
      optionType: "SIZE",
      optionValue: "S",
      stock: 3
    },
    {
      id: 102,
      label: "Large",
      optionType: "SIZE",
      optionValue: "L",
      stock: 0
    }
  ]
};

const simpleProduct: ProductDetail = {
  description: "A simple test product.",
  id: 11,
  price: "10.00",
  title: "Simple Product",
  totalStock: 4,
  type: "SIMPLE",
  variants: [
    {
      id: 201,
      label: "Default",
      optionType: null,
      optionValue: null,
      stock: 4
    }
  ]
};

test("login behavior validates form input and disables while busy", () => {
  assert.equal(
    getLoginValidationMessage("", "password"),
    "Email and password are required."
  );
  assert.equal(getLoginValidationMessage("buyer@example.com", ""), "Email and password are required.");
  assert.equal(getLoginValidationMessage("buyer@example.com", "password"), null);
  assert.equal(isLoginBusy({ authStatus: "loading", isSubmitting: false }), true);
  assert.equal(isLoginBusy({ authStatus: "unauthenticated", isSubmitting: true }), true);
  assert.equal(isLoginBusy({ authStatus: "unauthenticated", isSubmitting: false }), false);
});

test("protected route handling separates loading, redirect, and content states", () => {
  assert.equal(getProtectedRouteState("loading"), "loading");
  assert.equal(getProtectedRouteState("unauthenticated"), "redirecting");
  assert.equal(getProtectedRouteState("authenticated"), "content");
});

test("loading and empty states render user-visible feedback", () => {
  const loadingMarkup = renderToStaticMarkup(
    <LoadingState message="Loading products..." />
  );
  const buttonMarkup = renderToStaticMarkup(
    <button disabled type="button">
      <ButtonSpinner label="Saving cart item" />
      Saving...
    </button>
  );
  const emptyMarkup = renderToStaticMarkup(
    <EmptyState
      message="Items you save will appear here."
      title="Your wishlist is empty."
    />
  );

  assert.match(loadingMarkup, /role="status"/);
  assert.match(loadingMarkup, /Loading products/);
  assert.match(buttonMarkup, /disabled=""/);
  assert.match(buttonMarkup, /Saving/);
  assert.match(emptyMarkup, /Your wishlist is empty/);
});

test("product detail state requires variants and clamps quantities to stock", () => {
  assert.equal(getInitialVariantId(configurableProduct), null);
  assert.equal(getInitialVariantId(simpleProduct), 201);

  const selectedVariant = findSelectedVariant(configurableProduct, 101);
  const outOfStockVariant = findSelectedVariant(configurableProduct, 102);

  assert.equal(
    getUnavailableReason(configurableProduct, undefined),
    "Choose a variant to continue."
  );
  assert.equal(canAddProductToCart(configurableProduct, undefined), false);
  assert.equal(canAddProductToCart(configurableProduct, selectedVariant), true);
  assert.equal(canAddProductToCart(configurableProduct, outOfStockVariant), false);
  assert.equal(clampQuantity(99, selectedVariant?.stock ?? 0), 3);
  assert.equal(clampQuantity(0, selectedVariant?.stock ?? 0), 1);
});

test("cart cache updates preserve server data and recalculate visible totals", () => {
  const emptyCart: Cart = {
    items: [],
    total: "0.00"
  };
  const variant = simpleProduct.variants[0];
  assert.ok(variant);

  const cartWithItem = mergeCartItem(
    emptyCart,
    {
      id: 501,
      productId: simpleProduct.id,
      quantity: 2,
      variantId: variant.id
    },
    simpleProduct,
    variant
  );
  assert.equal(cartWithItem?.items.length, 1);
  assert.equal(cartWithItem?.items[0]?.subtotal, "20.00");
  assert.equal(cartWithItem?.total, "20.00");

  const updatedCart = mergeCartItem(
    cartWithItem,
    {
      id: 501,
      productId: simpleProduct.id,
      quantity: 3,
      variantId: variant.id
    },
    simpleProduct,
    variant
  );
  assert.equal(updatedCart?.items.length, 1);
  assert.equal(updatedCart?.items[0]?.quantity, 3);
  assert.equal(updatedCart?.total, "30.00");
});

test("wishlist cache merges additions without duplicating products", () => {
  const product = {
    id: 10,
    price: "20.00",
    title: "Configurable Product"
  };
  const wishlist = mergeWishlistProduct(undefined, product);
  const duplicateWishlist = mergeWishlistProduct(wishlist, product);

  assert.equal(wishlist.length, 1);
  assert.equal(duplicateWishlist.length, 1);
  assert.equal(duplicateWishlist[0]?.id, product.id);
});

test("checkout state blocks empty, pending, and out-of-stock submissions", () => {
  const cart: Cart = {
    items: [
      {
        id: 501,
        product: {
          id: simpleProduct.id,
          title: simpleProduct.title
        },
        quantity: 2,
        subtotal: "20.00",
        unitPrice: "10.00",
        variant: {
          id: 201,
          label: "Default",
          optionType: null,
          optionValue: null,
          stock: 4
        }
      }
    ],
    total: "20.00"
  };
  const stockIssueCart: Cart = {
    ...cart,
    items: [
      {
        ...cart.items[0]!,
        quantity: 5
      }
    ]
  };

  assert.equal(getStockLabel(cart.items[0]!), "4 available");
  assert.equal(hasStockIssue(cart), false);
  assert.equal(canPlaceCheckoutOrder(cart, false), true);
  assert.equal(canPlaceCheckoutOrder(cart, true), false);
  assert.equal(hasStockIssue(stockIssueCart), true);
  assert.equal(canPlaceCheckoutOrder(stockIssueCart, false), false);
  assert.equal(canPlaceCheckoutOrder({ items: [], total: "0.00" }, false), false);
});

test("friendly errors hide backend details and keep common actions understandable", () => {
  assert.equal(
    getFriendlyErrorMessage(
      new ApiClientError("Invalid credentials", 401, "UNAUTHORIZED"),
      "login"
    ),
    "Email or password is incorrect."
  );
  assert.equal(
    getFriendlyErrorMessage(
      new ApiClientError("Variant does not belong to product", 400, "INVALID_REQUEST"),
      "cartMutation"
    ),
    "That product option is no longer available. Please choose another variant."
  );
  assert.equal(
    getFriendlyErrorMessage(
      new ApiClientError("Requested quantity exceeds available stock", 409, "CONFLICT"),
      "checkout"
    ),
    "There is not enough stock available for that quantity."
  );
  assert.equal(
    getFriendlyErrorMessage(new Error("PrismaClientKnownRequestError"), "checkout"),
    "Something went wrong. Please try again."
  );
});
