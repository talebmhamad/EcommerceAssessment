import cors, { type CorsOptions } from "cors";
import { config } from "../config/env";
import { forbidden } from "../shared/errors/api-error";

const corsOptions: CorsOptions = {
  credentials: true,
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (config.cors.allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(forbidden("The request origin is not allowed."));
  },
  optionsSuccessStatus: 204
};

export const corsMiddleware = cors(corsOptions);
