import type { Request, Response } from "express";
import { serviceUnavailable } from "../../shared/errors/api-error";
import { createSuccessResponse } from "../../shared/utilities/api-response";
import { getHealthStatus, getReadinessStatus } from "./health.service";

export function getHealth(
  _request: Request,
  response: Response
): Response {
  return response.status(200).json(createSuccessResponse(getHealthStatus()));
}

export async function getReadiness(
  _request: Request,
  response: Response
): Promise<Response> {
  const readiness = await getReadinessStatus();

  if (!readiness) {
    throw serviceUnavailable("Database connection is unavailable.");
  }

  return response.status(200).json(createSuccessResponse(readiness));
}
