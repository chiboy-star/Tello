import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { apiError } from '@/lib/api/errors';
import { getAiProvider } from '@/lib/ai';
import { matchItemName, MatchableItem } from '@/lib/domain/matching';

export const maxDuration = 60; // Max duration permitted on hobby tier

export const POST = withAuth(async (req: NextRequest, { user, supabase }) => {
  // 1. Check AI Daily Rate Limit
  const dailyLimit = parseInt(process.env.AI_DAILY_LIMIT_PER_USER || '30', 10);
  const { data: usageResult, error: usageError } = await supabase.rpc('increment_ai_usage', {
    p_limit: dailyLimit,
  });

  if (usageError) {
    console.error('Rate limit increment failed:', usageError);
  }

  const usage = usageResult?.[0];
  if (usage && !usage.allowed) {
    return apiError('AI_LIMIT', 'Daily AI parsing limit reached. Please use quick-tap or manual entry.', 429);
  }

  // 2. Parse Form Data
  const formData = await req.formData();
  const textField = formData.get('text') as string | null;
  const audioFile = formData.get('audio') as File | null;
  const imageFile = formData.get('image') as File | null;

  let inputKind: 'text' | 'voice' | 'image' = 'text';
  let mediaBuffer: Buffer | undefined;
  let mimeType: string | undefined;

  if (audioFile) {
    inputKind = 'voice';
    mimeType = audioFile.type || 'audio/wav';
    const allowedAudioTypes = ['audio/wav', 'audio/x-wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/aac', 'audio/webm'];
    if (!allowedAudioTypes.some((t) => mimeType?.toLowerCase().includes(t.replace('audio/', '')))) {
      return apiError('UNSUPPORTED_MEDIA', `Unsupported audio format: ${mimeType}`, 415);
    }
    if (audioFile.size > 3 * 1024 * 1024) {
      return apiError('FILE_TOO_LARGE', 'Audio recording exceeds 3 MB limit', 413);
    }
    const arrayBuffer = await audioFile.arrayBuffer();
    mediaBuffer = Buffer.from(arrayBuffer);
  } else if (imageFile) {
    inputKind = 'image';
    mimeType = imageFile.type || 'image/jpeg';
    if (imageFile.size > 3.5 * 1024 * 1024) {
      return apiError('FILE_TOO_LARGE', 'Image exceeds 3.5 MB limit', 413);
    }
    const arrayBuffer = await imageFile.arrayBuffer();
    mediaBuffer = Buffer.from(arrayBuffer);
  } else if (!textField || !textField.trim()) {
    return apiError('VALIDATION', 'No input text, voice, or image provided', 422);
  }

  // 3. Fetch user items for fuzzy matching and AI context
  const { data: items } = await supabase
    .from('items')
    .select('id, name, unit, aliases, sell_price_minor')
    .eq('user_id', user.id)
    .is('archived_at', null);

  const matchableItems: MatchableItem[] = (items || []).map((i) => ({
    id: i.id,
    name: i.name,
    aliases: i.aliases || [],
    unit: i.unit,
    sell_price_minor: i.sell_price_minor,
  }));

  // 4. Invoke AI Provider
  const aiProvider = getAiProvider();
  let parsedBatch;
  try {
    parsedBatch = await aiProvider.parseEntries({
      kind: inputKind,
      text: textField || undefined,
      mediaBuffer,
      mimeType,
      catalogContext: matchableItems.map((i) => ({ id: i.id, name: i.name, aliases: i.aliases || [] })),
      currency: 'NGN',
    });
  } catch (err: unknown) {
    console.error('AI parse failed:', err);
    return apiError('AI_BUSY', 'AI parser is temporarily busy or unavailable. Please try manual entry.', 503);
  }

  // 5. SERVER-SIDE Item Matching via matching.ts (Spec: matchedItemId is NEVER set by LLM)
  const entriesWithMatching = parsedBatch.entries.map((entry) => {
    const itemQuery = entry.itemText || '';
    const match = matchItemName(itemQuery, matchableItems);

    return {
      ...entry,
      matchedItemId: match.matchedItemId,
      matchScore: match.score,
      suggestions: match.suggestions,
    };
  });

  return NextResponse.json({
    inputKind,
    transcript: parsedBatch.transcript,
    entries: entriesWithMatching,
    warnings: parsedBatch.warnings,
    ai: {
      usedToday: usage ? usage.used : 1,
      limit: dailyLimit,
    },
  });
});
