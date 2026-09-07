import { Router } from "express";
import { validateParamsAsBadRequest } from "../../middleware/validate-request";
import { asyncRoute } from "../../shared/utilities/async-route";
import { productIdParamsSchema } from "../../validation/request-schemas";
import { authenticateRequest } from "../auth/auth.middleware";
import { getProduct, getProducts } from "./products.controller";

export const productsRouter = Router();

productsRouter.get("/products", authenticateRequest, asyncRoute(getProducts));
productsRouter.get(
  "/products/:productId",
  authenticateRequest,
  validateParamsAsBadRequest(productIdParamsSchema),
  asyncRoute(getProduct)
);
