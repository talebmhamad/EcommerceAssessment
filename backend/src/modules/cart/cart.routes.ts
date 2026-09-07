import { Router } from "express";
import { validateBody, validateParams } from "../../middleware/validate-request";
import { asyncRoute } from "../../shared/utilities/async-route";
import {
  addToCartBodySchema,
  cartItemIdParamsSchema,
  changeCartVariantBodySchema,
  updateCartQuantityBodySchema
} from "../../validation/request-schemas";
import { authenticateRequest } from "../auth/auth.middleware";
import {
  changeCartItemVariantSelection,
  createCartItem,
  deleteCartItem,
  readCart,
  updateCartItem
} from "./cart.controller";

export const cartRouter = Router();

cartRouter.get("/cart", authenticateRequest, asyncRoute(readCart));

cartRouter.post(
  "/cart/items",
  authenticateRequest,
  validateBody(addToCartBodySchema),
  asyncRoute(createCartItem)
);

cartRouter.patch(
  "/cart/items/:cartItemId",
  authenticateRequest,
  validateParams(cartItemIdParamsSchema),
  validateBody(updateCartQuantityBodySchema),
  asyncRoute(updateCartItem)
);

cartRouter.patch(
  "/cart/items/:cartItemId/variant",
  authenticateRequest,
  validateParams(cartItemIdParamsSchema),
  validateBody(changeCartVariantBodySchema),
  asyncRoute(changeCartItemVariantSelection)
);

cartRouter.delete(
  "/cart/items/:cartItemId",
  authenticateRequest,
  validateParams(cartItemIdParamsSchema),
  asyncRoute(deleteCartItem)
);
