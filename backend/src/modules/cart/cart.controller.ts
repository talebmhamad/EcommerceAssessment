import type { Request, Response } from "express";
import { createSuccessResponse } from "../../shared/utilities/api-response";
import { getAuthenticatedUserId } from "../../shared/utilities/auth-request";
import type {
  AddToCartBody,
  CartItemIdParams,
  ChangeCartVariantBody,
  UpdateCartQuantityBody
} from "../../validation/request-schemas";
import {
  addCartItem,
  changeCartItemVariant,
  getCart,
  removeCartItem,
  updateCartItemQuantity
} from "./cart.service";

export async function readCart(
  request: Request,
  response: Response
): Promise<Response> {
  const userId = getAuthenticatedUserId(request);
  const cart = await getCart(userId);

  return response.status(200).json(createSuccessResponse(cart));
}

export async function createCartItem(
  request: Request,
  response: Response
): Promise<Response> {
  const userId = getAuthenticatedUserId(request);
  const body = request.body as AddToCartBody;
  const cartItem = await addCartItem(userId, body);

  return response.status(200).json(createSuccessResponse(cartItem));
}

export async function updateCartItem(
  request: Request,
  response: Response
): Promise<Response> {
  const userId = getAuthenticatedUserId(request);
  const { cartItemId } = request.params as unknown as CartItemIdParams;
  const body = request.body as UpdateCartQuantityBody;
  const cart = await updateCartItemQuantity(userId, cartItemId, body);

  return response.status(200).json(createSuccessResponse(cart));
}

export async function changeCartItemVariantSelection(
  request: Request,
  response: Response
): Promise<Response> {
  const userId = getAuthenticatedUserId(request);
  const { cartItemId } = request.params as unknown as CartItemIdParams;
  const body = request.body as ChangeCartVariantBody;
  const cart = await changeCartItemVariant(userId, cartItemId, body);

  return response.status(200).json(createSuccessResponse(cart));
}

export async function deleteCartItem(
  request: Request,
  response: Response
): Promise<Response> {
  const userId = getAuthenticatedUserId(request);
  const { cartItemId } = request.params as unknown as CartItemIdParams;
  const cart = await removeCartItem(userId, cartItemId);

  return response.status(200).json(createSuccessResponse(cart));
}
