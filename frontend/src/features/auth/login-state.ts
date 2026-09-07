type LoginBusyInput = {
  authStatus: "authenticated" | "loading" | "unauthenticated";
  isSubmitting: boolean;
};

export function isLoginBusy({
  authStatus,
  isSubmitting
}: LoginBusyInput): boolean {
  return isSubmitting || authStatus === "loading";
}

export function getLoginValidationMessage(
  email: string,
  password: string
): string | null {
  if (!email.trim() || !password) {
    return "Email and password are required.";
  }

  return null;
}
