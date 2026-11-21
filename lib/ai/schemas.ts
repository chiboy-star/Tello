import { z } from 'zod';

export const ParsedEntrySchema = z.object({
  type: z.enum(['sale', 'restock', 'debt_payment']),
  itemText: z.string().nullable().optional(),
  quantity: z.number().nullable().optional(),
  unitAmount: z.number().nullable().optional(),
  totalAmount: z.number().nullable().optional(),
  paymentType: z.enum(['cash', 'transfer', 'credit']).default('cash'),
  customerName: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1).default(1.0),
});

export const ParseResponseSchema = z.object({
  inputKind: z.enum(['text', 'voice', 'image']),
  transcript: z.string().nullable().optional(),
  entries: z.array(
    ParsedEntrySchema.extend({
      matchedItemId: z.string().nullable().optional(),
      matchScore: z.number().nullable().optional(),
      suggestions: z.array(z.object({ itemId: z.string(), name: z.string() })).default([]),
    })
  ),
  warnings: z.array(z.string()).default([]),
  ai: z.object({
    usedToday: z.number(),
    limit: z.number(),
  }),
});

export type ParsedEntry = z.infer<typeof ParsedEntrySchema>;
export type ParseResponse = z.infer<typeof ParseResponseSchema>;
