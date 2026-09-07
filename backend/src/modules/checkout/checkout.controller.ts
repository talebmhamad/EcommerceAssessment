import type { Request, Response } from "express";
import { createSuccessResponse } from "../../shared/utilities/api-response";
import { getAuthenticatedUserId } from "../../shared/utilities/auth-request";
import {
  checkout,
  validateCheckout
} from "./checkout.service";

export async function validateCheckoutRequest(
  request: Request,
  response: Response
): Promise<Response> {
  const userId = getAuthenticatedUserId(request);
  const validatedCart = await validateCheckout(userId);

  return response.status(200).json(createSuccessResponse(validatedCart));
}

export async function createCheckout(
  request: Request,
  response: Response
): Promise<Response> {
  const userId = getAuthenticatedUserId(request);
  const order = await checkout(userId);

  return response.status(200).json(createSuccessResponse(order));
}
