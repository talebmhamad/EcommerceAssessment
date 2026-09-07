import { env } from "@/config/env";
import { getStoredAccessToken } from "@/features/auth/auth-storage";
import { notifySessionExpired } from "@/features/auth/session-expiration";
import type { ApiResponse, ApiValidationIssue } from "@/types/api";
import type { LoginRequest, LoginResponse, AuthUser } from "@/types/auth";
import type {
  AddCartItemRequest,
  Cart,
  CartItem,
  ChangeCartVariantRequest,
  UpdateCartQuantityRequest
} from "@/types/cart";
import type { CheckoutOrder } from "@/types/checkout";
import type { HealthStatusData } from "@/types/health";
import type { ProductDetail, ProductListItem } from "@/types/products";
import type {
  AddWishlistItemRequest,
  WishlistProduct
} from "@/types/wishlist";

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
    public readonly requestId?: string,
    public readonly details?: ApiValidationIssue[]
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  accessToken?: string | null;
  auth?: boolean;
};

async function request<TData>(
  path: string,
  options: RequestOptions = {}
): Promise<TData> {
  const headers = new Headers({
    Accept: "application/json"
  });

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const accessToken =
    options.accessToken ??
    (options.auth === false ? null : getStoredAccessToken());

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store"
  }).catch(() => {
    throw new ApiClientError(
      "The API is unavailable.",
      0,
      "SERVICE_UNAVAILABLE"
    );
  });

  const payload = (await response.json().catch(() => {
    throw new ApiClientError(
      "The API is unavailable.",
      response.status,
      "SERVICE_UNAVAILABLE"
    );
  })) as ApiResponse<TData>;

  if (!response.ok || !payload.success) {
    if (payload.success === false) {
      const error = new ApiClientError(
        payload.error.message,
        response.status,
        payload.error.code,
        payload.error.requestId,
        payload.error.details
      );

      if (
        response.status === 401 &&
        options.auth !== false &&
        Boolean(accessToken)
      ) {
        notifySessionExpired();
      }

      throw error;
    }

    throw new ApiClientError(
      "The backend returned an unexpected response.",
      response.status
    );
  }

  return payload.data;
}

export function getBackendHealth(): Promise<HealthStatusData> {
  return request<HealthStatusData>("/health");
}

export function login(credentials: LoginRequest): Promise<LoginResponse> {
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: credentials,
    auth: false
  });
}

export function getCurrentUser(accessToken?: string | null): Promise<AuthUser> {
  return request<AuthUser>("/auth/me", {
    accessToken
  });
}

export function getProducts(): Promise<ProductListItem[]> {
  return request<ProductListItem[]>("/products");
}

export function getProduct(productId: string | number): Promise<ProductDetail> {
  return request<ProductDetail>(`/products/${encodeURIComponent(productId)}`);
}

export function getCart(): Promise<Cart> {
  return request<Cart>("/cart");
}

export function addCartItem(body: AddCartItemRequest): Promise<CartItem> {
  return request<CartItem>("/cart/items", {
    method: "POST",
    body
  });
}

export function updateCartItemQuantity(
  cartItemId: number,
  body: UpdateCartQuantityRequest
): Promise<Cart> {
  return request<Cart>(`/cart/items/${encodeURIComponent(cartItemId)}`, {
    method: "PATCH",
    body
  });
}

export function changeCartItemVariant(
  cartItemId: number,
  body: ChangeCartVariantRequest
): Promise<Cart> {
  return request<Cart>(
    `/cart/items/${encodeURIComponent(cartItemId)}/variant`,
    {
      method: "PATCH",
      body
    }
  );
}

export function removeCartItem(cartItemId: number): Promise<Cart> {
  return request<Cart>(`/cart/items/${encodeURIComponent(cartItemId)}`, {
    method: "DELETE"
  });
}

export function placeOrder(): Promise<CheckoutOrder> {
  return request<CheckoutOrder>("/checkout", {
    method: "POST"
  });
}

export function getOrder(orderId: string | number): Promise<CheckoutOrder> {
  return request<CheckoutOrder>(`/orders/${encodeURIComponent(orderId)}`);
}

export function getWishlist(): Promise<WishlistProduct[]> {
  return request<WishlistProduct[]>("/wishlist");
}

export function addWishlistItem(
  body: AddWishlistItemRequest
): Promise<WishlistProduct> {
  return request<WishlistProduct>("/wishlist/items", {
    method: "POST",
    body
  });
}

export function removeWishlistItem(
  productId: number
): Promise<WishlistProduct[]> {
  return request<WishlistProduct[]>(
    `/wishlist/items/${encodeURIComponent(productId)}`,
    {
      method: "DELETE"
    }
  );
}
