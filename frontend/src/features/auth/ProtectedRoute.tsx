"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";

type ProtectedRouteProps = {
  children: React.ReactNode;
};

export function ProtectedRoute({
  children
}: ProtectedRouteProps): React.ReactElement {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [router, status]);

  if (status !== "authenticated") {
    return (
      <main className="page-shell page-shell--centered">
        <section className="auth-panel" aria-live="polite">
          <p className="message">Checking your session...</p>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
