'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Zap,
  ChevronDown,
  MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/brand-logo';
import { ScrollProgress } from '@/components/ui/scroll-progress';

export default function LandingPage() {
  const [cookieDismissed, setCookieDismissed] = useState(true);

  useEffect(() => {
    // Capture utm params into localStorage
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
      const utmData: Record<string, string> = {};

      utmKeys.forEach((key) => {
        const val = url.searchParams.get(key);
        if (val) utmData[key] = val;
      });

      if (Object.keys(utmData).length > 0) {
        localStorage.setItem('tallo_utm', JSON.stringify(utmData));
      }

      const dismissed = localStorage.getItem('tallo_cookie_dismissed');
      if (!dismissed) setCookieDismissed(false);
    }
  }, []);

  const dismissCookie = () => {
    localStorage.setItem('tallo_cookie_dismissed', 'true');
    setCookieDismissed(true);
  };

  const faqs = [
    {
      q: 'Does Tallo work when my internet is down?',
      a: 'Yes. In Tap mode, Tallo queues all your sales directly on your phone or computer. The moment your connection returns, queued sales flush to your database automatically without duplicates.',
    },
    {
      q: 'Can I speak Nigerian Pidgin into the voice recorder?',
      a: 'Yes. Our AI understands plain Nigerian English and Pidgin (e.g. "Sell two carton Indomie give Mama Ngozi on credit") and extracts items, quantities, and payment methods.',
    },
    {
      q: 'How does stock runout forecasting work?',
      a: 'Tallo tracks your 7-day average sales velocity for each product. Dividing your current on-hand quantity by daily burn rate tells you exactly how many days of inventory you have left.',
    },
    {
      q: 'Is Tallo really free to use?',
      a: 'Yes, Tallo is open, fast, and free for individual shop owners. You can also export your full transaction ledger to CSV anytime.',
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)] text-[var(--text)]">
      <ScrollProgress />
      {/* Top Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur px-6 py-3.5">
        <BrandLogo size="md" />
        <div className="flex items-center gap-2.5">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-xs font-semibold">
              Log in
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="sm" className="text-xs font-semibold shadow-sm">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      <main id="main-content" className="flex-1">
        {/* Hero Section */}
        <section className="mx-auto max-w-4xl px-6 pt-16 pb-12 text-center sm:pt-24 sm:pb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--surface-2)] text-xs font-semibold text-[var(--text-muted)] border border-[var(--border)] mb-6">
            <Sparkles className="w-3.5 h-3.5 text-[var(--brand)]" />
            Simple, fast shop ledger for retail & wholesale
          </div>

          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-[var(--text)] text-balance">
            Never lose track of your <span className="text-[var(--brand)]">sales and stock</span> again.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-[var(--text-muted)] leading-relaxed">
            Record sales in seconds by tapping, speaking, typing, or snapping a picture of your paper book.
            Get instant stock runout forecasts and track who owes you money.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="w-full sm:w-auto">
              <Button size="lg" className="w-full gap-2 font-semibold shadow-sm">
                Start Free Now <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full font-semibold">
                Sign In to Your Shop
              </Button>
            </Link>
          </div>

          {/* Hero Mockup */}
          <div className="mt-12 mx-auto max-w-xl rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-md text-left">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[var(--danger)]/60" />
                <div className="w-3 h-3 rounded-full bg-[var(--warning)]/60" />
                <div className="w-3 h-3 rounded-full bg-[var(--brand)]/60" />
              </div>
              <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase">
                Tallo Quick Sell
              </span>
              <div className="w-4" />
            </div>

            <div className="pt-4 space-y-3">
              <div className="flex gap-2">
                <span className="px-3 py-1 rounded-[var(--r-sm)] bg-[var(--brand)] text-[var(--on-brand)] text-xs font-semibold">
                  Tap Mode
                </span>
                <span className="px-3 py-1 rounded-[var(--r-sm)] bg-[var(--surface-2)] text-[var(--text-muted)] text-xs font-medium">
                  Speak
                </span>
                <span className="px-3 py-1 rounded-[var(--r-sm)] bg-[var(--surface-2)] text-[var(--text-muted)] text-xs font-medium">
                  Snap
                </span>
                <span className="px-3 py-1 rounded-[var(--r-sm)] bg-[var(--surface-2)] text-[var(--text-muted)] text-xs font-medium">
                  Type
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="p-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface-2)]/30">
                  <div className="text-xs font-bold text-[var(--text)]">Indomie Super Pack</div>
                  <div className="text-[11px] text-[var(--brand)] font-semibold mt-1">₦350 • 48 left</div>
                </div>
                <div className="p-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface-2)]/30">
                  <div className="text-xs font-bold text-[var(--text)]">Peak Milk Sachet</div>
                  <div className="text-[11px] text-[var(--brand)] font-semibold mt-1">₦250 • 12 left</div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-[var(--text-muted)]">
                <span>Sale summary: 2 items selected</span>
                <span className="font-bold text-[var(--text)] tabular-nums">₦600</span>
              </div>
            </div>
          </div>
        </section>

        {/* 3-Step Process Row */}
        <section className="border-y border-[var(--border)] bg-[var(--surface)] py-12 px-6">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-center font-display text-xl font-bold tracking-tight text-[var(--text)] mb-8">
              How shop owners use Tallo in 3 steps
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 rounded-[var(--r-md)] bg-[var(--surface-2)]/40 border border-[var(--border)] space-y-2">
                <div className="w-8 h-8 rounded-full bg-[var(--brand-soft)] text-[var(--brand)] font-display font-bold flex items-center justify-center text-sm">
                  1
                </div>
                <h3 className="font-display font-semibold text-sm text-[var(--text)]">Tap or Speak Sales</h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Log sales in 5 seconds. Use tap tiles, voice dictation, photo receipt scan, or quick forms.
                </p>
              </div>

              <div className="p-4 rounded-[var(--r-md)] bg-[var(--surface-2)]/40 border border-[var(--border)] space-y-2">
                <div className="w-8 h-8 rounded-full bg-[var(--brand-soft)] text-[var(--brand)] font-display font-bold flex items-center justify-center text-sm">
                  2
                </div>
                <h3 className="font-display font-semibold text-sm text-[var(--text)]">Stock Tracks Automatically</h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Inventory depletes immediately. Days-left forecasts tell you exactly when stock will run out.
                </p>
              </div>

              <div className="p-4 rounded-[var(--r-md)] bg-[var(--surface-2)]/40 border border-[var(--brand)]/20 space-y-2">
                <div className="w-8 h-8 rounded-full bg-[var(--brand)] text-[var(--on-brand)] font-display font-bold flex items-center justify-center text-sm">
                  3
                </div>
                <h3 className="font-display font-semibold text-sm text-[var(--text)]">Know Profits & Debts</h3>
                <p className="text-xs text-[var(--text-muted)]">
                  See weekly AI summaries, best sellers, restock advice, and copy customer debt reminders in 1 click.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <section className="mx-auto max-w-4xl px-6 py-16">
          <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--text)] text-center mb-8">
            Built strictly for everyday retail reality
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] p-5 space-y-2">
              <Zap className="h-6 w-6 text-[var(--brand)]" />
              <h3 className="font-display font-semibold text-sm text-[var(--text)]">Offline First</h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Network gone? Tallo never locks up. Tap sales save locally and sync cleanly when connection returns.
              </p>
            </div>

            <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] p-5 space-y-2">
              <Sparkles className="h-6 w-6 text-[var(--brand)]" />
              <h3 className="font-display font-semibold text-sm text-[var(--text)]">Voice & Photo AI</h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Dictate multi-item sales or snap handwritten books. AI extracts items for your 1-tap review.
              </p>
            </div>

            <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] p-5 space-y-2">
              <ShieldCheck className="h-6 w-6 text-[var(--brand)]" />
              <h3 className="font-display font-semibold text-sm text-[var(--text)]">Credit & Debt Book</h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Stop losing paper debt records. Track outstanding balances and send polite reminder messages instantly.
              </p>
            </div>
          </div>
        </section>

        {/* Expandable FAQ Section */}
        <section className="border-t border-[var(--border)] bg-[var(--surface)] py-16 px-6">
          <div className="mx-auto max-w-2xl">
            <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--text)] text-center mb-8">
              Frequently Asked Questions
            </h2>
            <div className="space-y-3">
              {faqs.map((faq, idx) => (
                <details
                  key={idx}
                  className="group rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] p-4 transition-all"
                >
                  <summary className="flex cursor-pointer items-center justify-between text-xs font-semibold text-[var(--text)] list-none">
                    <span>{faq.q}</span>
                    <ChevronDown className="h-4 w-4 text-[var(--text-muted)] transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 text-xs text-[var(--text-muted)] leading-relaxed">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--surface)] py-8 px-6 text-center text-xs text-[var(--text-muted)]">
        <div className="mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <BrandLogo size="sm" />
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <p>&copy; 2026 Tallo. Know your shop.</p>
            <span className="hidden sm:inline text-[var(--border)]">•</span>
            <p>Last updated: November 21, 2026</p>
          </div>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-[var(--text)] transition-colors hit-slop">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-[var(--text)] transition-colors hit-slop">
              Terms
            </Link>
            <Link href="/login" className="hover:text-[var(--text)] transition-colors hit-slop">
              Sign In
            </Link>
          </div>
        </div>
      </footer>

      {/* Floating Contact Link (Landing only) */}
      <a
        href="mailto:support@tallo.app"
        aria-label="Contact Tallo Support"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-3 py-2 rounded-full bg-[var(--text)] text-[var(--bg)] text-xs font-semibold shadow-subtle hover:opacity-90 transition-opacity hit-slop"
      >
        <MessageCircle className="w-4 h-4" />
        <span>Need Help?</span>
      </a>

      {/* Cookie Banner (Landing only, dismissable) */}
      {!cookieDismissed && (
        <div
          role="region"
          aria-label="Cookie consent"
          className="fixed bottom-6 left-6 max-w-sm z-50 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-subtle text-xs space-y-2.5"
        >
          <p className="text-[var(--text-muted)]">
            We store offline sales and device preferences in your local browser storage to keep Tallo fast and reliable.
          </p>
          <div className="flex justify-end gap-2">
            <Button size="sm" onClick={dismissCookie} className="text-xs h-7 px-3">
              Got it
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
