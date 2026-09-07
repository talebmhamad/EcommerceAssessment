import type { Request, Response } from "express";
import { createSuccessResponse } from "../../shared/utilities/api-response";
import { getAuthenticatedUserId } from "../../shared/utilities/auth-request";
import type {
  AddToWishlistBody,
  ProductIdParams
} from "../../validation/request-schemas";
import {
  addWishlistItem,
  listWishlistItems,
  removeWishlistItem
} from "./wishlist.service";

export async function readWishlist(
  request: Request,
  response: Response
): Promise<Response> {
  const userId = getAuthenticatedUserId(request);
  const wishlist = await listWishlistItems(userId);

  return response.status(200).json(createSuccessResponse(wishlist));
}

export async function createWishlistItem(
  request: Request,
  response: Response
): Promise<Response> {
  const userId = getAuthenticatedUserId(request);
  const body = request.body as AddToWishlistBody;
  const item = await addWishlistItem(userId, body);

  return response.status(200).json(createSuccessResponse(item));
}

export async function deleteWishlistItem(
  request: Request,
  response: Response
): Promise<Response> {
  const userId = getAuthenticatedUserId(request);
  const { productId } = request.params as unknown as ProductIdParams;
  const wishlist = await removeWishlistItem(userId, productId);

  return response.status(200).json(createSuccessResponse(wishlist));
}
