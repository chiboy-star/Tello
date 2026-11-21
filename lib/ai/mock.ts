import { AiProvider, ParseInput, ParsedBatch } from './provider';
import { ReportFacts } from '@/lib/domain/insights';
import { generateTemplateNarrative } from '@/lib/domain/narrative-guard';

export class MockProvider implements AiProvider {
  public simulateError: 'none' | '503_fallback_success' | 'persistent_503' = 'none';
  public callCount = 0;
  public modelsCalled: string[] = [];

  async parseEntries(input: ParseInput): Promise<ParsedBatch> {
    this.callCount++;

    if (this.simulateError === '503_fallback_success') {
      if (this.callCount === 1) {
        this.modelsCalled.push('primary');
        const err: any = new Error('503 Service Unavailable');
        err.code = 503;
        throw err;
      }
      this.modelsCalled.push('fallback');
    } else if (this.simulateError === 'persistent_503') {
      const err: any = new Error('503 Persistent Overload');
      err.code = 503;
      throw err;
    }

    const rawText = input.text || '';

    if (rawText.toLowerCase().includes('mama ngozi') && rawText.toLowerCase().includes('credit')) {
      return {
        transcript: rawText || '2 rice 5k credit Mama Ngozi',
        entries: [
          {
            type: 'sale',
            itemText: 'rice',
            quantity: 2,
            unitAmount: 2500,
            totalAmount: 5000,
            paymentType: 'credit',
            customerName: 'Mama Ngozi',
            note: 'Mock credit sale',
            confidence: 0.95,
          },
        ],
        warnings: [],
      };
    }

    if (input.kind === 'voice') {
      return {
        transcript: 'Sold 2 packs of indomie for 1000 cash',
        entries: [
          {
            type: 'sale',
            itemText: 'Indomie Chicken',
            quantity: 2,
            unitAmount: 500,
            totalAmount: 1000,
            paymentType: 'cash',
            customerName: null,
            note: null,
            confidence: 0.98,
          },
        ],
        warnings: [],
      };
    }

    if (input.kind === 'image') {
      return {
        transcript: '1 Pure water 50, 2 Indomie 1000',
        entries: [
          {
            type: 'sale',
            itemText: 'Pure Water',
            quantity: 1,
            unitAmount: 50,
            totalAmount: 50,
            paymentType: 'cash',
            customerName: null,
            note: null,
            confidence: 0.9,
          },
          {
            type: 'sale',
            itemText: 'Indomie Chicken',
            quantity: 2,
            unitAmount: 500,
            totalAmount: 1000,
            paymentType: 'cash',
            customerName: null,
            note: null,
            confidence: 0.9,
          },
        ],
        warnings: [],
      };
    }

    return {
      transcript: rawText || '3 Indomie 1500 cash',
      entries: [
        {
          type: 'sale',
          itemText: 'Indomie Chicken',
          quantity: 3,
          unitAmount: 500,
          totalAmount: 1500,
          paymentType: 'cash',
          customerName: null,
          note: null,
          confidence: 0.9,
        },
      ],
      warnings: [],
    };
  }

  async writeNarrative(facts: ReportFacts): Promise<string> {
    return generateTemplateNarrative(facts, 'NGN');
  }
}
