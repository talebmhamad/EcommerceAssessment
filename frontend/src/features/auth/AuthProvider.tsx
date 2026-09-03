"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { useRouter } from "next/navigation";
import {
  clearStoredAuthState,
  readStoredAuthState,
  writeStoredAuthState
} from "@/features/auth/auth-storage";
import { getCurrentUser, login as loginRequest } from "@/services/api";
import type { AuthUser, LoginRequest, StoredAuthState } from "@/types/auth";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  accessToken: string | null;
  user: AuthUser | null;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  const router = useRouter();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [authState, setAuthState] = useState<StoredAuthState | null>(null);

  const clearAuth = useCallback((): void => {
    clearStoredAuthState();
    setAuthState(null);
    setStatus("unauthenticated");
  }, []);

  useEffect(() => {
    let isMounted = true;
    const storedAuthState = readStoredAuthState();

    if (!storedAuthState) {
      setStatus("unauthenticated");
      return;
    }

    const sessionToValidate = storedAuthState;
    setAuthState(sessionToValidate);

    async function validateStoredSession(): Promise<void> {
      try {
        const user = await getCurrentUser(sessionToValidate.accessToken);
        const refreshedAuthState = {
          accessToken: sessionToValidate.accessToken,
          user
        };

        if (isMounted) {
          writeStoredAuthState(refreshedAuthState);
          setAuthState(refreshedAuthState);
          setStatus("authenticated");
        }
      } catch {
        if (isMounted) {
          clearAuth();
        }
      }
    }

    void validateStoredSession();

    return () => {
      isMounted = false;
    };
  }, [clearAuth]);

  const login = useCallback(async (credentials: LoginRequest): Promise<void> => {
    const result = await loginRequest(credentials);
    const nextAuthState = {
      accessToken: result.accessToken,
      user: result.user
    };

    writeStoredAuthState(nextAuthState);
    setAuthState(nextAuthState);
    setStatus("authenticated");
  }, []);

  const logout = useCallback((): void => {
    clearAuth();
    router.replace("/login");
  }, [clearAuth, router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      accessToken: authState?.accessToken ?? null,
      user: authState?.user ?? null,
      login,
      logout
    }),
    [authState, login, logout, status]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
