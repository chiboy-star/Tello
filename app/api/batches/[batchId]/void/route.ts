import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { apiError } from '@/lib/api/errors';

export const POST = withAuth(async (_req: NextRequest, { user: _user, supabase, params }) => {
  const batchId = params?.batchId as string;
  if (!batchId) {
    return apiError('VALIDATION', 'Missing batch id', 422);
  }

  const { data: voidedCount, error } = await supabase.rpc('void_batch', {
    p_batch_id: batchId,
  });

  if (error) {
    return apiError('INTERNAL', error.message || 'Failed to void batch', 500);
  }

  return NextResponse.json({ voided: voidedCount || 0 });
});
