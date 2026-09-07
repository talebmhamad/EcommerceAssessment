import { ApiClientError } from "@/services/api";

const API_ERROR_CODES = {
  CONFLICT: "CONFLICT",
  FORBIDDEN: "FORBIDDEN",
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  INVALID_REQUEST: "INVALID_REQUEST",
  NOT_FOUND: "NOT_FOUND",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  UNAUTHORIZED: "UNAUTHORIZED",
  VALIDATION_ERROR: "VALIDATION_ERROR"
} as const;

type ErrorContext =
  | "cart"
  | "cartMutation"
  | "checkout"
  | "health"
  | "login"
  | "order"
  | "product"
  | "products"
  | "wishlist"
  | "wishlistMutation";

export function isExpiredAuthenticationError(error: unknown): boolean {
  return (
    error instanceof ApiClientError &&
    error.status === 401 &&
    error.code === API_ERROR_CODES.UNAUTHORIZED
  );
}

export function isNotFoundError(error: unknown): boolean {
  return error instanceof ApiClientError && error.status === 404;
}

export function getValidationIssueMessages(error: unknown): string[] {
  if (!(error instanceof ApiClientError) || !error.details) {
    return [];
  }

  return error.details.map((detail) => detail.message);
}

function isApiUnavailableError(error: unknown): boolean {
  return (
    error instanceof TypeError ||
    (error instanceof ApiClientError &&
      (error.status === 0 ||
        error.code === API_ERROR_CODES.SERVICE_UNAVAILABLE ||
        error.code === API_ERROR_CODES.INTERNAL_SERVER_ERROR))
  );
}

function messageMentions(error: ApiClientError, text: string): boolean {
  return error.message.toLowerCase().includes(text.toLowerCase());
}

function getNotFoundMessage(context: ErrorContext): string {
  if (context === "product") {
    return "This product is no longer available.";
  }

  if (context === "order") {
    return "This order could not be found for your account.";
  }

  return "We could not find the requested item.";
}

export function getFriendlyErrorMessage(
  error: unknown,
  context: ErrorContext,
  fallback = "Something went wrong. Please try again."
): string {
  if (
    context === "login" &&
    error instanceof ApiClientError &&
    error.status === 401
  ) {
    return "Email or password is incorrect.";
  }

  if (isExpiredAuthenticationError(error)) {
    return "Your session has expired. Please sign in again.";
  }

  if (isApiUnavailableError(error)) {
    return "The API is unavailable right now. Check that the backend is running and try again.";
  }

  if (error instanceof ApiClientError) {
    if (messageMentions(error, "variant")) {
      return "That product option is no longer available. Please choose another variant.";
    }

    if (error.code === API_ERROR_CODES.FORBIDDEN) {
      return "You do not have access to that resource.";
    }

    if (error.status === 404) {
      return getNotFoundMessage(context);
    }

    if (error.code === API_ERROR_CODES.VALIDATION_ERROR) {
      if (context === "login") {
        return "Check your email and password, then try again.";
      }

      return "Some information is invalid. Please review it and try again.";
    }

    if (
      error.code === API_ERROR_CODES.CONFLICT &&
      messageMentions(error, "stock")
    ) {
      return "There is not enough stock available for that quantity.";
    }

    if (context === "cartMutation") {
      return "We could not update your cart. Your current cart was preserved.";
    }

    if (context === "checkout") {
      return "We could not place your order. Your cart was preserved.";
    }

    if (context === "wishlistMutation") {
      return "We could not update your wishlist. Your saved products were preserved.";
    }
  }

  return fallback;
}
