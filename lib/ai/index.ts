import { AiProvider } from './provider';
import { GeminiProvider } from './gemini';
import { MockProvider } from './mock';

let cachedProvider: AiProvider | null = null;

export function getAiProvider(): AiProvider {
  if (cachedProvider) return cachedProvider;

  const providerType = process.env.AI_PROVIDER || 'mock';

  if (providerType === 'gemini') {
    cachedProvider = new GeminiProvider();
  } else {
    cachedProvider = new MockProvider();
  }

  return cachedProvider;
}
