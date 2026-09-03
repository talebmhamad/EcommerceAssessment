"use client";

import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { useAuth } from "@/features/auth/AuthProvider";

type ProtectedPlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function ProtectedPlaceholder({
  eyebrow,
  title,
  description
}: ProtectedPlaceholderProps): React.ReactElement {
  const { logout, user } = useAuth();

  return (
    <ProtectedRoute>
      <main className="page-shell">
        <div className="page-content protected-layout">
          <section className="intro" aria-labelledby="protected-title">
            <p className="eyebrow">{eyebrow}</p>
            <h1 id="protected-title">{title}</h1>
            <p className="lead">{description}</p>
          </section>

          <section className="status-panel" aria-labelledby="session-title">
            <div className="status-panel__header">
              <h2 id="session-title" className="status-panel__title">
                Signed-in session
              </h2>
              <button
                className="button button--secondary"
                onClick={logout}
                type="button"
              >
                Log out
              </button>
            </div>

            <div className="status-panel__body">
              <div className="status-grid">
                <div className="status-item">
                  <span className="status-label">User ID</span>
                  <span className="status-value">{user?.id}</span>
                </div>
                <div className="status-item">
                  <span className="status-label">Email</span>
                  <span className="status-value">{user?.email}</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </ProtectedRoute>
  );
}
