import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Server-only admin client.
// USED ONLY BY BOT WEBHOOKS AND SERVER-SIDE SYSTEM ACTIONS.
// NEVER IMPORT THIS FILE INTO CLIENT CODE.

if (typeof window !== 'undefined') {
  throw new Error('FATAL: admin.ts imported in browser bundle!');
}

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing Supabase Service Role configuration in environment');
  }

  return createSupabaseClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
