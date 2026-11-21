import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

let mockAllowed = true;
let mockUsed = 1;

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } }, error: null })) },
    rpc: vi.fn(async () => ({ data: [{ allowed: mockAllowed, used: mockUsed }], error: null })),
    from: vi.fn(() => ({ select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn().mockResolvedValue({ data: [] }) })),
  })),
}));

// Import after mock
import { POST } from '@/app/api/entries/parse/route';

describe('Parse Limits & Media Validation (413, 415, AI_LIMIT)', () => {
  it('returns 415 UNSUPPORTED_MEDIA for unsupported file types', async () => {
    mockAllowed = true;
    const req = {
      formData: async () => ({
        get: (field: string) => {
          if (field === 'audio') {
            return {
              type: 'video/mp4',
              size: 500,
              arrayBuffer: async () => new ArrayBuffer(500),
            };
          }
          return null;
        },
      }),
      headers: new Headers(),
    } as unknown as NextRequest;

    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(415);
    const body = await res.json();
    expect(body.error.code).toBe('UNSUPPORTED_MEDIA');
  });

  it('returns 413 FILE_TOO_LARGE when audio file exceeds 3 MB', async () => {
    mockAllowed = true;
    const req = {
      formData: async () => ({
        get: (field: string) => {
          if (field === 'audio') {
            return {
              type: 'audio/wav',
              size: 3.5 * 1024 * 1024,
              arrayBuffer: async () => new ArrayBuffer(10),
            };
          }
          return null;
        },
      }),
      headers: new Headers(),
    } as unknown as NextRequest;

    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error.code).toBe('FILE_TOO_LARGE');
  });

  it('returns 429 AI_LIMIT when daily usage limit is exceeded', async () => {
    mockAllowed = false;
    mockUsed = 10;

    const req = {
      formData: async () => ({
        get: (field: string) => (field === 'text' ? '2 Indomie 1000 cash' : null),
      }),
      headers: new Headers(),
    } as unknown as NextRequest;

    const res = await POST(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error.code).toBe('AI_LIMIT');
  });
});
