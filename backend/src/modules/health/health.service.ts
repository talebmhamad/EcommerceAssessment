import { config } from "../../config/env";
import { databaseService } from "../../infrastructure/database";
import type { HealthStatus, ReadinessStatus } from "./health.types";

export function getHealthStatus(): HealthStatus {
  return {
    status: "ok",
    service: "backend",
    environment: config.nodeEnv,
    timestamp: new Date().toISOString()
  };
}

export async function getReadinessStatus(): Promise<ReadinessStatus | null> {
  const isDatabaseConnected = await databaseService.checkConnection();

  if (!isDatabaseConnected) {
    return null;
  }

  return {
    status: "ready",
    database: "connected",
    timestamp: new Date().toISOString()
  };
}
