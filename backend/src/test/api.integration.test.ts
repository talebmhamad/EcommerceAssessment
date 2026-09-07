/* eslint-disable @typescript-eslint/no-floating-promises */
import assert from "node:assert/strict";
import type { Server } from "node:http";
import { after, before, beforeEach, describe, test } from "node:test";
import type { Express } from "express";
import type { PrismaClient } from "../generated/prisma/client";

const TEST_PASSWORD = "ApiTestUser@2026";
const OTHER_PASSWORD = "OtherApiTestUser@2026";
const TEST_JWT_SECRET = "test_jwt_secret_for_api_tests_at_least_32_chars";

type ApiSuccessResponse<TData> = {
  success: true;
  data: TData;
};

type ApiErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{
      field: string;
      message: string;
    }>;
    requestId: string;
  };
};

type ApiResponse<TData> = ApiSuccessResponse<TData> | ApiErrorResponse;

type TestUser = {
  email: string;
  id: number;
};

type TestVariant = {
  id: number;
  label: string;
  stockQuantity: number;
};

type TestProduct = {
  id: number;
  variants: TestVariant[];
};

type TestData = {
  configurableProduct: TestProduct;
  otherUser: TestUser;
  simpleProduct: TestProduct;
  user: TestUser;
};

type CartItemResponse = {
  id: number;
  productId: number;
  quantity: number;
  variantId: number;
};

type CartResponse = {
  items: Array<{
    id: number;
    product: {
      id: number;
      title: string;
    };
    quantity: number;
    subtotal: string;
    unitPrice: string;
    variant: {
      id: number;
      label: string;
      stock: number;
    };
  }>;
  total: string;
};

type ProductListItemResponse = {
  id: number;
  price: string;
  title: string;
  type: string;
  variants: Array<{
    id: number;
    label: string;
    stock: number;
  }>;
};

type WishlistProductResponse = {
  id: number;
  price: string;
  title: string;
};

type CheckoutOrderResponse = {
  id: number;
  finalTotal: string;
  items: Array<{
    id: number;
    productId: number;
    quantity: number;
    subtotal: string;
    unitPrice: string;
    variantId: number;
  }>;
};

type ApiResult<TData> = {
  body: ApiResponse<TData>;
  status: number;
};

let app: Express;
let baseUrl = "";
let hashPassword: (password: string) => Promise<string>;
let prisma: PrismaClient;
let server: Server | undefined;
let seeded: TestData;

function isSafeTestDatabaseUrl(value: string | undefined): value is string {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    const databaseName = url.pathname.replace(/^\//, "").toLowerCase();

    return databaseName.includes("test");
  } catch {
    return false;
  }
}

function assertSuccess<TData>(
  body: ApiResponse<TData>
): asserts body is ApiSuccessResponse<TData> {
  assert.equal(body.success, true);
}

function assertError<TData>(
  body: ApiResponse<TData>
): asserts body is ApiErrorResponse {
  assert.equal(body.success, false);
  assert.equal(typeof body.error.code, "string");
  assert.equal(typeof body.error.message, "string");
  assert.equal(typeof body.error.requestId, "string");
}

function getFirstItem<TItem>(items: TItem[]): TItem {
  const item = items[0];
  assert.ok(item, "Expected at least one item.");

  return item;
}

function getVariant(product: TestProduct, index: number): TestVariant {
  const variant = product.variants[index];
  assert.ok(variant, `Expected seeded variant at index ${index}.`);

  return variant;
}

