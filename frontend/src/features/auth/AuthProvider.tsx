"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useRouter } from "next/navigation";
import {
  createSessionQueryClient,
  QueryProvider,
  replaceSessionQueryClient
} from "@/features/query/QueryProvider";
import {
  AUTH_STORAGE_KEY,
  clearStoredAuthState,
  readStoredAuthState,
  writeStoredAuthState
} from "@/features/auth/auth-storage";
import {
  clearSessionExpiredMessage,
  listenForSessionExpiration,
  notifySessionExpired
} from "@/features/auth/session-expiration";
import { isExpiredAuthenticationError } from "@/features/errors/api-errors";
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
  const [queryClient, setQueryClient] = useState(createSessionQueryClient);
  const queryClientRef = useRef(queryClient);
  const sessionVersionRef = useRef(0);

  const resetQueries = useCallback((): void => {
    sessionVersionRef.current += 1;
    queryClientRef.current = replaceSessionQueryClient(queryClientRef.current);
    setQueryClient(queryClientRef.current);
  }, []);

  const clearAuthState = useCallback((): void => {
    resetQueries();
    clearStoredAuthState();
    setAuthState(null);
    setStatus("unauthenticated");
  }, [resetQueries]);

  const clearAuth = useCallback((): void => {
    clearSessionExpiredMessage();
    clearAuthState();
  }, [clearAuthState]);

  const expireAuth = useCallback((): void => {
    clearAuthState();
    router.replace("/login");
  }, [clearAuthState, router]);

  useEffect(() => listenForSessionExpiration(expireAuth), [expireAuth]);

  useEffect(() => {
    let isMounted = true;
    async function validateStoredSession(): Promise<void> {
      const sessionToValidate = readStoredAuthState();
      const sessionVersion = sessionVersionRef.current;
      setAuthState(sessionToValidate);
      if (!sessionToValidate) {
        setStatus("unauthenticated");
        return;
      }
      setStatus("loading");
      try {
        const user = await getCurrentUser(sessionToValidate.accessToken);
        const refreshedAuthState = {
          accessToken: sessionToValidate.accessToken,
          user
        };

        if (isMounted && sessionVersion === sessionVersionRef.current) {
          writeStoredAuthState(refreshedAuthState);
          setAuthState(refreshedAuthState);
          setStatus("authenticated");
        }
      } catch (error) {
        if (isMounted && sessionVersion === sessionVersionRef.current) {
          if (isExpiredAuthenticationError(error)) {
            notifySessionExpired();
            expireAuth();
          } else {
            clearAuth();
          }
        }
      }
    }

    void validateStoredSession();

    function handleStorage(event: StorageEvent): void {
      if (event.key === AUTH_STORAGE_KEY || event.key === null) {
        resetQueries();
        void validateStoredSession();
      }
    }
    window.addEventListener("storage", handleStorage);

    return () => {
      isMounted = false;
      window.removeEventListener("storage", handleStorage);
    };
  }, [clearAuth, expireAuth, resetQueries]);

  const login = useCallback(async (credentials: LoginRequest): Promise<void> => {
    const sessionVersion = ++sessionVersionRef.current;
    const result = await loginRequest(credentials);
    if (sessionVersion !== sessionVersionRef.current) {
      throw new Error("Sign-in was cancelled. Please try again.");
    }
    const nextAuthState = {
      accessToken: result.accessToken,
      user: result.user
    };

    resetQueries();
    writeStoredAuthState(nextAuthState);
    clearSessionExpiredMessage();
    setAuthState(nextAuthState);
    setStatus("authenticated");
  }, [resetQueries]);

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

  return (
    <AuthContext.Provider value={value}>
      <QueryProvider client={queryClient} key={sessionVersionRef.current}>
        {children}
      </QueryProvider>
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
