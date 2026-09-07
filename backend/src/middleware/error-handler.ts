import type { ErrorRequestHandler } from "express";
import { Prisma } from "../generated/prisma/client";
import {
  API_ERROR_CODES,
  ApiError,
  badRequest,
  conflict,
  notFound,
  serviceUnavailable
} from "../shared/errors/api-error";
import { createErrorResponse } from "../shared/utilities/api-response";
import { formatRequestId } from "../shared/utilities/request-id";

type HttpParserError = Error & {
  status?: number;
  statusCode?: number;
  type?: string;
};

function isHttpParserError(error: unknown): error is HttpParserError {
  if (!(error instanceof Error)) {
    return false;
  }

  const candidate = error as HttpParserError;

  return (
    candidate.type === "entity.parse.failed" ||
    candidate.type === "entity.too.large" ||
    candidate.status === 400 ||
    candidate.statusCode === 400 ||
    candidate.status === 413 ||
    candidate.statusCode === 413
  );
}

function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError && error.isOperational) {
    return error;
  }

  if (isHttpParserError(error)) {
    if (error.type === "entity.too.large") {
      return badRequest("Request body is too large.");
    }

    return badRequest("Request body contains invalid JSON.");
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return conflict("The request conflicts with existing data.");
    }

    if (error.code === "P2025") {
      return notFound("Resource not found.");
    }

    if (error.code === "P2003") {
      return conflict("Referenced data changed. Please refresh and try again.");
    }

    if (error.code === "P2034") {
      return conflict(
        "The request conflicted with another update. Please try again."
      );
    }
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return serviceUnavailable("Service is temporarily unavailable.");
  }

  return new ApiError({
    code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
    message: "An unexpected server error occurred.",
    isOperational: false
  });
}

export const errorHandlerMiddleware: ErrorRequestHandler = (
  error,
  request,
  response,
  next
) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  const normalizedError = normalizeError(error);
  const statusCode = normalizedError.statusCode;
  const isUnexpectedServerError = !normalizedError.isOperational;
  const requestId = formatRequestId(request.id) ?? "unknown";
  const logContext = {
    requestId,
    method: request.method,
    path: request.originalUrl,
    statusCode,
    code: normalizedError.code
  };

  if (isUnexpectedServerError) {
    request.log.error(
      {
        ...logContext,
        errorName: error instanceof Error ? error.name : typeof error,
        err: error
      },
      "Unexpected request failure"
    );
  } else {
    request.log.warn(logContext, "Request rejected");
  }

  response.status(statusCode).json(
    createErrorResponse({
      code: normalizedError.code,
      message: normalizedError.message,
      requestId,
      ...(normalizedError.details ? { details: normalizedError.details } : {})
    })
  );
};
