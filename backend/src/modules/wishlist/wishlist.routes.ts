import { Router } from "express";
import { validateBody, validateParams } from "../../middleware/validate-request";
import { asyncRoute } from "../../shared/utilities/async-route";
import {
  addToWishlistBodySchema,
  productIdParamsSchema
} from "../../validation/request-schemas";
import { authenticateRequest } from "../auth/auth.middleware";
import {
  createWishlistItem,
  deleteWishlistItem,
  readWishlist
} from "./wishlist.controller";

export const wishlistRouter = Router();

wishlistRouter.get(
  "/wishlist",
  authenticateRequest,
  asyncRoute(readWishlist)
);

wishlistRouter.post(
  "/wishlist/items",
  authenticateRequest,
  validateBody(addToWishlistBodySchema),
  asyncRoute(createWishlistItem)
);

wishlistRouter.delete(
  "/wishlist/items/:productId",
  authenticateRequest,
  validateParams(productIdParamsSchema),
  asyncRoute(deleteWishlistItem)
);
