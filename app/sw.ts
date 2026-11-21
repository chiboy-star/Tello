/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist, StaleWhileRevalidate, NetworkOnly } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Stale-While-Revalidate for GET read routes per spec
    {
      matcher: ({ url }: { url: URL }) =>
        url.pathname === '/api/items' ||
        url.pathname === '/api/stock/forecast' ||
        url.pathname === '/api/customers' ||
        url.pathname === '/api/reports',
      handler: new StaleWhileRevalidate({
        cacheName: 'tallo-api-cache',
      }),
    },
    // Network-only for auth, parsing, and mutating routes
    {
      matcher: ({ url, request }: { url: URL; request: Request }) =>
        request.method !== 'GET' ||
        url.pathname.startsWith('/api/entries/parse') ||
        url.pathname.startsWith('/api/entries/commit') ||
        url.pathname.startsWith('/api/batches') ||
        url.pathname.startsWith('/api/account') ||
        url.pathname.startsWith('/api/auth'),
      handler: new NetworkOnly(),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: '/offline',
        matcher({ request }: { request: Request }) {
          return request.destination === 'document';
        },
      },
    ],
  },
});

serwist.addEventListeners();
