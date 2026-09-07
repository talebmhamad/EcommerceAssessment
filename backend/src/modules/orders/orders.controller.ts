import type { Request, Response } from "express";
import { createSuccessResponse } from "../../shared/utilities/api-response";
import { getAuthenticatedUserId } from "../../shared/utilities/auth-request";
import type { OrderIdParams } from "../../validation/request-schemas";
import { getOrderByIdForUser } from "./orders.service";

export async function getOrder(
  request: Request,
  response: Response
): Promise<Response> {
  const userId = getAuthenticatedUserId(request);
  const { orderId } = request.params as unknown as OrderIdParams;
  const order = await getOrderByIdForUser(userId, orderId);

  return response.status(200).json(createSuccessResponse(order));
}
