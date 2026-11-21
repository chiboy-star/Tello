import { ReportFacts } from '@/lib/domain/insights';
import { ParsedEntry } from './schemas';

export interface ParseInput {
  kind: 'text' | 'voice' | 'image';
  text?: string;
  mediaBuffer?: Buffer;
  mimeType?: string;
  catalogContext?: Array<{ id: string; name: string; aliases: string[] }>;
  currency?: string;
}

export interface ParsedBatch {
  transcript: string | null;
  entries: ParsedEntry[];
  warnings: string[];
}

export interface AiProvider {
  parseEntries(input: ParseInput): Promise<ParsedBatch>;
  writeNarrative(facts: ReportFacts): Promise<string>;
}
