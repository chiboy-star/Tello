'use client';

import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { restoreQueryCache, persistQueryCache } from '@/lib/query/cache-persister';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30s fresh
            gcTime: 10 * 60 * 1000, // 10 minutes cache
            refetchOnWindowFocus: true,
            retry: 1,
          },
        },
      })
  );

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    restoreQueryCache(queryClient).then(() => {
      // Subscribe to cache updates with debounce
      let timeoutId: NodeJS.Timeout | null = null;
      unsubscribe = queryClient.getQueryCache().subscribe(() => {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          persistQueryCache(queryClient);
        }, 1000);
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [queryClient]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
