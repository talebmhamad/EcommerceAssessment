import cors, { type CorsOptions } from "cors";
import { config } from "../config/env";
import { ApiError } from "../shared/errors/api-error";

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

    callback(
      new ApiError({
        statusCode: 403,
        code: "CORS_ORIGIN_NOT_ALLOWED",
        message: "The request origin is not allowed."
      })
    );
  },
  optionsSuccessStatus: 204
};

export const corsMiddleware = cors(corsOptions);
