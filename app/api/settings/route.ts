import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { apiError } from '@/lib/api/errors';
import { z } from 'zod';

const UpdateSettingsSchema = z.object({
  fullName: z.string().min(1, 'Name is required').optional(),
  shopName: z.string().optional().nullable(),
  currency: z.string().min(3).max(3).optional(),
  timezone: z.string().min(1).optional(),
});

export const GET = withAuth(async (_req: NextRequest, { user, supabase }) => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, shop_name, business_type, currency, timezone, onboarded_at')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    return apiError('NOT_FOUND', 'Profile not found', 404);
  }

  return NextResponse.json({ profile });
});

export const PATCH = withAuth(async (req: NextRequest, { user, supabase }) => {
  const body = await req.json();
  const parsed = UpdateSettingsSchema.safeParse(body);

  if (!parsed.success) {
    return apiError('VALIDATION', 'Invalid settings parameters', 422, parsed.error.flatten().fieldErrors);
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.fullName !== undefined) updates.full_name = parsed.data.fullName;
  if (parsed.data.shopName !== undefined) updates.shop_name = parsed.data.shopName;
  if (parsed.data.currency !== undefined) updates.currency = parsed.data.currency;
  if (parsed.data.timezone !== undefined) updates.timezone = parsed.data.timezone;

  const { data: profile, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error || !profile) {
    return apiError('INTERNAL', 'Failed to update settings', 500);
  }

  return NextResponse.json({ profile });
});
