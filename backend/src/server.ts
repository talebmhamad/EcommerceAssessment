import type { Server } from "node:http";
import { app } from "./app";
import { config } from "./config/env";
import { logger } from "./config/logger";
import { databaseService } from "./infrastructure/database";
import { getSafeDatabaseError } from "./shared/utilities/database-error";

let server: Server | undefined;
let isShuttingDown = false;

function startServer(): void {
  server = app.listen(config.port, () => {
    logger.info(
      {
        port: config.port,
        environment: config.nodeEnv,
        allowedOrigins: config.cors.allowedOrigins
      },
      "Backend server started"
    );
  });

  server.on("error", (error) => {
    logger.fatal(
      { error: getSafeDatabaseError(error), port: config.port },
      "Backend server failed to start"
    );

    void databaseService.disconnect().finally(() => {
      process.exit(1);
    });
  });
}

function closeServer(signal: string): void {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info({ signal }, "Shutting down backend server");

  const forceExitTimeout = setTimeout(() => {
    logger.error({ signal }, "Forced shutdown after timeout");
    process.exit(1);
  }, 10_000);

  forceExitTimeout.unref();

  if (!server) {
    void databaseService.disconnect().finally(() => {
      process.exit(1);
    });
    return;
  }

  server.close((error) => {
    if (error) {
      logger.error(
        { error: getSafeDatabaseError(error) },
        "Error while closing backend server"
      );

      void databaseService.disconnect().finally(() => {
        process.exit(1);
      });
      return;
    }

    void databaseService.disconnect().finally(() => {
      logger.info("Backend server closed");
      process.exit(0);
    });
  });
}

process.on("SIGINT", () => {
  closeServer("SIGINT");
});

process.on("SIGTERM", () => {
  closeServer("SIGTERM");
});

process.on("unhandledRejection", (reason) => {
  logger.fatal(
    { error: getSafeDatabaseError(reason) },
    "Unhandled promise rejection"
  );
  closeServer("unhandledRejection");
});

process.on("uncaughtException", (error) => {
  logger.fatal(
    { error: getSafeDatabaseError(error) },
    "Uncaught exception"
  );
  closeServer("uncaughtException");
});

try {
  startServer();
} catch (error) {
  logger.fatal({ error: getSafeDatabaseError(error) }, "Backend startup failed");
  closeServer("startupFailure");
}
