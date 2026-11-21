import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiError } from './errors';
import { User, SupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export type AuthenticatedHandler = (
  req: NextRequest,
  context: { user: User; supabase: SupabaseClient; params?: Record<string, string | string[]> }
) => Promise<NextResponse>;

/**
 * Higher-order function wrapping route handlers with Supabase session validation.
 * Uses the user-scoped server client so Row-Level Security (RLS) is strictly enforced.
 */
export function withAuth(handler: AuthenticatedHandler): (
  req: NextRequest,
  context: { params: Promise<Record<string, string | string[]>> }
) => Promise<NextResponse> {
  return async (
    req: NextRequest,
    context: { params: Promise<Record<string, string | string[]>> } = {
      params: Promise.resolve({}),
    }
  ): Promise<NextResponse> => {
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        return apiError('UNAUTHENTICATED', 'You must be signed in to perform this action', 401);
      }

      const resolvedParams = context?.params ? await context.params : {};
      return await handler(req, { user, supabase, params: resolvedParams });
    } catch (err: unknown) {
      console.error('Unhandled API error:', err);
      return apiError('INTERNAL', 'An unexpected internal error occurred', 500);
    }
  };
}
