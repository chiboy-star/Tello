'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  House,
  Package,
  Plus,
  HandCoins,
  ChartNoAxesColumn,
  Settings,
  WifiOff,
  RefreshCw,
  Search,
  Download,
} from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { CommandMenu } from '@/components/command-menu';
import { AddItemDrawer } from '@/components/add-item-drawer';
import { SlidingPill } from '@/components/ui/sliding-pill';
import { getOfflineQueue, flushOfflineQueue } from '@/lib/offline/queue';
import { getRouteSkeleton } from '@/components/skeletons';
import { useInstall } from '@/components/install-provider';
import { signalAppReady } from '@/components/app-ready';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { canInstall, install } = useInstall();

  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [offlineCount, setOfflineCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);

  const desktopNavRef = useRef<HTMLElement>(null);
  const tabletNavRef = useRef<HTMLElement>(null);
  const mobileNavRef = useRef<HTMLElement>(null);

  // Clear pending href once navigation settles
  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  // Global listener for Add Item drawer
  useEffect(() => {
    const handleOpenAddItem = () => setAddItemOpen(true);
    window.addEventListener('tallo-open-add-item', handleOpenAddItem);
    return () => window.removeEventListener('tallo-open-add-item', handleOpenAddItem);
  }, []);

  // Instant route skeleton check: return true if target query data exists in cache
  const isRouteCached = useCallback(
    (href: string) => {
      if (href === '/home') {
        return (
          !!queryClient.getQueryData(['items', 'all']) ||
          !!queryClient.getQueryData(['entries', 50])
        );
      }
      if (href === '/stock') {
        return !!queryClient.getQueryData(['items', 'all']);
      }
      if (href === '/sell') {
        return !!queryClient.getQueryData(['items', 'all']);
      }
      if (href === '/debts') {
        return !!queryClient.getQueryData(['customers']);
      }
      if (href === '/reports') {
        return (
          !!queryClient.getQueryData(['reports', 'week', 0]) ||
          !!queryClient.getQueryData(['reports', 'month', 0])
        );
      }
      return false;
    },
    [queryClient]
  );

  const checkQueue = async () => {
    const queue = await getOfflineQueue();
    setOfflineCount(queue.length);
  };

  useEffect(() => {
    setIsOnline(navigator.onLine);
    checkQueue();

    const handleOnline = async () => {
      setIsOnline(true);
      await flushOfflineQueue();
      checkQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('tallo-queue-updated', checkQueue);

    const interval = setInterval(checkQueue, 2000);
    signalAppReady();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('tallo-queue-updated', checkQueue);
      clearInterval(interval);
    };
  }, []);

  const navLinks = [
    { href: '/home', label: 'Home', icon: House, shortcut: 'G H' },
    { href: '/stock', label: 'Stock', icon: Package, shortcut: 'G S' },
    { href: '/sell', label: 'Sell', icon: Plus, shortcut: 'N', isPrimary: true },
    { href: '/debts', label: 'Debts', icon: HandCoins, shortcut: 'G D' },
    { href: '/reports', label: 'Reports', icon: ChartNoAxesColumn, shortcut: 'G R' },
  ];

  // Current active identifier (respecting pending touch/click immediately)
  const currentNav = pendingHref || pathname;
  const activeNavHref =
    navLinks.find((l) => currentNav.startsWith(l.href))?.href ||
    (currentNav.startsWith('/settings') ? '/settings' : '/home');

  // Intelligent prefetching for instant tab switches (Part 3d)
  const prefetchTab = useCallback(
    (href: string) => {
      router.prefetch(href);

      // Low bandwidth check: if user enabled Data Saver or on 2g, prefetch routes only
      const nav = navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } };
      if (nav.connection?.saveData || nav.connection?.effectiveType === '2g') return;

      if (href === '/home' || href === '/stock') {
        queryClient.prefetchQuery({
          queryKey: ['items', 'all'],
          queryFn: async () => {
            const res = await fetch('/api/items?status=all');
            return res.json();
          },
          staleTime: 30000,
        });
      }
      if (href === '/debts' || href === '/home') {
        queryClient.prefetchQuery({
          queryKey: ['customers'],
          queryFn: async () => {
            const res = await fetch('/api/customers');
            return res.json();
          },
          staleTime: 30000,
        });
      }
      if (href === '/reports') {
        queryClient.prefetchQuery({
          queryKey: ['reports', 'week', 0],
          queryFn: async () => {
            const res = await fetch('/api/reports?period=week');
            return res.json();
          },
          staleTime: 30000,
        });
      }
    },
    [router, queryClient]
  );

  // Background idle prefetching on first paint
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const idleCallback =
      (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback ||
      ((cb: () => void) => setTimeout(cb, 300));

    idleCallback(() => {
      ['/home', '/stock', '/sell', '/debts', '/reports'].forEach((tab) => {
        prefetchTab(tab);
      });
    });
  }, [prefetchTab]);

  const handleOpenSearch = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
  };

  return (
    <div className="flex min-h-screen flex-col bg-bg text-text sm:pl-[72px] lg:pl-60">
      {/* Offline Sync Banner */}
      {(!isOnline || offlineCount > 0) && (
        <div
          role="status"
          aria-live="polite"
          className="sticky top-0 z-40 flex items-center justify-between bg-surface-2 px-4 py-2 text-xs font-medium text-text border-b border-border"
        >
          <div className="flex items-center gap-2">
            {!isOnline ? (
              <WifiOff className="h-3.5 w-3.5 text-danger" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 text-brand animate-spin" />
            )}
            <span>
              {!isOnline
                ? (offlineCount > 0 ? `You are offline (${offlineCount} waiting to sync)` : 'You are offline')
                : `${offlineCount} waiting to sync`}
            </span>
          </div>
          {isOnline && offlineCount > 0 && (
            <button
              onClick={async () => {
                await flushOfflineQueue();
                checkQueue();
              }}
              className="flex items-center gap-1 rounded-sm bg-text px-2 py-0.5 text-xs text-surface hover:opacity-90 transition-opacity"
            >
              <RefreshCw className="h-3 w-3" /> Sync Now
            </button>
          )}
        </div>
      )}

      {/* Mobile & Tablet Top Bar (Sticky header with 1px border appearing on scroll) */}
      <header
        className={`sticky top-0 z-30 flex h-14 items-center justify-between bg-surface/95 px-4 backdrop-blur-xs transition-colors lg:hidden ${
          isScrolled ? 'border-b border-border shadow-subtle' : 'border-b border-transparent'
        }`}
      >
        <BrandLogo size="sm" showWordmark={true} />

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleOpenSearch}
            aria-label="Open search (Ctrl+K)"
            className="hit-slop inline-flex h-9 w-9 items-center justify-center rounded-md text-text-muted hover:bg-surface-2 hover:text-text transition-colors"
          >
            <Search className="h-4 w-4" />
          </button>
          <ThemeToggle />
          <Link
            href="/settings"
            aria-label="Shop Settings"
            onPointerDown={() => setPendingHref('/settings')}
            className="hit-slop inline-flex h-9 w-9 items-center justify-center rounded-md text-text-muted hover:bg-surface-2 hover:text-text transition-colors"
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* Tablet Rail (640px to 1023px, 72px width) */}
      <aside className="fixed inset-y-0 left-0 hidden w-[72px] flex-col items-center justify-between border-r border-border bg-surface py-5 sm:flex lg:hidden z-30">
        <div className="flex flex-col items-center gap-6">
          <BrandLogo size="sm" showWordmark={false} />

          <nav ref={tabletNavRef} className="relative flex flex-col items-center gap-2">
            <SlidingPill
              activeId={activeNavHref}
              containerRef={tabletNavRef}
              pillClassName="bg-[var(--brand-soft)]"
            />
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = activeNavHref === item.href;
              if (item.isPrimary) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    data-pill-id={item.href}
                    onPointerDown={() => {
                      setPendingHref(item.href);
                      prefetchTab(item.href);
                    }}
                    onMouseEnter={() => prefetchTab(item.href)}
                    onFocus={() => prefetchTab(item.href)}
                    className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full bg-brand text-on-brand shadow-subtle transition-transform active:scale-95"
                  >
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </Link>
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  data-pill-id={item.href}
                  onPointerDown={() => {
                    setPendingHref(item.href);
                    prefetchTab(item.href);
                  }}
                  onMouseEnter={() => prefetchTab(item.href)}
                  onFocus={() => prefetchTab(item.href)}
                  className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
                    isActive
                      ? 'text-brand font-semibold'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col items-center gap-2">
          <ThemeToggle />
          <Link
            href="/settings"
            title="Settings"
            onPointerDown={() => setPendingHref('/settings')}
            className="flex h-10 w-10 items-center justify-center rounded-md text-text-muted hover:bg-surface-2 hover:text-text transition-colors"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </aside>

      {/* Desktop Sidebar (≥1024px, 240px width) */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col justify-between border-r border-border bg-surface p-4 lg:flex z-30">
        <div className="space-y-6">
          <div className="px-2 pt-1">
            <BrandLogo size="md" showWordmark={true} />
            <p className="mt-1 text-xs text-text-muted">Know your shop.</p>
          </div>

          <nav ref={desktopNavRef} className="relative space-y-1">
            <SlidingPill
              activeId={activeNavHref}
              containerRef={desktopNavRef}
              pillClassName="bg-[var(--brand-soft)]"
            />
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = activeNavHref === item.href;
              if (item.isPrimary) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-pill-id={item.href}
                    onPointerDown={() => {
                      setPendingHref(item.href);
                      prefetchTab(item.href);
                    }}
                    onMouseEnter={() => prefetchTab(item.href)}
                    onFocus={() => prefetchTab(item.href)}
                    className="relative z-10 flex items-center justify-between rounded-md bg-brand px-3 py-2.5 text-sm font-semibold text-on-brand shadow-subtle transition-transform active:scale-[0.98] mb-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4" strokeWidth={2.5} />
                      <span>{item.label}</span>
                    </div>
                    <kbd className="rounded-sm bg-black/20 px-1.5 py-0.5 text-[10px] font-mono text-on-brand">
                      {item.shortcut}
                    </kbd>
                  </Link>
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-pill-id={item.href}
                  onPointerDown={() => {
                    setPendingHref(item.href);
                    prefetchTab(item.href);
                  }}
                  onMouseEnter={() => prefetchTab(item.href)}
                  onFocus={() => prefetchTab(item.href)}
                  className={`relative z-10 flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-brand font-semibold'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.shortcut && (
                    <kbd className="text-[10px] font-mono text-text-muted/60">
                      {item.shortcut}
                    </kbd>
                  )}
                </Link>
              );
            })}

            <Link
              href="/settings"
              data-pill-id="/settings"
              onPointerDown={() => {
                setPendingHref('/settings');
              }}
              className={`relative z-10 flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                activeNavHref === '/settings'
                  ? 'text-brand font-semibold'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Link>
          </nav>
        </div>

        <div className="border-t border-border pt-3 space-y-2">
          {canInstall && (
            <button
              onClick={install}
              className="flex w-full items-center gap-2 rounded-md border border-[var(--brand)]/30 bg-[var(--brand-soft)]/50 px-2.5 py-1.5 text-xs font-semibold text-[var(--brand)] hover:bg-[var(--brand-soft)] transition-colors hit-slop"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Install App</span>
            </button>
          )}

          <div className="flex items-center justify-between px-2">
            <span className="text-xs text-text-muted">Appearance</span>
            <ThemeToggle />
          </div>

          <button
            onClick={handleOpenSearch}
            className="flex w-full items-center justify-between rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs text-text-muted hover:text-text transition-colors"
          >
            <div className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5" />
              <span>Search</span>
            </div>
            <kbd className="rounded-sm border border-border bg-surface px-1 py-0.5 text-[10px] font-mono">
              Ctrl+K
            </kbd>
          </button>
        </div>
      </aside>

      {/* Main Content Area with enter transition only (Part 3b) */}
      <main
        id="main-content"
        className="flex-1 px-4 pt-5 pb-28 sm:px-6 sm:py-8 sm:pb-8 mx-auto w-full max-w-[1100px]"
      >
        <div
          key={pendingHref && !isRouteCached(pendingHref) ? `pending-${pendingHref}` : pathname}
          className="page-enter flex-1"
        >
          {pendingHref && !isRouteCached(pendingHref)
            ? getRouteSkeleton(pendingHref)
            : children}
        </div>
      </main>

      {/* Mobile Bottom Navigation (<640px) */}
      <nav
        ref={mobileNavRef}
        aria-label="Mobile Navigation"
        className="fixed bottom-0 inset-x-0 z-30 flex h-16 items-center justify-around border-t border-border bg-surface/95 px-2 backdrop-blur-xs pb-[env(safe-area-inset-bottom)] sm:hidden"
      >
        <SlidingPill
          activeId={activeNavHref}
          containerRef={mobileNavRef}
          pillClassName="bg-[var(--brand-soft)]/60"
        />
        {navLinks.map((item) => {
          const Icon = item.icon;
          const isActive = activeNavHref === item.href;

          if (item.isPrimary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                data-pill-id={item.href}
                onPointerDown={() => {
                  setPendingHref(item.href);
                  prefetchTab(item.href);
                }}
                onMouseEnter={() => prefetchTab(item.href)}
                onFocus={() => prefetchTab(item.href)}
                className="relative z-10 flex -translate-y-2 flex-col items-center justify-center"
                aria-label="Record Sale"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-on-brand shadow-subtle transition-transform active:scale-95">
                  <Icon className="h-6 w-6" strokeWidth={2.5} />
                </div>
                <span className="mt-0.5 text-[10px] font-semibold text-brand">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              data-pill-id={item.href}
              onPointerDown={() => {
                setPendingHref(item.href);
                prefetchTab(item.href);
              }}
              onMouseEnter={() => prefetchTab(item.href)}
              onFocus={() => prefetchTab(item.href)}
              className={`hit-slop relative z-10 flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                isActive ? 'text-brand font-semibold' : 'text-text-muted hover:text-text'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Command Menu Modal */}
      <CommandMenu />

      {/* Global Add Item Drawer */}
      <AddItemDrawer open={addItemOpen} onOpenChange={setAddItemOpen} />
    </div>
  );
}
