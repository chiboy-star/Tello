import Fuse from 'fuse.js';

export interface MatchableItem {
  id: string;
  name: string;
  aliases?: string[];
  unit?: string;
  sell_price_minor?: number | null;
}

export interface MatchResult {
  matchedItemId: string | null;
  score: number;
  suggestions: Array<{ itemId: string; name: string }>;
}

export function normalizeItemText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // strip punctuation
    .replace(/\s+/g, ' ')     // collapse spaces
    .trim()
    .replace(/(?:packs|pack|sachets|sachet|bottles|bottle|pieces|piece|tins|tin|crates|crate|cartons|carton|bags|bag)$/, '') // simple unit suffix stripping
    .trim();
}

/**
 * Matches input text against user items and their aliases using Fuse.js.
 * Auto-accepts only when score >= 0.85 (Fuse similarity >= 0.85).
 */
export function matchItemName(input: string, items: MatchableItem[]): MatchResult {
  if (!input || !items || items.length === 0) {
    return { matchedItemId: null, score: 0, suggestions: [] };
  }

  const normalizedInput = normalizeItemText(input);

  // Exact match check first
  for (const item of items) {
    const itemNorm = normalizeItemText(item.name);
    if (itemNorm === normalizedInput) {
      return {
        matchedItemId: item.id,
        score: 1.0,
        suggestions: [{ itemId: item.id, name: item.name }],
      };
    }
    if (item.aliases) {
      for (const alias of item.aliases) {
        if (normalizeItemText(alias) === normalizedInput) {
          return {
            matchedItemId: item.id,
            score: 0.98,
            suggestions: [{ itemId: item.id, name: item.name }],
          };
        }
      }
    }
  }

  // Build searchable documents
  const searchDocs: Array<{ itemId: string; name: string; term: string }> = [];
  items.forEach((item) => {
    searchDocs.push({ itemId: item.id, name: item.name, term: item.name });
    if (item.aliases) {
      item.aliases.forEach((alias) => {
        searchDocs.push({ itemId: item.id, name: item.name, term: alias });
      });
    }
  });

  const fuse = new Fuse(searchDocs, {
    keys: ['term'],
    includeScore: true,
    threshold: 0.6, // Fuse threshold: 0 is perfect, 1 is mismatch
    ignoreLocation: true,
  });

  const results = fuse.search(normalizedInput);

  if (results.length === 0) {
    return { matchedItemId: null, score: 0, suggestions: [] };
  }

  // Deduplicate suggestions by itemId
  const seenIds = new Set<string>();
  const topSuggestions: Array<{ itemId: string; name: string }> = [];

  for (const res of results) {
    const it = res.item;
    if (!seenIds.has(it.itemId)) {
      seenIds.add(it.itemId);
      topSuggestions.push({ itemId: it.itemId, name: it.name });
      if (topSuggestions.length >= 3) break;
    }
  }

  // Convert Fuse distance score (0 best, 1 worst) to similarity score (1 best, 0 worst)
  const bestFuseScore = results[0].score ?? 1;
  const similarityScore = Math.max(0, 1 - bestFuseScore);

  // Auto-accept only when similarity >= 0.85
  const matchedItemId = similarityScore >= 0.85 ? results[0].item.itemId : null;

  return {
    matchedItemId,
    score: Number(similarityScore.toFixed(2)),
    suggestions: topSuggestions,
  };
}
