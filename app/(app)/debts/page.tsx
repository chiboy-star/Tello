'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatMoney } from '@/lib/domain/money';
import { Search, Plus, Copy, Check, ChevronRight, Phone } from 'lucide-react';
import { useCustomers } from '@/lib/query/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { DebtsSkeleton } from '@/components/skeletons';
import { invalidateAfterMutation, optimisticUpdateOnCustomer, optimisticUpdateOnDebtPayment } from '@/lib/query/invalidate';

export default function DebtsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useCustomers();
  const customers = data?.customers || [];
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Customer Modal
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  // Payment Modal
  const [payingCustomer, setPayingCustomer] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState<number | ''>('');
  const [paying, setPaying] = useState(false);

  const handleCreateCustomer = async () => {
    if (!newCustName.trim()) return;
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCustName, phone: newCustPhone || null }),
      });
      if (res.ok) {
        const data = await res.json();
        const created = data.customer || {
          id: crypto.randomUUID(),
          name: newCustName,
          phone: newCustPhone || null,
          balanceMinor: 0,
        };
        optimisticUpdateOnCustomer(queryClient, created);
        setShowAddCustomer(false);
        setNewCustName('');
        setNewCustPhone('');
        await invalidateAfterMutation(queryClient, 'add_customer');
      }
    } catch (err) {
      console.error('Failed to create customer:', err);
    }
  };

  const handleRecordPayment = async () => {
    if (!payingCustomer || !payAmount || payAmount <= 0) return;
    setPaying(true);
    const amountMinor = Math.round(Number(payAmount) * 100);
    optimisticUpdateOnDebtPayment(queryClient, payingCustomer.id, amountMinor);
    try {
      const res = await fetch('/api/debts/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: payingCustomer.id,
          amount: Number(payAmount),
        }),
      });

      if (res.ok) {
        setPayingCustomer(null);
        setPayAmount('');
        await invalidateAfterMutation(queryClient, 'debt_payment');
      }
    } catch (err) {
      console.error('Failed to record payment:', err);
    } finally {
      setPaying(false);
    }
  };

  const copyReminder = (cust: any) => {
    const text = `Hello ${cust.name}, this is a gentle reminder from your shop regarding your outstanding balance of ${formatMoney(cust.balanceMinor)}. Thank you!`;
    navigator.clipboard.writeText(text);
    setCopiedId(cust.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = customers.filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading && !data) {
    return <DebtsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)]">
            Customers & Credit Ledger
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Track customer credit balances, log repayments, and send payment reminders
          </p>
        </div>
        <Button onClick={() => setShowAddCustomer(true)} className="gap-2 font-semibold">
          <Plus className="h-4 w-4" /> Add Customer
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-[var(--text-muted)] pointer-events-none" />
        <Input
          placeholder="Search customers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10 bg-[var(--surface)] text-sm"
        />
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--r-md)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-2)]/50 border-b border-[var(--border)] text-[var(--text-muted)] font-medium">
              <tr>
                <th className="p-3.5 sm:px-4">Customer</th>
                <th className="p-3.5 sm:px-4">Phone</th>
                <th className="p-3.5 sm:px-4">Balance Owed</th>
                <th className="p-3.5 sm:px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.map((cust: any) => (
                <tr key={cust.id} className="hover:bg-[var(--surface-2)]/40 transition-colors">
                  <td className="p-3.5 sm:px-4 font-medium text-[var(--text)]">
                    <Link
                      href={`/debts/${cust.id}`}
                      className="hover:text-[var(--brand)] hover:underline inline-flex items-center gap-1.5"
                    >
                      {cust.name}
                      <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    </Link>
                  </td>
                  <td className="p-3.5 sm:px-4 text-[var(--text-muted)]">
                    {cust.phone ? (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3 h-3 text-[var(--text-muted)]" />
                        {cust.phone}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="p-3.5 sm:px-4 font-semibold tabular-nums">
                    {cust.balanceMinor > 0 ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--accent)] font-bold">
                          {formatMoney(cust.balanceMinor)}
                        </span>
                        <span className="badge badge-owes">Owes</span>
                      </div>
                    ) : (
                      <span className="text-[var(--text-muted)]">Clear (₦0)</span>
                    )}
                  </td>
                  <td className="p-3.5 sm:px-4 text-right space-x-2">
                    {cust.balanceMinor > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyReminder(cust)}
                        className="gap-1 text-xs h-8"
                      >
                        {copiedId === cust.id ? (
                          <Check className="h-3.5 w-3.5 text-[var(--brand)]" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        {copiedId === cust.id ? 'Copied' : 'Reminder'}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => {
                        setPayingCustomer(cust);
                        setPayAmount('');
                      }}
                      className="text-xs h-8 font-semibold"
                    >
                      Record Payment
                    </Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-xs text-[var(--text-muted)]">
                    No customers found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Dialog */}
      {payingCustomer && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pay-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div className="w-full max-w-sm rounded-[var(--r-lg)] bg-[var(--surface)] border border-[var(--border)] p-6 shadow-subtle space-y-4">
            <div>
              <h3 id="pay-dialog-title" className="font-display font-bold text-base text-[var(--text)]">
                Record Payment: {payingCustomer.name}
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Current balance owed: <strong className="text-[var(--accent)] tabular-nums">{formatMoney(payingCustomer.balanceMinor)}</strong>
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text)]">Amount Paid (NGN) <span className="text-[var(--danger)]">*</span></label>
              <Input
                type="number"
                placeholder="e.g. 5000"
                value={payAmount}
                onChange={(e) => setPayAmount(parseFloat(e.target.value) || '')}
                className="mt-1"
                required
              />
            </div>
            <div className="flex justify-end gap-2.5 pt-2 border-t border-[var(--border)]">
              <Button variant="outline" onClick={() => setPayingCustomer(null)} className="text-xs">
                Cancel
              </Button>
              <Button onClick={handleRecordPayment} disabled={paying || !payAmount} className="text-xs font-semibold">
                {paying ? 'Saving…' : 'Confirm Payment'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Dialog */}
      {showAddCustomer && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-cust-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div className="w-full max-w-sm rounded-[var(--r-lg)] bg-[var(--surface)] border border-[var(--border)] p-6 shadow-subtle space-y-4">
            <div>
              <h3 id="add-cust-title" className="font-display font-bold text-base text-[var(--text)]">
                Add Customer
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Create a customer record for tracking store credit and debts.
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[var(--text)]">Customer Name <span className="text-[var(--danger)]">*</span></label>
                <Input
                  placeholder="e.g. Mama Ngozi"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text)]">Phone Number (optional)</label>
                <Input
                  placeholder="08012345678"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2.5 pt-2 border-t border-[var(--border)]">
              <Button variant="outline" onClick={() => setShowAddCustomer(false)} className="text-xs">
                Cancel
              </Button>
              <Button onClick={handleCreateCustomer} disabled={!newCustName.trim()} className="text-xs font-semibold">
                Save Customer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
