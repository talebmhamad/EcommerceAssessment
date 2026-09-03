import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../shared/errors/api-error";

export function notFoundMiddleware(
  request: Request,
  _response: Response,
  next: NextFunction
): void {
  next(
    new ApiError({
      statusCode: 404,
      code: "ROUTE_NOT_FOUND",
      message: `Route ${request.method} ${request.originalUrl} was not found.`
    })
  );
}
