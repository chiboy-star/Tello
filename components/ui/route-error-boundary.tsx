'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AlertTriangle, WifiOff, RefreshCw, Home, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  sectionName?: string;
}

export function RouteErrorBoundary({ error, reset, sectionName }: RouteErrorProps) {
  const pathname = usePathname();
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const derivedTitle = () => {
    if (sectionName) return sectionName;
    if (!pathname) return 'Page';
    if (pathname.includes('/reports')) return 'Reports';
    if (pathname.includes('/stock/prices')) return 'Price Review';
    if (pathname.includes('/stock')) return 'Stock';
    if (pathname.includes('/debts')) return 'Debts';
    if (pathname.includes('/sell')) return 'Sell';
    if (pathname.includes('/settings')) return 'Settings';
    if (pathname.includes('/home')) return 'Home';
    return 'Page';
  };

  const title = derivedTitle();

  const handleCopyDetails = () => {
    const details = `Error in ${title}:
Message: ${error.message || 'Unknown error'}
Name: ${error.name || 'Error'}
Digest: ${error.digest || 'N/A'}
Stack: ${error.stack || 'N/A'}
Timestamp: ${new Date().toISOString()}`;

    navigator.clipboard.writeText(details);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      data-testid="error-boundary-card"
      className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-8 text-center"
    >
      <div className="w-full max-w-md rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
        {/* Icon */}
        <div
          className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${
            isOffline
              ? 'bg-[var(--warning-soft)] text-[var(--warning)]'
              : 'bg-[var(--danger-soft)] text-[var(--danger)]'
          }`}
        >
          {isOffline ? (
            <WifiOff className="h-7 w-7 stroke-[2.2]" />
          ) : (
            <AlertTriangle className="h-7 w-7 stroke-[2.2]" />
          )}
        </div>

        {/* Title */}
        <h2 className="font-display text-xl font-bold tracking-tight text-[var(--text)]">
          {isOffline
            ? 'You are currently offline'
            : `${title} could not be loaded`}
        </h2>

        {/* Friendly explanation */}
        <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">
          {isOffline
            ? 'Check your internet connection and try again. Your recorded sales and shop data remain safe offline.'
            : 'Something unexpected happened while loading this section. Your business data is safe.'}
        </p>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Button
            type="button"
            onClick={() => reset()}
            className="gap-2 text-xs font-semibold h-10 px-5 shadow-sm"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </Button>

          <Link href="/home" className="inline-block">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto gap-2 text-xs font-semibold h-10 px-5"
            >
              <Home className="h-3.5 w-3.5" />
              Go to Home
            </Button>
          </Link>
        </div>

        {/* Technical Details Disclosure */}
        <details className="mt-6 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface-2)]/60 text-left overflow-hidden">
          <summary className="flex cursor-pointer items-center justify-between px-3.5 py-2.5 font-mono text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text)] transition-colors select-none">
            <span>Technical details</span>
            <span className="text-[10px] uppercase font-sans tracking-wider opacity-70">
              disclosure
            </span>
          </summary>
          <div className="border-t border-[var(--border)] p-3 bg-[var(--surface)] text-[11px] space-y-2">
            <div className="font-mono text-xs font-semibold text-[var(--danger)] break-words">
              {error.name || 'Error'}: {error.message || 'Unknown error occurred'}
            </div>
            {error.digest && (
              <div className="font-mono text-[10px] text-[var(--text-muted)]">
                Digest: {error.digest}
              </div>
            )}
            <div className="pt-2 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyDetails}
                className="gap-1.5 text-[10px] h-7 px-2.5"
              >
                {copied ? <Check className="h-3 w-3 text-[var(--brand)]" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy details'}
              </Button>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
