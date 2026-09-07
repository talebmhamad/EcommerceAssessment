const SESSION_EXPIRED_STORAGE_KEY = "ecommerce.session-expired-message";
const SESSION_EXPIRED_EVENT = "ecommerce:session-expired";
const DEFAULT_SESSION_EXPIRED_MESSAGE =
  "Your session has expired. Please sign in again.";

type SessionExpiredEvent = CustomEvent<string>;

export function notifySessionExpired(
  message = DEFAULT_SESSION_EXPIRED_MESSAGE
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(SESSION_EXPIRED_STORAGE_KEY, message);
  window.dispatchEvent(
    new CustomEvent<string>(SESSION_EXPIRED_EVENT, { detail: message })
  );
}

export function consumeSessionExpiredMessage(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const message = window.sessionStorage.getItem(SESSION_EXPIRED_STORAGE_KEY);
  window.sessionStorage.removeItem(SESSION_EXPIRED_STORAGE_KEY);

  return message;
}

export function clearSessionExpiredMessage(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(SESSION_EXPIRED_STORAGE_KEY);
}

export function listenForSessionExpiration(
  listener: (message: string) => void
): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleSessionExpired = (event: Event): void => {
    listener(
      (event as SessionExpiredEvent).detail ?? DEFAULT_SESSION_EXPIRED_MESSAGE
    );
  };

  window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);

  return () => {
    window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  };
}
