import type {
  ApiErrorResponse,
  ApiSuccessResponse
} from "../types/api-response";
import type {
  ApiErrorCode,
  ValidationIssue
} from "../errors/api-error";

export function createSuccessResponse<TData>(
  data: TData,
  meta?: Record<string, unknown>
): ApiSuccessResponse<TData> {
  return {
    success: true,
    data,
    ...(meta ? { meta } : {})
  };
}

export function createErrorResponse(params: {
  code: ApiErrorCode;
  message: string;
  requestId: string;
  details?: ValidationIssue[];
}): ApiErrorResponse {
  return {
    success: false,
    error: {
      code: params.code,
      message: params.message,
      requestId: params.requestId,
      ...(params.details ? { details: params.details } : {})
    }
  };
}
