import { NextResponse } from 'next/server';

export type ApiErrorCode =
  | 'UNAUTHENTICATED'
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'AI_BUSY'
  | 'AI_LIMIT'
  | 'AI_PARSE_FAILED'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA'
  | 'INTERNAL';

export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    fieldErrors?: Record<string, string[]>;
  };
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  status = 400,
  fieldErrors?: Record<string, string[]>
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(fieldErrors ? { fieldErrors } : {}),
      },
    },
    { status }
  );
}
