type AuthStatus = "authenticated" | "loading" | "unauthenticated";

export type ProtectedRouteState = "content" | "loading" | "redirecting";

export function getProtectedRouteState(
  status: AuthStatus
): ProtectedRouteState {
  if (status === "authenticated") {
    return "content";
  }

  if (status === "unauthenticated") {
    return "redirecting";
  }

  return "loading";
}
