import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/onboarding/complete/route';

const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
const mockSelect = vi.fn().mockReturnValue({
  eq: vi.fn().mockReturnValue({
    is: vi.fn().mockResolvedValue({ data: [], error: null })
  })
});
const mockInsert = vi.fn().mockReturnValue({
  select: vi.fn().mockResolvedValue({ data: [{ id: '1' }, { id: '2' }], error: null })
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: 'test-user-id' } },
        error: null,
      })),
    },
    from: vi.fn((table: string) => {
      if (table === 'profiles') return { update: mockUpdate };
      if (table === 'items') return { select: mockSelect, insert: mockInsert };
      return {};
    }),
  })),
}));

describe('Onboarding Complete API', () => {
  it('updates profile, inserts items idempotently and returns itemCount', async () => {
    const req = new NextRequest('http://localhost:3000/api/onboarding/complete', {
      method: 'POST',
      body: JSON.stringify({
        businessType: 'retail',
        shopName: 'Test Provisions',
        categories: ['everyday', 'food'],
        items: [
          { name: 'Indomie Chicken', unit: 'pack', sellPrice: 500 },
          { name: 'Pure Water', unit: 'sachet', sellPrice: 50 },
        ],
      }),
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.itemCount).toBe(2);
  });
});
