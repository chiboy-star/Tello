/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import {
  Serwist,
  StaleWhileRevalidate,
  NetworkOnly,
  CacheableResponsePlugin,
  setCacheNameDetails,
  cacheNames,
} from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Bump cache version to v4
const CACHE_VERSION = 'v4';
setCacheNameDetails({
  prefix: 'tallo',
  suffix: CACHE_VERSION,
});

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    // 1. ALL Next.js RSC requests (_rsc parameter) must be NetworkOnly - NEVER cache
    {
      matcher: ({ url }: { url: URL }) => url.searchParams.has('_rsc'),
      handler: new NetworkOnly(),
    },
    // 2. Auth, onboarding, and app document navigations must be NetworkOnly - NEVER cache
    {
      matcher: ({ url, request }: { url: URL; request: Request }) =>
        request.mode === 'navigate' &&
        (url.pathname === '/login' ||
          url.pathname === '/signup' ||
          url.pathname === '/onboarding' ||
          url.pathname === '/home' ||
          url.pathname === '/sell' ||
          url.pathname === '/stock' ||
          url.pathname === '/debts' ||
          url.pathname === '/reports' ||
          url.pathname === '/settings'),
      handler: new NetworkOnly(),
    },
    // 3. ALL /api/* requests must be NetworkOnly - NEVER cache API responses in Service Worker
    {
      matcher: ({ url }: { url: URL }) => url.pathname.startsWith('/api/'),
      handler: new NetworkOnly(),
    },
    // Filter defaultCache so it never caches _rsc or auth/home navigations
    ...defaultCache.map((entry) => ({
      ...entry,
      matcher: (options: any) => {
        const { url, request } = options;
        if (url && url.searchParams && url.searchParams.has('_rsc')) return false;
        if (
          request &&
          request.mode === 'navigate' &&
          (url.pathname === '/login' ||
            url.pathname === '/signup' ||
            url.pathname === '/onboarding' ||
            url.pathname === '/home')
        ) {
          return false;
        }
        return typeof entry.matcher === 'function' ? entry.matcher(options) : true;
      },
    })),
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

// Cleanup outdated caches on activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          const expectedValues = Object.values(cacheNames);
          if (!expectedValues.includes(key) && !key.includes(CACHE_VERSION)) {
            console.log('[SW] Cleaned outdated cache:', key);
            return caches.delete(key);
          }
          return Promise.resolve(true);
        })
      )
    )
  );
});

serwist.addEventListeners();
