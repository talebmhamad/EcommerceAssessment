import type { Request, Response } from "express";
import { unauthorized } from "../../shared/errors/api-error";
import { createSuccessResponse } from "../../shared/utilities/api-response";
import type { LoginBody } from "../../validation/request-schemas";
import {
  getAuthenticatedUserById,
  login as loginUser
} from "./auth.service";

export async function login(
  request: Request,
  response: Response
): Promise<Response> {
  const loginBody = request.body as LoginBody;
  const result = await loginUser(loginBody);

  return response.status(200).json(createSuccessResponse(result));
}

export async function getCurrentUser(
  request: Request,
  response: Response
): Promise<Response> {
  if (!request.auth) {
    throw unauthorized();
  }

  const user = await getAuthenticatedUserById(request.auth.userId);

  return response.status(200).json(createSuccessResponse(user));
}
