import type {
  ApiErrorCode,
  ValidationIssue
} from "../errors/api-error";

export type ApiSuccessResponse<TData> = {
  success: true;
  data: TData;
  meta?: Record<string, unknown>;
};

export type ApiErrorResponse = {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: ValidationIssue[];
    requestId: string;
  };
};
