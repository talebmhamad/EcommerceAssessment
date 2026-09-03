import { logger } from "../../config/logger";
import { ApiError } from "../../shared/errors/api-error";
import { getSafeDatabaseError } from "../../shared/utilities/database-error";
import { prisma } from "./prisma.client";

class DatabaseService {
  async connect(): Promise<void> {
    try {
      await prisma.$connect();
      logger.info("Database connection established");
    } catch (error) {
      logger.error(
        { error: getSafeDatabaseError(error) },
        "Database connection failed"
      );

      throw new ApiError({
        statusCode: 503,
        code: "DATABASE_CONNECTION_FAILED",
        message: "Database connection failed."
      });
    }
  }

  async disconnect(): Promise<void> {
    try {
      await prisma.$disconnect();
      logger.info("Database connection closed");
    } catch (error) {
      logger.error(
        { error: getSafeDatabaseError(error) },
        "Database disconnection failed"
      );
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.warn(
        { error: getSafeDatabaseError(error) },
        "Database readiness check failed"
      );
      return false;
    }
  }
}

export const databaseService = new DatabaseService();
