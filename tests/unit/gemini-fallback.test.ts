import { describe, it, expect, vi } from 'vitest';
import { GeminiProvider } from '@/lib/ai/gemini';

describe('Gemini Model Fallback Specification Test', () => {
  it('exercises real retry code: primary 503 retries with fallback model and succeeds', async () => {
    const generateContentCalls: Array<{ model: string; config?: any }> = [];

    const stubClient = {
      models: {
        generateContent: vi.fn(async (params: { model: string; contents: any[]; config?: any }) => {
          generateContentCalls.push({ model: params.model, config: params.config });

          if (params.model === 'gemini-3.5-flash-lite') {
            const err: any = new Error('The model is overloaded. Please try again later.');
            err.code = 503;
            err.status = 503;
            throw err;
          }

          if (params.model === 'gemini-3.6-flash') {
            return {
              text: JSON.stringify({
                transcript: null,
                entries: [
                  {
                    type: 'sale',
                    itemText: '3 Indomie',
                    quantity: 3,
                    unitAmount: 500,
                    totalAmount: 1500,
                    paymentType: 'cash',
                    customerName: null,
                    note: null,
                    confidence: 0.95,
                  },
                ],
                warnings: [],
              }),
            };
          }

          throw new Error(`Unexpected model: ${params.model}`);
        }),
      },
    };

    const provider = new GeminiProvider(stubClient);
    const result = await provider.parseEntries({
      kind: 'text',
      text: '3 Indomie 1500 cash',
    });

    expect(generateContentCalls.length).toBe(2);
    expect(generateContentCalls[0].model).toBe('gemini-3.5-flash-lite');
    expect(generateContentCalls[1].model).toBe('gemini-3.6-flash');
    expect(result.entries.length).toBe(1);
    expect(result.entries[0].itemText).toBe('3 Indomie');
    expect(result.entries[0].quantity).toBe(3);
  });

  it('fails with AI_BUSY when both primary and fallback encounter 503/429', async () => {
    const generateContentCalls: string[] = [];

    const stubClient = {
      models: {
        generateContent: vi.fn(async (params: { model: string; contents: any[]; config?: any }) => {
          generateContentCalls.push(params.model);
          const err: any = new Error('503 Service Unavailable');
          err.code = 503;
          err.status = 503;
          throw err;
        }),
      },
    };

    const provider = new GeminiProvider(stubClient);

    await expect(
      provider.parseEntries({
        kind: 'text',
        text: '3 Indomie 1500 cash',
      })
    ).rejects.toMatchObject({ code: 'AI_BUSY' });

    expect(generateContentCalls.length).toBe(2);
    expect(generateContentCalls[0]).toBe('gemini-3.5-flash-lite');
    expect(generateContentCalls[1]).toBe('gemini-3.6-flash');
  });
});
