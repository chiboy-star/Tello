import { GoogleGenAI } from '@google/genai';
import { AiProvider, ParseInput, ParsedBatch } from './provider';
import { ReportFacts } from '@/lib/domain/insights';
import { buildEntryParsingSystemPrompt } from './prompts';
import { ParsedEntry } from './schemas';

export class GeminiProvider implements AiProvider {
  private client: any = null;
  private primaryModel: string;
  private fallbackModel: string;

  constructor(client?: any) {
    this.primaryModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
    this.fallbackModel = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.6-flash';
    if (client) {
      this.client = client;
    } else if (process.env.GEMINI_API_KEY) {
      this.client = new GoogleGenAI();
    }
  }

  private getClient(): any {
    if (!this.client) {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not configured in the environment.');
      }
      this.client = new GoogleGenAI();
    }
    return this.client;
  }

  private async generateWithFallback(options: {
    contents: any[];
    systemInstruction?: string;
    responseMimeType?: string;
  }): Promise<string> {
    const ai = this.getClient();

    try {
      const response = await ai.models.generateContent({
        model: this.primaryModel,
        contents: options.contents,
        config: {
          systemInstruction: options.systemInstruction,
          responseMimeType: options.responseMimeType,
        },
      });
      return response.text || '';
    } catch (primaryErr: any) {
      const errCode = primaryErr?.code || primaryErr?.status;
      const errMsg = (primaryErr?.message || '').toLowerCase();
      const isRetryable =
        errCode === 503 ||
        errCode === 429 ||
        errMsg.includes('503') ||
        errMsg.includes('429') ||
        errMsg.includes('high demand') ||
        errMsg.includes('quota') ||
        errMsg.includes('unavailable');

      if (isRetryable && this.fallbackModel && this.fallbackModel !== this.primaryModel) {
        console.warn(`Primary Gemini model (${this.primaryModel}) hit ${primaryErr?.code || 'error'}. Retrying with fallback (${this.fallbackModel})...`);
        try {
          const fallbackRes = await ai.models.generateContent({
            model: this.fallbackModel,
            contents: options.contents,
            config: {
              systemInstruction: options.systemInstruction,
              responseMimeType: options.responseMimeType,
            },
          });
          return fallbackRes.text || '';
        } catch {
          const busyErr: any = new Error('AI_BUSY');
          busyErr.code = 'AI_BUSY';
          throw busyErr;
        }
      }

      if (isRetryable) {
        const busyErr: any = new Error('AI_BUSY');
        busyErr.code = 'AI_BUSY';
        throw busyErr;
      }

      throw primaryErr;
    }
  }

  async parseEntries(input: ParseInput): Promise<ParsedBatch> {
    const systemPrompt = buildEntryParsingSystemPrompt(input.currency, input.catalogContext);
    const contents: any[] = [{ role: 'user', parts: [] }];

    if (input.text) {
      contents[0].parts.push({ text: `Text input: ${input.text}` });
    }

    if (input.mediaBuffer && input.mimeType) {
      contents[0].parts.push({
        inlineData: {
          mimeType: input.mimeType,
          data: input.mediaBuffer.toString('base64'),
        },
      });
      contents[0].parts.push({
        text: `Please transcribe and extract all sales, purchases, or debts from this ${input.kind} into structured entries.`,
      });
    }

    const outputText = await this.generateWithFallback({
      contents,
      systemInstruction: systemPrompt,
      responseMimeType: 'application/json',
    });

    let parsed: any;
    try {
      parsed = JSON.parse(outputText);
    } catch {
      throw new Error('AI produced invalid JSON output');
    }

    const entries: ParsedEntry[] = (parsed.entries || []).map((e: any) => ({
      type: e.type || 'sale',
      itemText: e.itemText || null,
      quantity: typeof e.quantity === 'number' ? e.quantity : null,
      unitAmount: typeof e.unitAmount === 'number' ? e.unitAmount : null,
      totalAmount: typeof e.totalAmount === 'number' ? e.totalAmount : null,
      paymentType: e.paymentType || 'cash',
      customerName: e.customerName || null,
      note: e.note || null,
      confidence: typeof e.confidence === 'number' ? e.confidence : 0.9,
    }));

    return {
      transcript: parsed.transcript || null,
      entries,
      warnings: parsed.warnings || [],
    };
  }

  async writeNarrative(facts: ReportFacts): Promise<string> {
    const prompt = `Here are the business facts for this period:
${JSON.stringify(facts, null, 2)}

TASK: Write 3 to 5 plain sentences summarizing the shop performance.
RULES:
- Use simple English.
- No markdown or bullet points.
- Do NOT invent or estimate any new numbers. Every number must come from the facts above.
- Mention the top seller and stock advice.`;

    const text = await this.generateWithFallback({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    return text.trim();
  }
}
