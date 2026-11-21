import Link from 'next/link';
import { Home, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/brand-logo';

export default function NotFound() {
  return (
    <main id="main-content" className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg)] p-6 text-center">
      <div className="w-full max-w-md rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm space-y-4">
        <div className="flex justify-center pb-2">
          <BrandLogo size="md" />
        </div>
        <div className="w-12 h-12 rounded-full bg-[var(--surface-2)] text-[var(--text-muted)] flex items-center justify-center mx-auto">
          <Compass className="w-6 h-6" />
        </div>

        <div>
          <span className="font-display text-4xl font-extrabold text-[var(--brand)] tabular-nums">
            404
          </span>
          <h1 className="font-display text-xl font-bold tracking-tight text-[var(--text)] mt-2">
            Page Not Found
          </h1>
          <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">
            The page you are looking for doesn&apos;t exist, was moved, or had its address typed incorrectly.
          </p>
        </div>

        <div className="pt-2">
          <Link href="/home">
            <Button size="lg" className="w-full font-semibold text-xs gap-2 shadow-sm">
              <Home className="w-4 h-4" />
              Return to Shop Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
