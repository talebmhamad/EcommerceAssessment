import { env } from "@/config/env";
import type { ApiResponse } from "@/types/api";
import type { HealthStatusData } from "@/types/health";

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

async function request<TData>(path: string): Promise<TData> {
  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    headers: {
      Accept: "application/json"
    },
    cache: "no-store"
  });

  const payload = (await response.json()) as ApiResponse<TData>;

  if (!response.ok || !payload.success) {
    const message =
      payload.success === false
        ? payload.error.message
        : "The backend returned an unexpected response.";
    throw new ApiClientError(message, response.status);
  }

  return payload.data;
}

export function getBackendHealth(): Promise<HealthStatusData> {
  return request<HealthStatusData>("/health");
}
