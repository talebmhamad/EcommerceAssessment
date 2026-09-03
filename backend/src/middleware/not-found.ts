import type { NextFunction, Request, Response } from "express";
import { notFound } from "../shared/errors/api-error";

export function notFoundMiddleware(
  _request: Request,
  _response: Response,
  next: NextFunction
): void {
  next(notFound("API route not found."));
}
