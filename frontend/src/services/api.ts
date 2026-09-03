import { env } from "@/config/env";
import { getStoredAccessToken } from "@/features/auth/auth-storage";
import type { ApiResponse, ApiValidationIssue } from "@/types/api";
import type { LoginRequest, LoginResponse, AuthUser } from "@/types/auth";
import type { HealthStatusData } from "@/types/health";

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
  });

  const payload = (await response.json()) as ApiResponse<TData>;

  if (!response.ok || !payload.success) {
    if (payload.success === false) {
      throw new ApiClientError(
        payload.error.message,
        response.status,
        payload.error.code,
        payload.error.requestId,
        payload.error.details
      );
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
