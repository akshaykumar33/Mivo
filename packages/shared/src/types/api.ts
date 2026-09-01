export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Array<{
    field?: string;
    issue: string;
  }>;
}

export interface ApiMeta {
  timestamp: string;
  requestId?: string;
  totalCount?: number;
  hasMore?: boolean;
  nextCursor?: string;
}
