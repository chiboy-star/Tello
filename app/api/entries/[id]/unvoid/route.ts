import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { apiError } from '@/lib/api/errors';

export const POST = withAuth(async (_req: NextRequest, { user: _user, supabase, params }) => {
  const entryId = params?.id as string;
  if (!entryId) {
    return apiError('VALIDATION', 'Missing entry id', 422);
  }

  const { data: entry, error } = await supabase.rpc('unvoid_entry', {
    p_entry_id: entryId,
  });

  if (error) {
    return apiError('INTERNAL', error.message || 'Failed to restore entry', 500);
  }

  return NextResponse.json({ entry });
});
