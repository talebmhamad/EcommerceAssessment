import pino from "pino";
import { config } from "./env";

export const logger = pino({
  level: config.isProduction ? "info" : "debug",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.headers['set-cookie']",
      "req.headers['x-api-key']",
      "res.headers['set-cookie']",
      "password",
      "passwordHash",
      "token",
      "accessToken",
      "refreshToken",
      "databaseUrl",
      "DATABASE_URL"
    ],
    censor: "[Redacted]"
  },
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
