import type {
  ApiErrorResponse,
  ApiSuccessResponse
} from "../types/api-response";

export function createSuccessResponse<TData>(
  data: TData
): ApiSuccessResponse<TData> {
  return {
    success: true,
    data
  };
}

export function createErrorResponse(params: {
  code: string;
  message: string;
  requestId?: string;
  details?: unknown;
}): ApiErrorResponse {
  return {
    success: false,
    error: {
      code: params.code,
      message: params.message,
      ...(params.requestId ? { requestId: params.requestId } : {}),
      ...(params.details ? { details: params.details } : {})
    }
  };
}
