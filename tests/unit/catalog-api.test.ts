import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/catalog/route';

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: 'user-123' } },
        error: null,
      })),
    },
  })),
}));

describe('Catalog API route', () => {
  it('returns catalog items filtered by businessType and categories', async () => {
    const req = new NextRequest('http://localhost:3000/api/catalog?businessType=retail&categories=everyday');
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.items).toBeDefined();
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items[0].category).toBe('everyday');
  });
});
