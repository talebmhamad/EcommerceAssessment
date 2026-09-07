"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { getProtectedRouteState } from "@/features/auth/protected-route-state";
import { AppNav } from "@/features/navigation/AppNav";
import { LoadingState } from "@/features/ui/Loading";

type ProtectedRouteProps = {
  children: React.ReactNode;
};

export function ProtectedRoute({
  children
}: ProtectedRouteProps): React.ReactElement {
  const router = useRouter();
  const { status } = useAuth();
  const routeState = getProtectedRouteState(status);

  useEffect(() => {
    if (routeState === "redirecting") {
      router.replace("/login");
    }
  }, [routeState, router]);

  if (routeState !== "content") {
    return (
      <main className="page-shell page-shell--centered">
        <LoadingState message="Checking your session..." />
      </main>
    );
  }

  return (
    <>
      <AppNav />
      {children}
    </>
  );
}
