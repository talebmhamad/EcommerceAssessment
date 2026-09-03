import type { config } from "../../config/env";

export type HealthStatus = {
  status: "ok";
  service: "backend";
  environment: typeof config.nodeEnv;
  timestamp: string;
};

export type ReadinessStatus = {
  status: "ready";
  database: "connected";
  timestamp: string;
};
