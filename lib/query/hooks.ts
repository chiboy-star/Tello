import { useQuery } from '@tanstack/react-query';

// --- Items Queries ---
export function useItems(status: string = 'all') {
  return useQuery({
    queryKey: ['items', status],
    queryFn: async () => {
      const res = await fetch(`/api/items?status=${status}`);
      if (!res.ok) throw new Error('Failed to fetch items');
      return res.json();
    },
  });
}

export function useItem(id: string) {
  return useQuery({
    queryKey: ['item', id],
    queryFn: async () => {
      const res = await fetch(`/api/items/${id}`);
      if (!res.ok) throw new Error('Failed to fetch item');
      return res.json();
    },
    enabled: !!id,
  });
}

// --- Customers Queries ---
export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await fetch('/api/customers');
      if (!res.ok) throw new Error('Failed to fetch customers');
      return res.json();
    },
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const res = await fetch(`/api/customers/${id}`);
      if (!res.ok) throw new Error('Failed to fetch customer');
      return res.json();
    },
    enabled: !!id,
  });
}

// --- Entries Queries ---
export function useEntries(limit: number = 50, itemId?: string) {
  return useQuery({
    queryKey: ['entries', { limit, itemId }],
    queryFn: async () => {
      let url = `/api/entries?limit=${limit}`;
      if (itemId) url += `&itemId=${itemId}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch entries');
      return res.json();
    },
  });
}

// --- Reports Query ---
export function useReport(period: 'week' | 'month', periodOffset: number = 0) {
  return useQuery({
    queryKey: ['reports', period, periodOffset],
    queryFn: async () => {
      let url = `/api/reports?period=${period}`;
      if (periodOffset !== 0) {
        const d = new Date();
        if (period === 'week') {
          d.setDate(d.getDate() + periodOffset * 7);
        } else {
          d.setMonth(d.getMonth() + periodOffset);
        }
        url += `&start=${encodeURIComponent(d.toISOString())}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch report');
      return res.json();
    },
  });
}

// --- Checklist Query ---
export function useChecklist() {
  return useQuery({
    queryKey: ['checklist'],
    queryFn: async () => {
      const res = await fetch('/api/checklist');
      if (!res.ok) throw new Error('Failed to fetch checklist');
      return res.json();
    },
    refetchOnWindowFocus: true,
    staleTime: 5000,
  });
}

// --- Settings Query ---
export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json();
    },
  });
}
