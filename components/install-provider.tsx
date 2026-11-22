'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Share, SquarePlus, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';

export type Platform = 'chromium' | 'ios' | 'other';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface InstallContextType {
  canInstall: boolean;
  platform: Platform;
  isStandalone: boolean;
  install: () => Promise<void>;
  dismiss: () => void;
  showIosDrawer: boolean;
  setShowIosDrawer: (show: boolean) => void;
}

const InstallContext = createContext<InstallContextType | null>(null);

const SNOOZE_KEY = 'tallo.install.snooze';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function InstallProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [platform, setPlatform] = useState<Platform>('other');
  const [showIosDrawer, setShowIosDrawer] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Standalone detection
    const standaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
    // @ts-expect-error iOS Safari standalone detection
    const iosStandalone = navigator.standalone === true;
    const isAppStandalone = standaloneMedia || iosStandalone;
    setIsStandalone(isAppStandalone);

    // Platform detection
    const ua = navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua) && !('MSStream' in window);
    if (isIos) {
      setPlatform('ios');
      if (!isAppStandalone) {
        setCanInstall(true);
      }
    } else {
      setPlatform('chromium');
    }

    if (isAppStandalone) {
      setCanInstall(false);
      return;
    }

    // Capture beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setPlatform('chromium');
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (platform === 'ios') {
      setShowIosDrawer(true);
      return;
    }

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setCanInstall(false);
        }
      } catch (err) {
        console.error('Install prompt failed:', err);
      } finally {
        setDeferredPrompt(null);
      }
    }
  }, [platform, deferredPrompt]);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(SNOOZE_KEY, Date.now().toString());
    } catch {}
    setCanInstall(false);
  }, []);

  const contextValue = useMemo(
    () => ({
      canInstall: canInstall && !installed && !isStandalone,
      platform,
      isStandalone,
      install,
      dismiss,
      showIosDrawer,
      setShowIosDrawer,
    }),
    [canInstall, installed, isStandalone, platform, install, dismiss, showIosDrawer]
  );

  return (
    <InstallContext.Provider value={contextValue}>
      {children}
      <InstallBanner />
      <IosInstallDrawer />
    </InstallContext.Provider>
  );
}

export function useInstall() {
  const context = useContext(InstallContext);
  if (!context) {
    throw new Error('useInstall must be used within an InstallProvider');
  }
  return context;
}

export function InstallBanner() {
  const { canInstall, install, dismiss } = useInstall();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!canInstall) {
      setVisible(false);
      return;
    }

    // Never show over auth/onboarding forms
    const isExcludedRoute =
      pathname.startsWith('/login') ||
      pathname.startsWith('/signup') ||
      pathname.startsWith('/onboarding');

    // Only appear on landing page and /home
    const isAllowedRoute = pathname === '/' || pathname === '/home';

    if (isExcludedRoute || !isAllowedRoute) {
      setVisible(false);
      return;
    }

    // Check 7-day snooze
    try {
      const snoozedAt = localStorage.getItem(SNOOZE_KEY);
      if (snoozedAt && Date.now() - parseInt(snoozedAt, 10) < SEVEN_DAYS_MS) {
        setVisible(false);
        return;
      }
    } catch {}

    // Wait a short quiet period and check that splash has finished
    const timer = setTimeout(() => {
      // Check dialog open
      const hasOpenDialog = typeof document !== 'undefined' && document.querySelector('[role="dialog"]') !== null;
      const splashElem = typeof document !== 'undefined' && document.getElementById('brand-splash');
      const isSplashVisible = splashElem && !splashElem.hasAttribute('aria-hidden') && splashElem.style.display !== 'none';

      if (!hasOpenDialog && !isSplashVisible) {
        setVisible(true);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [canInstall, pathname]);

  if (!visible) return null;

  return (
    <aside
      role="banner"
      aria-label="Install Tallo application"
      className="fixed z-50 left-4 right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] sm:bottom-6 sm:right-6 sm:left-auto sm:w-[360px] rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-subtle transition-all duration-200 animate-in slide-in-from-bottom-2"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--r-md)] bg-[var(--brand-soft)] text-[var(--brand)]">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-1">
          <h2 className="text-sm font-bold font-display text-[var(--text)]">Install Tallo</h2>
          <p className="text-xs text-[var(--text-muted)] text-pretty leading-relaxed">
            Opens instantly and works offline.
          </p>
          <div className="mt-3 flex items-center gap-2 pt-1">
            <Button
              size="sm"
              onClick={install}
              className="h-8 rounded-[var(--r-sm)] bg-[var(--brand)] px-3 text-xs font-semibold text-[var(--on-brand)] hover:bg-[var(--brand-hover)]"
            >
              Install
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                dismiss();
                setVisible(false);
              }}
              className="h-8 rounded-[var(--r-sm)] px-3 text-xs text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]"
            >
              Not now
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function IosInstallDrawer() {
  const { showIosDrawer, setShowIosDrawer } = useInstall();

  return (
    <Drawer open={showIosDrawer} onOpenChange={setShowIosDrawer}>
      <DrawerContent className="px-4 pb-8 pt-4">
        <DrawerHeader className="text-left space-y-1">
          <DrawerTitle className="font-display text-lg font-bold text-[var(--text)]">
            Install Tallo on iPhone & iPad
          </DrawerTitle>
          <DrawerDescription className="text-xs text-[var(--text-muted)]">
            Follow these quick steps in Safari to add Tallo to your Home Screen:
          </DrawerDescription>
        </DrawerHeader>

        <div className="mt-4 space-y-4 px-4">
          <div className="flex items-start gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-xs font-bold text-[var(--text)]">
              1
            </div>
            <div className="text-xs text-[var(--text)] pt-1">
              Tap the <span className="font-semibold">Share</span> icon{' '}
              <Share className="inline h-4 w-4 align-text-bottom text-[var(--brand)]" /> at the bottom of Safari.
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-xs font-bold text-[var(--text)]">
              2
            </div>
            <div className="text-xs text-[var(--text)] pt-1">
              Scroll down and tap <span className="font-semibold">Add to Home Screen</span>{' '}
              <SquarePlus className="inline h-4 w-4 align-text-bottom text-[var(--brand)]" />.
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-xs font-bold text-[var(--text)]">
              3
            </div>
            <div className="text-xs text-[var(--text)] pt-1">
              Tap <span className="font-semibold">Add</span> in the top-right corner to finish.
            </div>
          </div>
        </div>

        <DrawerFooter className="mt-6">
          <Button
            onClick={() => setShowIosDrawer(false)}
            className="w-full bg-[var(--brand)] text-[var(--on-brand)]"
          >
            Got it
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
