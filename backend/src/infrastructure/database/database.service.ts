import { logger } from "../../config/logger";
import { serviceUnavailable } from "../../shared/errors/api-error";
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

      throw serviceUnavailable("Database connection failed.");
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
