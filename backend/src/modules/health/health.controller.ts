import type { Request, Response } from "express";
import {
  createErrorResponse,
  createSuccessResponse
} from "../../shared/utilities/api-response";
import { formatRequestId } from "../../shared/utilities/request-id";
import { getHealthStatus, getReadinessStatus } from "./health.service";

export function getHealth(
  _request: Request,
  response: Response
): Response {
  return response.status(200).json(createSuccessResponse(getHealthStatus()));
}

export async function getReadiness(
  request: Request,
  response: Response
): Promise<Response> {
  const readiness = await getReadinessStatus();

  if (!readiness) {
    const requestId = formatRequestId(request.id);

    return response.status(503).json(
      createErrorResponse({
        code: "SERVICE_UNAVAILABLE",
        message: "Database connection is unavailable.",
        ...(requestId ? { requestId } : {})
      })
    );
  }

  return response.status(200).json(createSuccessResponse(readiness));
}
