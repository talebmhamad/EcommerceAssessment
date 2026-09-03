import type { StoredAuthState } from "@/types/auth";

export const AUTH_STORAGE_KEY = "ecommerce.auth";

function isAuthUser(value: unknown): value is StoredAuthState["user"] {
  if (!value || typeof value !== "object") {
    return false;
  }

  const user = value as Record<string, unknown>;

  return (
    typeof user.id === "number" &&
    Number.isInteger(user.id) &&
    typeof user.email === "string" &&
    typeof user.createdAt === "string"
  );
}

function isStoredAuthState(value: unknown): value is StoredAuthState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const storedValue = value as Record<string, unknown>;

  return (
    typeof storedValue.accessToken === "string" &&
    storedValue.accessToken.length > 0 &&
    isAuthUser(storedValue.user)
  );
}

export function readStoredAuthState(): StoredAuthState | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(AUTH_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue);
    if (isStoredAuthState(parsedValue)) {
      return parsedValue;
    }
  } catch {
    // Invalid local auth state is treated the same as an expired session.
  }

  clearStoredAuthState();
  return null;
}

export function writeStoredAuthState(authState: StoredAuthState): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
}

export function clearStoredAuthState(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function getStoredAccessToken(): string | null {
  return readStoredAuthState()?.accessToken ?? null;
}