async function request<TData>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResult<TData>> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers
  });
  const body = (await response.json()) as ApiResponse<TData>;

  return {
    body,
    status: response.status
  };
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`
  };
}

async function loginAs(email: string, password: string): Promise<string> {
  const response = await request<{
    accessToken: string;
  }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });

  assert.equal(response.status, 200);
  assertSuccess(response.body);

  return response.body.data.accessToken;
}

async function cleanDatabase(): Promise<void> {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();
}

async function seedDatabase(): Promise<TestData> {
  const [passwordHash, otherPasswordHash] = await Promise.all([
    hashPassword(TEST_PASSWORD),
    hashPassword(OTHER_PASSWORD)
  ]);
  const user = await prisma.user.create({
    data: {
      email: "api-test-user@example.com",
      passwordHash
    },
    select: {
      email: true,
      id: true
    }
  });
  const otherUser = await prisma.user.create({
    data: {
      email: "api-test-other@example.com",
      passwordHash: otherPasswordHash
    },
    select: {
      email: true,
      id: true
    }
  });
  const simpleProduct = await prisma.product.create({
    data: {
      description: "Simple product for API integration tests.",
      price: "10.00",
      slug: "api-test-simple",
      title: "API Test Simple Product",
      type: "SIMPLE",
      variants: {
        create: {
          isDefault: true,
          label: "Default",
          sku: "API-TEST-SIMPLE-DEFAULT",
          stockQuantity: 5
        }
      }
    },
    include: {
      variants: {
        select: {
          id: true,
          label: true,
          stockQuantity: true
        },
        orderBy: {
          id: "asc"
        }
      }
    }
  });
  const configurableProduct = await prisma.product.create({
    data: {
      description: "Configurable product for API integration tests.",
      price: "20.00",
      slug: "api-test-configurable",
      title: "API Test Configurable Product",
      type: "CONFIGURABLE",
      variants: {
        create: [
          {
            label: "Red",
            optionType: "COLOR",
            optionValue: "Red",
            sku: "API-TEST-CONFIG-RED",
            stockQuantity: 10
          },
          {
            label: "Blue",
            optionType: "COLOR",
            optionValue: "Blue",
            sku: "API-TEST-CONFIG-BLUE",
            stockQuantity: 2
          },
          {
            label: "White",
            optionType: "COLOR",
            optionValue: "White",
            sku: "API-TEST-CONFIG-WHITE",
            stockQuantity: 0
          }
        ]
      }
    },
    include: {
      variants: {
        select: {
          id: true,
          label: true,
          stockQuantity: true
        },
        orderBy: {
          id: "asc"
        }
      }
    }
  });

  return {
    configurableProduct,
    otherUser,
    simpleProduct,
    user
  };
}

async function addCartItem(params: {
  productId: number;
  quantity: number;
  token: string;
  variantId: number;
}): Promise<CartItemResponse> {
  const response = await request<CartItemResponse>("/api/cart/items", {
    method: "POST",
    headers: authHeaders(params.token),
    body: JSON.stringify({
      productId: params.productId,
      quantity: params.quantity,
      variantId: params.variantId
    })
  });

  assert.equal(response.status, 200);
  assertSuccess(response.body);

  return response.body.data;
}

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!isSafeTestDatabaseUrl(testDatabaseUrl)) {
  test(
    "backend API integration tests require TEST_DATABASE_URL containing 'test'",
    {
      skip:
        "Set TEST_DATABASE_URL to a migrated PostgreSQL test database to run these tests."
    },
    () => undefined
  );
} else {
  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.JWT_SECRET ??= TEST_JWT_SECRET;
  process.env.JWT_EXPIRES_IN ??= "1h";
  process.env.NODE_ENV = "test";

  before(async () => {
    [{ app }, { prisma }, { hashPassword }] = await Promise.all([
      import("../app.js"),
      import("../infrastructure/database/index.js"),
      import("../shared/security/password-hasher.js")
    ]);

    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", resolve);
    });

    const address = server?.address();
    assert(address && typeof address === "object");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(async () => {
    await cleanDatabase();
    seeded = await seedDatabase();
  });

  after(async () => {
    await cleanDatabase();
    await prisma.$disconnect();

    await new Promise<void>((resolve, reject) => {
      server?.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  });

  describe("backend API integration", () => {
    test("successful login returns a token and safe user DTO", async () => {
      const response = await request<{
        accessToken: string;
        user: Record<string, unknown>;
      }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: seeded.user.email,
          password: TEST_PASSWORD
        })
      });

      assert.equal(response.status, 200);
      assertSuccess(response.body);
      assert.equal(typeof response.body.data.accessToken, "string");
      assert.equal(response.body.data.user.email, seeded.user.email);
      assert.equal("password" in response.body.data.user, false);
      assert.equal("passwordHash" in response.body.data.user, false);
    });

    test("incorrect credentials return 401", async () => {
      const response = await request<never>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: seeded.user.email,
          password: "wrong-password"
        })
      });

      assert.equal(response.status, 401);
      assertError(response.body);
      assert.equal(response.body.error.code, "UNAUTHORIZED");
    });

    test("product listing returns public product DTOs", async () => {
      const token = await loginAs(seeded.user.email, TEST_PASSWORD);
      const response = await request<ProductListItemResponse[]>("/api/products", {
        headers: authHeaders(token)
      });

      assert.equal(response.status, 200);
      assertSuccess(response.body);
      assert.equal(response.body.data.length, 2);
      const firstProduct = getFirstItem(response.body.data);
      const firstVariant = getFirstItem(firstProduct.variants);

      assert.deepEqual(
        Object.keys(firstProduct).sort(),
        ["id", "price", "title", "type", "variants"]
      );
      assert.equal("sku" in firstVariant, false);
      assert.equal(firstProduct.price, "10.00");
    });

    test("product not found returns 404", async () => {
      const token = await loginAs(seeded.user.email, TEST_PASSWORD);
      const response = await request<never>("/api/products/2147483647", {
        headers: authHeaders(token)
      });

      assert.equal(response.status, 404);
      assertError(response.body);
      assert.equal(response.body.error.code, "NOT_FOUND");
    });

    test("adding a cart item stores an authenticated user's cart line", async () => {
      const token = await loginAs(seeded.user.email, TEST_PASSWORD);
      const variantId = getVariant(seeded.simpleProduct, 0).id;
      const cartItem = await addCartItem({
        productId: seeded.simpleProduct.id,
        quantity: 2,
        token,
        variantId
      });

      assert.equal(cartItem.productId, seeded.simpleProduct.id);
      assert.equal(cartItem.variantId, variantId);
      assert.equal(cartItem.quantity, 2);

      const storedItem = await prisma.cartItem.findUniqueOrThrow({
        where: { id: cartItem.id }
      });

      assert.equal(storedItem.userId, seeded.user.id);
      assert.equal(storedItem.quantity, 2);
    });

    test("invalid variant ownership is rejected", async () => {
      const token = await loginAs(seeded.user.email, TEST_PASSWORD);
      const configurableVariant = getVariant(seeded.configurableProduct, 0);
      const response = await request<never>("/api/cart/items", {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({
          productId: seeded.simpleProduct.id,
          quantity: 1,
          variantId: configurableVariant.id
        })
      });

      assert.equal(response.status, 400);
      assertError(response.body);
      assert.equal(response.body.error.code, "INVALID_REQUEST");
    });

    test("quantity exceeding stock is rejected", async () => {
      const token = await loginAs(seeded.user.email, TEST_PASSWORD);
      const simpleVariant = getVariant(seeded.simpleProduct, 0);
      const response = await request<never>("/api/cart/items", {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({
          productId: seeded.simpleProduct.id,
          quantity: 6,
          variantId: simpleVariant.id
        })
      });

      assert.equal(response.status, 409);
      assertError(response.body);
      assert.equal(response.body.error.code, "CONFLICT");
    });

    test("updating quantity returns recalculated cart totals", async () => {
      const token = await loginAs(seeded.user.email, TEST_PASSWORD);
      const simpleVariant = getVariant(seeded.simpleProduct, 0);
      const cartItem = await addCartItem({
        productId: seeded.simpleProduct.id,
        quantity: 1,
        token,
        variantId: simpleVariant.id
      });
      const response = await request<CartResponse>(`/api/cart/items/${cartItem.id}`, {
        method: "PATCH",
        headers: authHeaders(token),
        body: JSON.stringify({ quantity: 3 })
      });

      assert.equal(response.status, 200);
      assertSuccess(response.body);
      const firstCartItem = getFirstItem(response.body.data.items);
      assert.equal(firstCartItem.quantity, 3);
      assert.equal(firstCartItem.subtotal, "30.00");
      assert.equal(response.body.data.total, "30.00");
    });

    test("changing variant updates the selected variant", async () => {
      const token = await loginAs(seeded.user.email, TEST_PASSWORD);
      const redVariant = getVariant(seeded.configurableProduct, 0);
      const blueVariant = getVariant(seeded.configurableProduct, 1);
      const cartItem = await addCartItem({
        productId: seeded.configurableProduct.id,
        quantity: 2,
        token,
        variantId: redVariant.id
      });
      const response = await request<CartResponse>(
        `/api/cart/items/${cartItem.id}/variant`,
        {
          method: "PATCH",
          headers: authHeaders(token),
          body: JSON.stringify({ variantId: blueVariant.id })
        }
      );

      assert.equal(response.status, 200);
      assertSuccess(response.body);
      assert.equal(response.body.data.items.length, 1);
      const firstCartItem = getFirstItem(response.body.data.items);
      assert.equal(firstCartItem.variant.id, blueVariant.id);
      assert.equal(firstCartItem.quantity, 2);
    });

    test("removing a cart item returns an empty cart", async () => {
      const token = await loginAs(seeded.user.email, TEST_PASSWORD);
      const simpleVariant = getVariant(seeded.simpleProduct, 0);
      const cartItem = await addCartItem({
        productId: seeded.simpleProduct.id,
        quantity: 1,
        token,
        variantId: simpleVariant.id
      });
      const response = await request<CartResponse>(`/api/cart/items/${cartItem.id}`, {
        method: "DELETE",
        headers: authHeaders(token)
      });

      assert.equal(response.status, 200);
      assertSuccess(response.body);
      assert.deepEqual(response.body.data.items, []);
      assert.equal(response.body.data.total, "0.00");
      assert.equal(await prisma.cartItem.count(), 0);
    });

    test("wishlist items can be added and removed", async () => {
      const token = await loginAs(seeded.user.email, TEST_PASSWORD);
      const addResponse = await request<WishlistProductResponse>(
        "/api/wishlist/items",
        {
          method: "POST",
          headers: authHeaders(token),
          body: JSON.stringify({ productId: seeded.simpleProduct.id })
        }
      );

      assert.equal(addResponse.status, 200);
      assertSuccess(addResponse.body);
      assert.equal(addResponse.body.data.id, seeded.simpleProduct.id);

      const listResponse = await request<WishlistProductResponse[]>("/api/wishlist", {
        headers: authHeaders(token)
      });

      assert.equal(listResponse.status, 200);
      assertSuccess(listResponse.body);
      assert.equal(listResponse.body.data.length, 1);

      const removeResponse = await request<WishlistProductResponse[]>(
        `/api/wishlist/items/${seeded.simpleProduct.id}`,
        {
          method: "DELETE",
          headers: authHeaders(token)
        }
      );

      assert.equal(removeResponse.status, 200);
      assertSuccess(removeResponse.body);
      assert.deepEqual(removeResponse.body.data, []);
      assert.equal(await prisma.wishlistItem.count(), 0);
    });

    test("successful checkout creates order, deducts stock, and clears cart", async () => {
      const token = await loginAs(seeded.user.email, TEST_PASSWORD);
      const otherToken = await loginAs(seeded.otherUser.email, OTHER_PASSWORD);
      const simpleSeedVariant = getVariant(seeded.simpleProduct, 0);
      const redSeedVariant = getVariant(seeded.configurableProduct, 0);
      await addCartItem({
        productId: seeded.simpleProduct.id,
        quantity: 2,
        token,
        variantId: simpleSeedVariant.id
      });
      await addCartItem({
        productId: seeded.configurableProduct.id,
        quantity: 1,
        token,
        variantId: redSeedVariant.id
      });

      const response = await request<CheckoutOrderResponse>("/api/checkout", {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({})
      });

      assert.equal(response.status, 200);
      assertSuccess(response.body);
      assert.equal(response.body.data.finalTotal, "40.00");
      assert.equal(response.body.data.items.length, 2);
      assert.equal(await prisma.cartItem.count({ where: { userId: seeded.user.id } }), 0);

      const simpleVariant = await prisma.productVariant.findUniqueOrThrow({
        where: { id: simpleSeedVariant.id }
      });
      const redVariant = await prisma.productVariant.findUniqueOrThrow({
        where: { id: redSeedVariant.id }
      });

      assert.equal(simpleVariant.stockQuantity, 3);
      assert.equal(redVariant.stockQuantity, 9);

      const otherOrderResponse = await request<never>(
        `/api/orders/${response.body.data.id}`,
        {
          headers: authHeaders(otherToken)
        }
      );

      assert.equal(otherOrderResponse.status, 404);
    });

    test("checkout with an empty cart is rejected", async () => {
      const token = await loginAs(seeded.user.email, TEST_PASSWORD);
      const response = await request<never>("/api/checkout", {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({})
      });

      assert.equal(response.status, 400);
      assertError(response.body);
    });

    test("checkout with insufficient stock rolls back order creation", async () => {
      const token = await loginAs(seeded.user.email, TEST_PASSWORD);
      const blueVariant = getVariant(seeded.configurableProduct, 1);
      await addCartItem({
        productId: seeded.configurableProduct.id,
        quantity: 2,
        token,
        variantId: blueVariant.id
      });
      await prisma.productVariant.update({
        where: { id: blueVariant.id },
        data: {
          stockQuantity: 1
        }
      });

      const response = await request<never>("/api/checkout", {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({})
      });

      assert.equal(response.status, 409);
      assertError(response.body);
      assert.equal(await prisma.order.count(), 0);
      assert.equal(await prisma.orderItem.count(), 0);
      assert.equal(await prisma.cartItem.count({ where: { userId: seeded.user.id } }), 1);
      assert.equal(
        (
          await prisma.productVariant.findUniqueOrThrow({
            where: { id: blueVariant.id }
          })
        ).stockQuantity,
        1
      );
    });

    test("frontend-supplied prices and totals are rejected", async () => {
      const token = await loginAs(seeded.user.email, TEST_PASSWORD);
      const simpleVariant = getVariant(seeded.simpleProduct, 0);
      const addResponse = await request<never>("/api/cart/items", {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({
          price: "0.01",
          productId: seeded.simpleProduct.id,
          quantity: 1,
          variantId: simpleVariant.id
        })
      });

      assert.equal(addResponse.status, 422);
      assertError(addResponse.body);

      const checkoutResponse = await request<never>("/api/checkout", {
        method: "POST",
        headers: authHeaders(token),
        body: JSON.stringify({
          total: "0.01"
        })
      });

      assert.equal(checkoutResponse.status, 422);
      assertError(checkoutResponse.body);
      assert.equal(await prisma.order.count(), 0);
    });
  });
}
