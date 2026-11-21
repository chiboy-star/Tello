import { describe, it, expect } from 'vitest';
import { ParseResponseSchema } from '@/lib/ai/schemas';

describe('AI Schema Validation & Parsing Contract Tests', () => {
  it('validates a correct structured parse response successfully', () => {
    const rawData = {
      inputKind: 'text',
      transcript: '2 Indomie 1000 cash',
      entries: [
        {
          type: 'sale',
          itemText: 'Indomie',
          quantity: 2,
          unitAmount: 500,
          totalAmount: 1000,
          paymentType: 'cash',
          customerName: null,
          note: null,
          confidence: 0.95,
          matchedItemId: 'item-uuid-1',
          matchScore: 0.98,
          suggestions: [],
        },
      ],
      warnings: [],
      ai: {
        usedToday: 3,
        limit: 10,
      },
    };

    const parsed = ParseResponseSchema.safeParse(rawData);
    expect(parsed.success).toBe(true);
  });

  it('rejects invalid or corrupted parse response', () => {
    const invalidData = {
      inputKind: 'unknown_kind', // Invalid enum
      entries: [
        {
          type: 'invalid_type', // Invalid type enum
          confidence: 50, // Out of bounds 0..1
        },
      ],
      ai: {
        usedToday: 'five', // Must be number
      },
    };

    const parsed = ParseResponseSchema.safeParse(invalidData);
    expect(parsed.success).toBe(false);
  });
});
