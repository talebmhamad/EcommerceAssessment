export const API_ERROR_CODES = {
  INVALID_REQUEST: "INVALID_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR"
} as const;

export type ApiErrorCode =
  (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

export type ValidationIssue = {
  field: string;
  message: string;
};

export const API_ERROR_STATUS = {
  [API_ERROR_CODES.INVALID_REQUEST]: 400,
  [API_ERROR_CODES.UNAUTHORIZED]: 401,
  [API_ERROR_CODES.FORBIDDEN]: 403,
  [API_ERROR_CODES.NOT_FOUND]: 404,
  [API_ERROR_CODES.CONFLICT]: 409,
  [API_ERROR_CODES.VALIDATION_ERROR]: 422,
  [API_ERROR_CODES.SERVICE_UNAVAILABLE]: 503,
  [API_ERROR_CODES.INTERNAL_SERVER_ERROR]: 500
} as const satisfies Record<ApiErrorCode, number>;

export class ApiError extends Error {
  public readonly statusCode: number;

  public readonly code: ApiErrorCode;

  public readonly details?: ValidationIssue[];

  public readonly isOperational: boolean;

  constructor(params: {
    code: ApiErrorCode;
    message: string;
    statusCode?: number;
    details?: ValidationIssue[];
    isOperational?: boolean;
  }) {
    super(params.message);
    this.name = "ApiError";
    this.code = params.code;
    this.statusCode = params.statusCode ?? API_ERROR_STATUS[params.code];
    this.isOperational = params.isOperational ?? true;
    if (params.details) {
      this.details = params.details;
    }
    Error.captureStackTrace?.(this, ApiError);
  }
}

export function badRequest(message = "Invalid request."): ApiError {
  return new ApiError({
    code: API_ERROR_CODES.INVALID_REQUEST,
    message
  });
}

export function unauthorized(
  message = "Authentication is required."
): ApiError {
  return new ApiError({
    code: API_ERROR_CODES.UNAUTHORIZED,
    message
  });
}

export function forbidden(
  message = "You are not allowed to perform this action."
): ApiError {
  return new ApiError({
    code: API_ERROR_CODES.FORBIDDEN,
    message
  });
}

export function notFound(message = "Resource not found."): ApiError {
  return new ApiError({
    code: API_ERROR_CODES.NOT_FOUND,
    message
  });
}

export function conflict(message = "The request conflicts with existing data."): ApiError {
  return new ApiError({
    code: API_ERROR_CODES.CONFLICT,
    message
  });
}

export function validationError(
  details: ValidationIssue[],
  message = "Request validation failed."
): ApiError {
  return new ApiError({
    code: API_ERROR_CODES.VALIDATION_ERROR,
    message,
    details
  });
}

export function serviceUnavailable(
  message = "Service is temporarily unavailable."
): ApiError {
  return new ApiError({
    code: API_ERROR_CODES.SERVICE_UNAVAILABLE,
    message
  });
}
