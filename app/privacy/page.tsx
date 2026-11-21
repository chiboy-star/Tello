import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy — Tallo',
  description: 'How Tallo respects and protects your shop data.',
};

export default function PrivacyPage() {
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
              Privacy Policy
            </h1>
            <p className="mt-2 text-xs font-medium text-[var(--text-muted)]">
              Last updated: November 21, 2026
            </p>
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-bold font-display text-[var(--text)]">
              1. Our Philosophy: Your Data Is Yours
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              Tallo is built for small business owners and shop traders. We only collect the minimal information required to help you track your sales, stock, and credit debts. We do not sell your personal information or shop transaction data to advertisers or third-party brokers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold font-display text-[var(--text)]">
              2. Data We Collect and Store
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-sm text-[var(--text-muted)]">
              <li>
                <strong className="text-[var(--text)]">Account Profile:</strong> Your shop name, contact email, preferred currency, and timezone to configure your account.
              </li>
              <li>
                <strong className="text-[var(--text)]">Shop Records:</strong> Inventory items, sales transactions, customer debt records, and payment logs necessary to compute your ledger.
              </li>
              <li>
                <strong className="text-[var(--text)]">Voice and Image Notes:</strong> When you use Speak or Snap sales logging, audio snippets or receipt photos are transmitted securely to Gemini API for text extraction and parsing. Audio and image data are not retained for long-term storage or model training.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold font-display text-[var(--text)]">
              3. Offline Data and Local Storage
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              Tallo functions as a Progressive Web App (PWA). When operating offline, your sales are securely queued in your browser’s IndexedDB storage and synchronized immediately once an internet connection is re-established.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold font-display text-[var(--text)]">
              4. Data Export and Complete Deletion
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              You maintain full ownership of your records. You can export your inventory, sales, and debt history as CSV files at any time through Settings. You can also permanently delete your account and all associated records using the destructive account removal option in Settings.
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
