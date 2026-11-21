import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { apiError } from '@/lib/api/errors';
import { createAdminClient } from '@/lib/supabase/admin';

export const DELETE = withAuth(async (_req: NextRequest, { user, supabase }) => {
  // 1. Delete user row in profiles table (cascades to items, customers, entries, reports)
  const { error: profileError } = await supabase.from('profiles').delete().eq('id', user.id);

  if (profileError) {
    return apiError('INTERNAL', 'Failed to delete user profile data', 500);
  }

  // 2. Delete the user from auth.users using SUPABASE_SERVICE_ROLE_KEY admin client
  try {
    const admin = createAdminClient();
    const { error: authError } = await admin.auth.admin.deleteUser(user.id);
    if (authError) {
      console.warn('Admin deleteUser notice:', authError.message);
    }
  } catch (err) {
    console.warn('Admin client delete skipped or not configured in test environment:', err);
  }

  // 3. Sign out session
  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
});
