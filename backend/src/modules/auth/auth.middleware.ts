import type { NextFunction, Request, Response } from "express";
import { unauthorized } from "../../shared/errors/api-error";
import { getUserIdFromAccessToken } from "./jwt";

const BEARER_PREFIX = "Bearer ";

export function authenticateRequest(
  request: Request,
  _response: Response,
  next: NextFunction
): void {
  const authorization = request.header("authorization");

  if (!authorization?.startsWith(BEARER_PREFIX)) {
    next(unauthorized());
    return;
  }

  const token = authorization.slice(BEARER_PREFIX.length).trim();

  if (!token || token.includes(" ")) {
    next(unauthorized());
    return;
  }

  try {
    const userId = getUserIdFromAccessToken(token);
    request.auth = { userId };
    next();
  } catch {
    next(unauthorized());
  }
}
