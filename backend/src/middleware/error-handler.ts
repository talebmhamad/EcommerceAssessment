import type { ErrorRequestHandler } from "express";
import { config } from "../config/env";
import { ApiError } from "../shared/errors/api-error";
import { createErrorResponse } from "../shared/utilities/api-response";
import { formatRequestId } from "../shared/utilities/request-id";

function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  return new ApiError({
    statusCode: 500,
    code: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred."
  });
}

export const errorHandlerMiddleware: ErrorRequestHandler = (
  error,
  request,
  response,
  _next
) => {
  const normalizedError = normalizeError(error);
  const statusCode = normalizedError.statusCode;
  const isServerError = statusCode >= 500;
  const requestId = formatRequestId(request.id) ?? "unknown";

  if (isServerError) {
    request.log.error({ err: error, requestId }, "Request failed");
  } else {
    request.log.warn({ err: error, requestId }, "Request rejected");
  }

  response.status(statusCode).json(
    createErrorResponse({
      code: normalizedError.code,
      message: normalizedError.message,
      requestId,
      details:
        config.isProduction || !isServerError
          ? normalizedError.details
          : {
              stack: error instanceof Error ? error.stack : undefined
            }
    })
  );
};
