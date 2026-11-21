import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/entries/parse/route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: 'test-user-id' } },
        error: null,
      })),
    },
    rpc: vi.fn(async (fn: string) => {
      if (fn === 'increment_ai_usage') {
        return { data: [{ allowed: true, used: 5 }], error: null };
      }
      return { data: null, error: null };
    }),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockResolvedValue({
        data: [
          { id: 'item-1', name: 'Indomie Chicken', aliases: ['indomie', 'noodles'], unit: 'pack', sell_price_minor: 50000 },
          { id: 'item-2', name: 'Rice', aliases: ['foreign rice'], unit: 'derica', sell_price_minor: 250000 },
        ],
        error: null,
      }),
    })),
  })),
}));

describe('AI Parse API endpoint', () => {
  it('parses text input and assigns matchedItemId server-side via matching.ts', async () => {
    const formData = new FormData();
    formData.append('text', '2 rice 5k credit Mama Ngozi');

    const req = new NextRequest('http://localhost:3000/api/entries/parse', {
      method: 'POST',
      body: formData,
    });

    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.inputKind).toBe('text');
    expect(body.entries.length).toBeGreaterThan(0);
    expect(body.entries[0].itemText).toBe('rice');
    expect(body.entries[0].matchedItemId).toBe('item-2'); // Matched server-side to Rice
    expect(body.entries[0].customerName).toBe('Mama Ngozi');
    expect(body.ai.usedToday).toBe(5);
  });
});
