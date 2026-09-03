import pinoHttp from "pino-http";
import { logger } from "../config/logger";
import { formatRequestId } from "../shared/utilities/request-id";

export const requestLoggerMiddleware = pinoHttp({
  logger,
  customProps: (request) => ({
    requestId: formatRequestId(request.id) ?? "unknown"
  }),
  customLogLevel: (_request, response, error) => {
    if (error || response.statusCode >= 500) {
      return "error";
    }

    if (response.statusCode >= 400) {
      return "warn";
    }

    return "info";
  }
});
