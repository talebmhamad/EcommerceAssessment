import assert from "node:assert/strict";
import { test } from "node:test";
import { MutationObserver } from "@tanstack/react-query";
import { cartMutationKey, cartQueryKey, createCartMutationOptions } from "../features/cart/cart-query";
import { createSessionQueryClient, replaceSessionQueryClient } from "../features/query/QueryProvider";
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

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => { resolve = complete; });
  return { promise, resolve };
}

const flushTasks = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

test("session changes cancel reads and isolate late writes from the next account", async (t) => {
  const oldClient = createSessionQueryClient();
  const response = deferred<string>();
  let signal: AbortSignal | undefined;
  const pendingRead = oldClient.fetchQuery({
    queryKey: ["wishlist"],
    queryFn: (context) => { signal = context.signal; return response.promise; }
  }).catch(() => undefined);
  oldClient.setQueryData(cartQueryKey, { owner: "previous account" });
  const nextClient = replaceSessionQueryClient(oldClient);
  t.after(() => { oldClient.clear(); nextClient.clear(); });

  assert.equal(signal?.aborted, true);
  assert.equal(oldClient.getQueryCache().getAll().length, 0);
  response.resolve("previous wishlist");
  await pendingRead;
  oldClient.setQueryData(cartQueryKey, { owner: "late previous account response" });
  assert.equal(nextClient.getQueryData(cartQueryKey), undefined);
  assert.equal(nextClient.getQueryData(["wishlist"]), undefined);
});

test("cart writes serialize and remain pending through the final cart refresh", async (t) => {
  const client = createSessionQueryClient();
  t.after(() => client.clear());
  const firstResponse = deferred<number>();
  const firstRefresh = deferred<number>();
  const writes: number[] = [];
  let serverQuantity = 1;
  let refreshCount = 0;
  await client.fetchQuery({
    queryKey: cartQueryKey,
    queryFn: async () => {
      refreshCount += 1;
      return refreshCount === 2 ? firstRefresh.promise : serverQuantity;
    }
  });
  const makeMutation = (): MutationObserver<number, Error, number> => new MutationObserver(
    client,
    createCartMutationOptions(client, {
      mutationFn: async (quantity: number) => {
        writes.push(quantity);
        if (quantity === 2) await firstResponse.promise;
        serverQuantity = quantity;
        return quantity;
      },
      onSuccess: (quantity) => { client.setQueryData(cartQueryKey, quantity); }
    })
  );
  const first = makeMutation().mutate(2);
  const second = makeMutation().mutate(3);
  await flushTasks();
  assert.deepEqual(writes, [2]);
  assert.equal(client.isMutating({ mutationKey: cartMutationKey }), 2);
  firstResponse.resolve(2);
  await flushTasks();
  assert.deepEqual(writes, [2], "next write must wait for reconciliation");
  assert.equal(client.isMutating({ mutationKey: cartMutationKey }), 2);
  firstRefresh.resolve(2);
  await Promise.all([first, second]);
  assert.deepEqual(writes, [2, 3]);
  assert.equal(client.getQueryData(cartQueryKey), 3);
  assert.equal(client.isMutating({ mutationKey: cartMutationKey }), 0);
});

test("failed cart writes restore confirmed state before refetching and keep checkout blocked", async (t) => {
  const client = createSessionQueryClient();
  t.after(() => client.clear());
  const refreshedCart = deferred<number>();
  let reads = 0;
  let draftQuantity = 4;
  await client.fetchQuery({
    queryKey: cartQueryKey,
    queryFn: async () => ++reads === 1 ? 2 : refreshedCart.promise
  });
  const mutation = new MutationObserver(client, createCartMutationOptions(client, {
    mutationFn: async () => { throw new Error("Stock changed"); },
    onError: () => { draftQuantity = client.getQueryData<number>(cartQueryKey)!; }
  }));
  const result = assert.rejects(mutation.mutate(undefined), /Stock changed/);
  await flushTasks();
  assert.equal(draftQuantity, 2);
  assert.equal(reads, 2);
  assert.equal(client.isMutating({ mutationKey: cartMutationKey }), 1);
  refreshedCart.resolve(1);
  await result;
  assert.equal(client.getQueryData(cartQueryKey), 1);
  assert.equal(client.isMutating({ mutationKey: cartMutationKey }), 0);
});

test("logout suppresses old mutation callbacks and prevents queued writes from starting", async (t) => {
  const client = createSessionQueryClient();
  const response = deferred<number>();
  let callbacks = 0;
  let queuedWrites = 0;
  const first = new MutationObserver(client, createCartMutationOptions(client, {
    mutationFn: () => response.promise,
    onSuccess: () => { callbacks += 1; }
  })).mutate(undefined);
  await flushTasks();
  const queued = new MutationObserver(client, createCartMutationOptions(client, {
    mutationFn: async () => { queuedWrites += 1; return 2; }
  })).mutate(undefined);
  const queuedResult = assert.rejects(queued, /session has changed/);
  await flushTasks();
  const pausedMutation = client.getMutationCache().getAll().find((mutation) => mutation.state.isPaused);
  assert.ok(pausedMutation);
  const nextClient = replaceSessionQueryClient(client);
  t.after(() => { client.clear(); nextClient.clear(); });
  response.resolve(1);
  await first;
  // Clearing the retired mutation cache removes its scope queue. Explicitly
  // continue the retired observer to verify that even a resumed write is rejected.
  void pausedMutation.continue().catch(() => undefined);
  await queuedResult;
  assert.equal(callbacks, 0);
  assert.equal(queuedWrites, 0);
});
