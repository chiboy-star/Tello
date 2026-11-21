'use client';

import { useEffect } from 'react';

export function SwLifecycle() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (process.env.NODE_ENV !== 'production') {
      // Development mode: unregister all active service workers and clear caches
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const reg of registrations) {
            reg.unregister();
          }
        });
      }
      if ('caches' in window) {
        caches.keys().then((keys) => {
          for (const key of keys) {
            caches.delete(key);
          }
        });
      }
    } else {
      // Production mode: register service worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
          console.warn('[SW] Service worker registration error:', err);
        });
      }
    }
  }, []);

  return null;
}
