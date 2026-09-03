import { Router } from "express";
import { validateBody } from "../../middleware/validate-request";
import { asyncRoute } from "../../shared/utilities/async-route";
import { loginBodySchema } from "../../validation/request-schemas";
import { authenticateRequest } from "./auth.middleware";
import { getCurrentUser, login } from "./auth.controller";

export const authRouter = Router();

authRouter.post("/login", validateBody(loginBodySchema), asyncRoute(login));
authRouter.get("/me", authenticateRequest, asyncRoute(getCurrentUser));
