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
export function useEntries(
  limitOrOptions: number | { limit?: number; itemId?: string; type?: string; from?: string; to?: string } = 50,
  itemIdArg?: string
) {
  const options =
    typeof limitOrOptions === 'number'
      ? { limit: limitOrOptions, itemId: itemIdArg }
      : limitOrOptions;
  const limit = options.limit ?? 50;
  const itemId = options.itemId;
  const type = options.type;

  return useQuery({
    queryKey: ['entries', { limit, itemId, type, from: options.from, to: options.to }],
    queryFn: async () => {
      let url = `/api/entries?limit=${limit}`;
      if (itemId) url += `&itemId=${itemId}`;
      if (type) url += `&type=${type}`;
      if (options.from) url += `&from=${encodeURIComponent(options.from)}`;
      if (options.to) url += `&to=${encodeURIComponent(options.to)}`;
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

// --- Dashboard Query (Part 1 Unified Source of Truth) ---
export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error('Failed to fetch dashboard metrics');
      return res.json();
    },
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
    staleTime: 0,
  });
}

// --- Checklist Query ---
export function useChecklist() {
  return useQuery({
    queryKey: ['checklist'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error('Failed to fetch checklist');
      const data = await res.json();
      return data.checklist;
    },
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
    staleTime: 0,
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
