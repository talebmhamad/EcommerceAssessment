import type { Request } from "express";
import { unauthorized } from "../errors/api-error";

type AuthenticatedUserId = NonNullable<Request["auth"]>["userId"];

export function getAuthenticatedUserId(request: Request): AuthenticatedUserId {
  if (!request.auth) {
    throw unauthorized();
  }

  return request.auth.userId;
}
