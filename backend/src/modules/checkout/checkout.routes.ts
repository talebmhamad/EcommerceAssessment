import { Router } from "express";
import { validateBody } from "../../middleware/validate-request";
import { asyncRoute } from "../../shared/utilities/async-route";
import { validateCheckoutBodySchema } from "../../validation/request-schemas";
import { authenticateRequest } from "../auth/auth.middleware";
import {
  createCheckout,
  validateCheckoutRequest
} from "./checkout.controller";

export const checkoutRouter = Router();

checkoutRouter.post(
  "/checkout/validate",
  authenticateRequest,
  validateBody(validateCheckoutBodySchema),
  asyncRoute(validateCheckoutRequest)
);

checkoutRouter.post(
  "/checkout",
  authenticateRequest,
  validateBody(validateCheckoutBodySchema),
  asyncRoute(createCheckout)
);
