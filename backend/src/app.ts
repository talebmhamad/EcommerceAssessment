import compression from "compression";
import express from "express";
import helmet from "helmet";
import { config } from "./config/env";
import { corsMiddleware } from "./middleware/cors";
import { errorHandlerMiddleware } from "./middleware/error-handler";
import { notFoundMiddleware } from "./middleware/not-found";
import { requestIdMiddleware } from "./middleware/request-id";
import { requestLoggerMiddleware } from "./middleware/request-logger";
import { authRouter } from "./modules/auth/auth.routes";
import { cartRouter } from "./modules/cart/cart.routes";
import { checkoutRouter } from "./modules/checkout/checkout.routes";
import { healthRouter } from "./modules/health/health.routes";
import { ordersRouter } from "./modules/orders/orders.routes";
import { productsRouter } from "./modules/products/products.routes";
import { wishlistRouter } from "./modules/wishlist/wishlist.routes";

export function createApp(): express.Express {
  const app = express();

  app.disable("x-powered-by");

  app.use(requestIdMiddleware);
  app.use(requestLoggerMiddleware);
  app.use(helmet());
  app.use(compression());
  app.use(corsMiddleware);
  app.use(express.json({ limit: config.requestBodyLimit }));
  app.use(express.urlencoded({ extended: false, limit: config.requestBodyLimit }));

  app.use("/api/auth", authRouter);
  app.use("/api", healthRouter);
  app.use("/api", productsRouter);
  app.use("/api", cartRouter);
  app.use("/api", wishlistRouter);
  app.use("/api", checkoutRouter);
  app.use("/api", ordersRouter);

  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware);

  return app;
}

export const app = createApp();
