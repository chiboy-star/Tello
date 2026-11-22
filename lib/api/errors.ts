import { NextResponse } from 'next/server';

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION'
  | 'RATE_LIMITED'
  | 'AI_BUSY'
  | 'AI_LIMIT'
  | 'AI_PARSE_FAILED'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA'
  | 'INTERNAL'
  | 'SERVICE_UNAVAILABLE';

export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
    fieldErrors?: Record<string, string[]>;
  };
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  status = 400,
  detailsOrFieldErrors?: unknown
): NextResponse<ApiErrorResponse> {
  const isFieldErrors =
    detailsOrFieldErrors &&
    typeof detailsOrFieldErrors === 'object' &&
    !Array.isArray(detailsOrFieldErrors) &&
    Object.values(detailsOrFieldErrors).every((v) => Array.isArray(v));

  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(detailsOrFieldErrors !== undefined ? { details: detailsOrFieldErrors } : {}),
        ...(isFieldErrors ? { fieldErrors: detailsOrFieldErrors as Record<string, string[]> } : {}),
      },
    },
    { status }
  );
}
