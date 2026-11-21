'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DISMISSED_KEY = 'tallo_pwa_prompt_dismissed_at';
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check dismissal timeout (14 days)
    const dismissedAt = localStorage.getItem(DISMISSED_KEY);
    if (dismissedAt && Date.now() - parseInt(dismissedAt, 10) < FOURTEEN_DAYS_MS) {
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show prompt after user has activity
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 right-4 left-4 sm:left-auto sm:w-80 z-40 rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-subtle flex items-center justify-between gap-3 animate-in slide-in-from-bottom">
      <div className="flex items-center gap-2">
        <Download className="h-5 w-5 text-[var(--brand)]" />
        <div className="text-xs">
          <p className="font-semibold text-[var(--text)]">Install Tallo App</p>
          <p className="text-[var(--text-muted)]">Fast offline access from your home screen</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <Button size="sm" onClick={handleInstall} className="h-7 text-xs px-2.5">
          Install
        </Button>
        <button onClick={handleDismiss} className="text-[var(--text-muted)] hover:text-[var(--text)] p-1 hit-slop" aria-label="Dismiss install prompt">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
