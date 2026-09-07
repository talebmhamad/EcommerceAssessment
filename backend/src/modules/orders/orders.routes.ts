import { Router } from "express";
import { validateParamsAsBadRequest } from "../../middleware/validate-request";
import { asyncRoute } from "../../shared/utilities/async-route";
import { orderIdParamsSchema } from "../../validation/request-schemas";
import { authenticateRequest } from "../auth/auth.middleware";
import { getOrder } from "./orders.controller";

export const ordersRouter = Router();

ordersRouter.get(
  "/orders/:orderId",
  authenticateRequest,
  validateParamsAsBadRequest(orderIdParamsSchema),
  asyncRoute(getOrder)
);
