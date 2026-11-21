import Link from 'next/link';
import { WifiOff, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/brand-logo';

export default function OfflinePage() {
  return (
    <main id="main-content" className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg)] p-6 text-center">
      <div className="w-full max-w-md rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm space-y-4">
        <div className="flex justify-center pb-2">
          <BrandLogo size="md" />
        </div>
        <div className="w-12 h-12 rounded-full bg-[var(--surface-2)] text-[var(--text-muted)] flex items-center justify-center mx-auto">
          <WifiOff className="w-6 h-6" />
        </div>
        
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--text)]">
            You are offline
          </h1>
          <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">
            No internet connection detected. Don&apos;t worry — Tallo lets you keep recording sales in Tap mode while offline. They will sync automatically when you reconnect.
          </p>
        </div>

        <div className="pt-2">
          <Link href="/sell">
            <Button size="lg" className="w-full font-semibold text-xs gap-2 shadow-sm">
              <TrendingUp className="w-4 h-4" />
              Continue to Quick Sell
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
