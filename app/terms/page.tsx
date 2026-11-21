import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service — Tallo',
  description: 'Terms and conditions for using the Tallo platform.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex flex-col">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <BrandLogo size="md" />
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)] transition-colors hit-slop"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
        </div>
      </header>

      <main id="main-content" className="flex-1 mx-auto max-w-3xl px-6 py-12">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold font-display text-[var(--text)] tracking-tight">
              Terms of Service
            </h1>
            <p className="mt-2 text-xs font-medium text-[var(--text-muted)]">
              Last updated: November 21, 2026
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-bold font-display text-[var(--text)]">
              1. Agreement to Terms
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              By registering an account, accessing, or using Tallo, you agree to comply with and be bound by these Terms of Service. If you do not agree with these terms, please do not use the application.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold font-display text-[var(--text)]">
              2. Permitted Use
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              Tallo is provided to assist shop owners and sole proprietors with catalog management, recording customer debts, calculating daily sales totals, and viewing restock suggestions. You agree not to misuse the service or use automated bots to overload our infrastructure or AI parsing APIs.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold font-display text-[var(--text)]">
              3. AI-Assisted Transcription and Suggestions
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              Tallo provides AI parsing for spoken notes, receipt images, and free-text sales. While we employ strict deterministic guards against hallucinations, you remain responsible for reviewing and confirming parsed line items on the confirmation screen before final commitment to your ledger.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold font-display text-[var(--text)]">
              4. Availability and Service Continuity
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              We strive to ensure continuous uptime and provide offline logging capabilities. However, Tallo is provided &ldquo;as is&rdquo; without warranty of uninterrupted service. We encourage regular CSV exports to maintain independent backups of your records.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-[var(--border)] py-6 text-center text-xs text-[var(--text-muted)]">
        &copy; {new Date().getFullYear()} Tallo. Know your shop.
      </footer>
    </div>
  );
}
