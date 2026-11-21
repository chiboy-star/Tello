import { get, set, del } from 'idb-keyval';
import { QueryClient } from '@tanstack/react-query';

const CACHE_KEY = 'tallo_query_cache_v1';

export async function persistQueryCache(client: QueryClient) {
  if (typeof window === 'undefined') return;
  try {
    const entries = client
      .getQueryCache()
      .getAll()
      .filter((q) => q.state.status === 'success' && q.state.data !== undefined)
      .map((q) => ({
        queryKey: q.queryKey,
        data: q.state.data,
        dataUpdatedAt: q.state.dataUpdatedAt,
      }));
    await set(CACHE_KEY, entries);
  } catch (err) {
    console.warn('Could not persist query cache:', err);
  }
}

export async function restoreQueryCache(client: QueryClient) {
  if (typeof window === 'undefined') return;
  try {
    const saved = await get<Array<{ queryKey: unknown[]; data: unknown; dataUpdatedAt: number }>>(CACHE_KEY);
    if (saved && Array.isArray(saved)) {
      for (const item of saved) {
        if (item && item.queryKey && item.data !== undefined) {
          client.setQueryData(item.queryKey, item.data, {
            updatedAt: 0, // Stale on restore so cold start paints cached data instantly and refreshes in background
          });
        }
      }
    }
  } catch (err) {
    console.warn('Could not restore query cache:', err);
  }
}

export async function clearPersistedQueryCache() {
  if (typeof window === 'undefined') return;
  try {
    await del(CACHE_KEY);
  } catch {}
}
