import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { apiError } from '@/lib/api/errors';

export const POST = withAuth(async (_req: NextRequest, { user: _user, supabase, params }) => {
  const batchId = params?.batchId as string;
  if (!batchId) {
    return apiError('VALIDATION', 'Missing batch id', 422);
  }

  const { data: restoredCount, error } = await supabase.rpc('unvoid_batch', {
    p_batch_id: batchId,
  });

  if (error) {
    return apiError('INTERNAL', error.message || 'Failed to restore batch', 500);
  }

  return NextResponse.json({ restored: restoredCount || 0 });
});
