'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatMoney } from '@/lib/domain/money';
import { ArrowLeft, Users, Copy, Check, Phone, Clock, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useCustomer } from '@/lib/query/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { DebtsDetailSkeleton } from '@/components/skeletons';
import { invalidateAfterMutation, optimisticUpdateOnDebtPayment } from '@/lib/query/invalidate';

export default function CustomerDebtDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.customerId as string;
  const queryClient = useQueryClient();

  const { data, isLoading } = useCustomer(customerId);
  const customer = data?.customer;
  const balanceMinor = data?.balanceMinor || 0;
  const ledger = data?.ledger || [];

  // Payment form state
  const [payAmount, setPayAmount] = useState<number | ''>('');
  const [paying, setPaying] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payAmount || payAmount <= 0) return;
    setPaying(true);
    const amountMinor = Math.round(Number(payAmount) * 100);
    optimisticUpdateOnDebtPayment(queryClient, customerId, amountMinor);
    try {
      const res = await fetch('/api/debts/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          amount: Number(payAmount),
        }),
      });

      if (res.ok) {
        setPayAmount('');
        await invalidateAfterMutation(queryClient, 'debt_payment');
      }
    } catch (err) {
      console.error('Payment record failed:', err);
    } finally {
      setPaying(false);
    }
  };

  const copyReminder = () => {
    if (!customer) return;
    const text = `Hello ${customer.name}, gentle reminder from your shop regarding your outstanding balance of ${formatMoney(balanceMinor)}. Thank you!`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading && !data) {
    return <DebtsDetailSkeleton />;
  }

  if (!customer) {
    return (
      <div className="text-center py-16 space-y-4">
        <Users className="mx-auto h-12 w-12 text-[var(--text-muted)]" />
        <div>
          <h2 className="text-lg font-bold font-display text-[var(--text)]">Customer not found</h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">This customer record might have been removed.</p>
        </div>
        <Button onClick={() => router.push('/debts')} variant="outline">
          Back to Debts
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/debts"
          className="p-1.5 rounded-[var(--r-sm)] hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors hit-slop"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--text)]">
            {customer.name}
          </h1>
          <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5 mt-0.5">
            <Phone className="h-3 w-3" /> {customer.phone || 'No phone number provided'}
          </p>
        </div>
      </div>

      {/* Balance Summary & Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-muted)] uppercase">
                Outstanding Balance Owed
              </span>
              {balanceMinor > 0 && <span className="badge badge-owes">Owes</span>}
            </div>
            <div className={`mt-2 font-display text-3xl font-bold tabular-nums ${balanceMinor > 0 ? 'text-[var(--accent)]' : 'text-[var(--brand)]'}`}>
              {formatMoney(balanceMinor)}
            </div>
          </div>
          <div>
            <Button
              size="sm"
              variant="outline"
              onClick={copyReminder}
              disabled={balanceMinor <= 0}
              className="gap-1.5 text-xs font-medium"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-[var(--brand)]" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copied to Clipboard' : 'Copy Reminder Message'}
            </Button>
          </div>
        </div>

        {/* Record Payment Form */}
        <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
          <h3 className="font-display text-sm font-semibold text-[var(--text)]">Record Debt Payment</h3>
          <form onSubmit={handleRecordPayment} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-[var(--text)]">Amount Paid (NGN) <span className="text-[var(--danger)]">*</span></label>
              <Input
                type="number"
                placeholder="e.g. 5000"
                value={payAmount}
                onChange={(e) => setPayAmount(parseFloat(e.target.value) || '')}
                className="mt-1 h-9 text-xs"
                required
              />
            </div>
            <Button type="submit" disabled={paying || !payAmount} className="w-full text-xs font-semibold h-9">
              {paying ? 'Recording…' : 'Record Payment'}
            </Button>
          </form>
        </div>
      </div>

      {/* Customer Ledger History */}
      <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden space-y-2 p-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[var(--border)]">
          <Clock className="w-4 h-4 text-[var(--text-muted)]" />
          <h3 className="font-display text-sm font-semibold text-[var(--text)]">Customer Ledger History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-2)]/50 border-b border-[var(--border)] text-[var(--text-muted)] font-medium">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Transaction</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {ledger.map((entry: any) => {
                const isPayment = entry.type === 'debt_payment';
                return (
                  <tr key={entry.id} className="hover:bg-[var(--surface-2)]/40 transition-colors">
                    <td className="p-3 text-[var(--text-muted)] tabular-nums">
                      {new Date(entry.occurred_at).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        {isPayment ? (
                          <ArrowDownLeft className="w-3.5 h-3.5 text-[var(--brand)]" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5 text-[var(--accent)]" />
                        )}
                        <span className="font-medium text-[var(--text)]">
                          {isPayment ? 'Payment Received' : 'Credit Purchase'}
                        </span>
                      </div>
                    </td>
                    <td className={`p-3 font-semibold tabular-nums ${isPayment ? 'text-[var(--brand)]' : 'text-[var(--accent)]'}`}>
                      {formatMoney(entry.total_minor)}
                    </td>
                    <td className="p-3 text-xs text-[var(--text-muted)]">
                      {entry.note || (entry.items ? `${entry.quantity} × ${entry.items.name}` : entry.source)}
                    </td>
                  </tr>
                );
              })}
              {ledger.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-xs text-[var(--text-muted)]">
                    No credit transactions or payments recorded for this customer yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
