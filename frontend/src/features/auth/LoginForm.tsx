"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { ApiClientError } from "@/services/api";

const DEMO_EMAIL = "demo@ecommerce.local";
const DEMO_PASSWORD = "DemoUser@2026";

export function LoginForm(): React.ReactElement {
  const router = useRouter();
  const { login, status } = useAuth();
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/products");
    }
  }, [router, status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!email.trim() || !password) {
      setErrorMessage("Email and password are required.");
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await login({ email, password });
      router.replace("/products");
    } catch (error) {
      const message =
        error instanceof ApiClientError || error instanceof Error
          ? error.message
          : "Unable to sign in right now.";

      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const isBusy = isSubmitting || status === "loading";

  return (
    <section className="auth-panel" aria-labelledby="login-title">
      <div className="auth-panel__header">
        <p className="eyebrow">Account access</p>
        <h1 id="login-title">Sign in to continue.</h1>
        <p className="lead">
          Use the demo account to access the protected ecommerce workspace.
        </p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <label className="form-field" htmlFor="email">
          <span>Email</span>
          <input
            autoComplete="email"
            disabled={isBusy}
            id="email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>

        <label className="form-field" htmlFor="password">
          <span>Password</span>
          <input
            autoComplete="current-password"
            disabled={isBusy}
            id="password"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>

        {errorMessage ? (
          <p className="message message--error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <button className="button" disabled={isBusy} type="submit">
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="demo-credentials">
        <span>Demo email: {DEMO_EMAIL}</span>
        <span>Demo password: {DEMO_PASSWORD}</span>
      </div>
    </section>
  );
}
