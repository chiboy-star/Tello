export interface DebtEntry {
  id: string;
  type: 'sale' | 'debt_payment' | 'restock';
  total_minor: number;
  payment_type?: string;
  occurred_at: string | Date;
  voided_at?: string | Date | null;
}

export interface CustomerDebtSummary {
  customerId: string;
  balanceMinor: number;
  oldestUnpaidAt: Date | null;
}

/**
 * Computes debt balance and oldest unpaid credit sale date using FIFO matching.
 * Balance = sum of non-voided credit sales - sum of non-voided debt payments.
 */
export function computeCustomerDebt(
  customerId: string,
  entries: DebtEntry[]
): CustomerDebtSummary {
  // Filter non-voided entries for customer
  const valid = entries.filter((e) => !e.voided_at);

  const creditSales = valid
    .filter((e) => e.type === 'sale' && e.payment_type === 'credit')
    .sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());

  const totalCreditMinor = creditSales.reduce((acc, e) => acc + (Number(e.total_minor) || 0), 0);
  
  const totalPaymentsMinor = valid
    .filter((e) => e.type === 'debt_payment')
    .reduce((acc, e) => acc + (Number(e.total_minor) || 0), 0);

  const balanceMinor = totalCreditMinor - totalPaymentsMinor;

  // FIFO matching for oldest unpaid credit sale
  let remainingPayment = totalPaymentsMinor;
  let oldestUnpaidAt: Date | null = null;

  for (const sale of creditSales) {
    const saleAmount = Number(sale.total_minor) || 0;
    if (remainingPayment >= saleAmount) {
      remainingPayment -= saleAmount;
    } else {
      // Partially or completely unpaid sale
      oldestUnpaidAt = new Date(sale.occurred_at);
      break;
    }
  }

  return {
    customerId,
    balanceMinor,
    oldestUnpaidAt: balanceMinor > 0 ? oldestUnpaidAt : null,
  };
}
