export type ApiSuccessResponse<TData> = {
  success: true;
  data: TData;
};

export type ApiValidationIssue = {
  field: string;
  message: string;
};

export type ApiErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiValidationIssue[];
    requestId: string;
  };
};

export type ApiResponse<TData> = ApiSuccessResponse<TData> | ApiErrorResponse;
