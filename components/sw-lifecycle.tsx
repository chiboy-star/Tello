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
      // Production mode: register service worker deferred to idle to avoid hydration main-thread contention
      if ('serviceWorker' in navigator) {
        const register = () => {
          navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
            console.warn('[SW] Service worker registration error:', err);
          });
        };

        if (document.readyState === 'complete') {
          if ('requestIdleCallback' in window) {
            (window as any).requestIdleCallback(register);
          } else {
            setTimeout(register, 500);
          }
        } else {
          window.addEventListener('load', () => {
            if ('requestIdleCallback' in window) {
              (window as any).requestIdleCallback(register);
            } else {
              setTimeout(register, 500);
            }
          }, { once: true });
        }
      }
    }
  }, []);

  return null;
}
