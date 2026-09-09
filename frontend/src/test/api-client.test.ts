import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { AUTH_STORAGE_KEY } from "../features/auth/auth-storage";
import { addCartItem, ApiClientError } from "../services/api";

const originalFetch = globalThis.fetch;

type CapturedRequest = {
  body: string | undefined;
  headers: Headers;
  method: string | undefined;
  url: string;
};

function installWindowStorage(accessToken: string): void {
  const localStorage = new Map<string, string>();
  const sessionStorage = new Map<string, string>();
  localStorage.set(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      accessToken,
      user: {
        createdAt: "2026-01-01T00:00:00.000Z",
        email: "frontend-test@example.com",
        id: 1
      }
    })
  );

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      addEventListener: () => undefined,
      dispatchEvent: () => undefined,
      localStorage: {
        getItem: (key: string) => localStorage.get(key) ?? null,
        removeItem: (key: string) => localStorage.delete(key),
        setItem: (key: string, value: string) => localStorage.set(key, value)
      },
      removeEventListener: () => undefined,
      sessionStorage: {
        getItem: (key: string) => sessionStorage.get(key) ?? null,
        removeItem: (key: string) => sessionStorage.delete(key),
        setItem: (key: string, value: string) => sessionStorage.set(key, value)
      }
    }
  });
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  Reflect.deleteProperty(globalThis, "window");
});

test("addCartItem posts to the cart endpoint with auth and numeric body", async () => {
  const capturedRequest: {
    current?: CapturedRequest;
  } = {};
  installWindowStorage("test-access-token");

  globalThis.fetch = (async (input, init) => {
    capturedRequest.current = {
      body: typeof init?.body === "string" ? init.body : undefined,
      headers: new Headers(init?.headers),
      method: init?.method,
      url: String(input)
    };

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: 10,
          productId: 1,
          quantity: 2,
          variantId: 5
        }
      }),
      {
        headers: {
          "Content-Type": "application/json"
        },
        status: 200
      }
    );
  }) as typeof fetch;

  const cartItem = await addCartItem({
    productId: 1,
    quantity: 2,
    variantId: 5
  });

  assert.equal(cartItem.quantity, 2);
  const request = capturedRequest.current;
  assert.ok(request);
  assert.equal(request.url, "http://localhost:5000/api/cart/items");
  assert.equal(request.method, "POST");
  assert.equal(
    request.headers.get("Authorization"),
    "Bearer test-access-token"
  );
  assert.deepEqual(JSON.parse(request.body ?? ""), {
    productId: 1,
    quantity: 2,
    variantId: 5
  });
});

test("API errors are surfaced as ApiClientError without raw failures", async () => {
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "CONFLICT",
          message: "Requested quantity exceeds available stock.",
          requestId: "test-request"
        }
      }),
      {
        headers: {
          "Content-Type": "application/json"
        },
        status: 409
      }
    )) as typeof fetch;

  await assert.rejects(
    () =>
      addCartItem({
        productId: 1,
        quantity: 99,
        variantId: 5
      }),
    (error: unknown) =>
      error instanceof ApiClientError &&
      error.status === 409 &&
      error.code === "CONFLICT"
  );
});

test("a late response from a previous login is discarded", async () => {
  installWindowStorage("previous-token");
  let finish!: (response: Response) => void;
  globalThis.fetch = (() => new Promise<Response>((resolve) => { finish = resolve; })) as typeof fetch;
  const pending = addCartItem({ productId: 1, quantity: 1, variantId: 5 });
  installWindowStorage("new-token");
  finish(new Response(JSON.stringify({ success: true, data: { id: 10 } }), { status: 200 }));
  await assert.rejects(pending, (error: unknown) =>
    error instanceof ApiClientError && error.code === "SESSION_CHANGED"
  );
});
