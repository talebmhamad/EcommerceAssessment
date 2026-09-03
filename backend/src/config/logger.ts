import pino from "pino";
import { config } from "./env";

export const logger = pino({
  level: config.isProduction ? "info" : "debug",
  ...(config.isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            singleLine: true
          }
        }
      })
});
