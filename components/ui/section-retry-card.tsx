'use client';

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SectionRetryCardProps {
  title?: string;
  message?: string;
  onRetry: () => void;
  className?: string;
}

export function SectionRetryCard({
  title = 'Could not load section data',
  message = 'Failed to fetch the latest data for this section. Please try again.',
  onRetry,
  className = '',
}: SectionRetryCardProps) {
  return (
    <div
      data-testid="section-retry-card"
      className={`rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface-2)]/40 p-5 text-center ${className}`}
    >
      <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--danger-soft)] text-[var(--danger)]">
        <AlertCircle className="h-4 w-4" />
      </div>
      <h4 className="text-xs font-semibold text-[var(--text)]">{title}</h4>
      <p className="mt-1 text-[11px] text-[var(--text-muted)] max-w-sm mx-auto">{message}</p>
      <div className="mt-3">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onRetry}
          className="gap-1.5 text-xs h-8 px-3"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </Button>
      </div>
    </div>
  );
}
