import type { Request, Response } from "express";
import { createSuccessResponse } from "../../shared/utilities/api-response";
import { getAuthenticatedUserId } from "../../shared/utilities/auth-request";
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
  const userId = getAuthenticatedUserId(request);
  const user = await getAuthenticatedUserById(userId);

  return response.status(200).json(createSuccessResponse(user));
}
