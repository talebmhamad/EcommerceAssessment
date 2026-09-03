import { Router } from "express";
import { asyncRoute } from "../../shared/utilities/async-route";
import { getHealth, getReadiness } from "./health.controller";

export const healthRouter = Router();

healthRouter.get("/health", getHealth);
healthRouter.get("/health/ready", asyncRoute(getReadiness));
