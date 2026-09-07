"use client";

import { useEffect, useState } from "react";
import { getFriendlyErrorMessage } from "@/features/errors/api-errors";
import { getBackendHealth } from "@/services/api";
import type { HealthStatusData } from "@/types/health";

type LoadState =
  | { status: "loading" }
  | { status: "success"; data: HealthStatusData }
  | { status: "error"; message: string };

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "medium"
  }).format(new Date(value));
}

export function HealthStatus(): React.ReactElement {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;

    async function loadHealth(): Promise<void> {
      try {
        const data = await getBackendHealth();

        if (isMounted) {
          setState({ status: "success", data });
        }
      } catch (error) {
        const message = getFriendlyErrorMessage(
          error,
          "health",
          "Unable to reach the backend health endpoint."
        );

        if (isMounted) {
          setState({ status: "error", message });
        }
      }
    }

    void loadHealth();

    return () => {
      isMounted = false;
    };
  }, []);

  const pillClassName =
    state.status === "success"
      ? "status-pill status-pill--success"
      : state.status === "error"
        ? "status-pill status-pill--error"
        : "status-pill";

  return (
    <section className="status-panel" aria-labelledby="health-title">
      <div className="status-panel__header">
        <h2 id="health-title" className="status-panel__title">
          Backend health
        </h2>
        <span className={pillClassName}>
          {state.status === "success"
            ? "Connected"
            : state.status === "error"
              ? "Unavailable"
              : "Checking"}
        </span>
      </div>

      <div className="status-panel__body">
        {state.status === "loading" ? (
          <p className="message">Checking backend availability...</p>
        ) : null}

        {state.status === "error" ? (
          <p className="message message--error">{state.message}</p>
        ) : null}

        {state.status === "success" ? (
          <div className="status-grid">
            <div className="status-item">
              <span className="status-label">Status</span>
              <span className="status-value">{state.data.status}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Service</span>
              <span className="status-value">{state.data.service}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Environment</span>
              <span className="status-value">{state.data.environment}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Checked at</span>
              <span className="status-value">
                {formatTimestamp(state.data.timestamp)}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
