'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, House, Plus, Package, HandCoins, ChartNoAxesColumn, Settings } from 'lucide-react';

interface SearchResult {
  items: Array<{ id: string; name: string; unit: string; current_qty: number }>;
  customers: Array<{ id: string; name: string; phone?: string }>;
}

export function CommandMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult>({ items: [], customers: [] });

  useEffect(() => {
    if (!open) return;

    const handlePopState = () => {
      setOpen(false);
    };

    window.history.pushState({ cmdMenuOpen: true }, '');
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ items: [], customers: [] });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch {
        // ignore search error
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  if (!open) return null;

  const navigate = (path: string) => {
    setOpen(false);
    setQuery('');
    router.push(path);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command search menu"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-16 backdrop-blur-xs animate-in fade-in duration-120"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-lg border border-border bg-surface shadow-subtle animate-in zoom-in-95 duration-120"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center border-b border-border px-3.5">
          <Search className="mr-2.5 h-4 w-4 shrink-0 text-text-muted" />
          <input
            autoFocus
            placeholder="Type a command or search items & customers..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex h-12 w-full bg-transparent text-sm text-text outline-none placeholder:text-text-muted/60"
          />
          <kbd className="hidden sm:inline-flex items-center rounded-sm border border-border bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-text-muted">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 text-sm divide-y divide-border">
          {/* Quick Actions */}
          {!query && (
            <div className="p-1 space-y-1">
              <div className="text-[11px] font-semibold tracking-wider text-text-muted px-2.5 py-1 uppercase">
                Quick Navigation
              </div>
              <button
                onClick={() => navigate('/home')}
                className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm text-text hover:bg-surface-2 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <House className="h-4 w-4 text-text-muted" />
                  <span>Home Dashboard</span>
                </div>
                <kbd className="hidden sm:inline-block text-[11px] text-text-muted">G H</kbd>
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  window.dispatchEvent(new CustomEvent('tallo-open-add-item'));
                }}
                className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm text-text hover:bg-surface-2 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Plus className="h-4 w-4 text-brand" />
                  <span className="font-semibold text-brand">Add Item</span>
                </div>
                <kbd className="hidden sm:inline-block text-[11px] text-text-muted">A</kbd>
              </button>
              <button
                onClick={() => navigate('/sell')}
                className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm text-text hover:bg-surface-2 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Plus className="h-4 w-4 text-brand" />
                  <span>Record Sale / Sell</span>
                </div>
                <kbd className="hidden sm:inline-block text-[11px] text-text-muted">N</kbd>
              </button>
              <button
                onClick={() => navigate('/stock')}
                className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm text-text hover:bg-surface-2 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Package className="h-4 w-4 text-text-muted" />
                  <span>View Stock Inventory</span>
                </div>
                <kbd className="hidden sm:inline-block text-[11px] text-text-muted">G S</kbd>
              </button>
              <button
                onClick={() => navigate('/debts')}
                className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm text-text hover:bg-surface-2 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <HandCoins className="h-4 w-4 text-text-muted" />
                  <span>Customers & Debts</span>
                </div>
                <kbd className="hidden sm:inline-block text-[11px] text-text-muted">G D</kbd>
              </button>
              <button
                onClick={() => navigate('/reports')}
                className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm text-text hover:bg-surface-2 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <ChartNoAxesColumn className="h-4 w-4 text-text-muted" />
                  <span>Business Reports</span>
                </div>
                <kbd className="hidden sm:inline-block text-[11px] text-text-muted">G R</kbd>
              </button>
              <button
                onClick={() => navigate('/settings')}
                className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm text-text hover:bg-surface-2 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Settings className="h-4 w-4 text-text-muted" />
                  <span>Shop Settings</span>
                </div>
              </button>
            </div>
          )}

          {/* Search Results */}
          {query && (
            <div className="p-1 space-y-3">
              {results.items.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold tracking-wider text-text-muted px-2.5 py-1 uppercase mb-0.5">
                    Items
                  </div>
                  {results.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => navigate(`/stock/${item.id}`)}
                      className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm text-text hover:bg-surface-2 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Package className="h-4 w-4 shrink-0 text-brand" />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <span className="text-xs text-text-muted tabular-nums">
                        {item.current_qty} {item.unit}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {results.customers.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold tracking-wider text-text-muted px-2.5 py-1 uppercase mb-0.5">
                    Customers
                  </div>
                  {results.customers.map((cust) => (
                    <button
                      key={cust.id}
                      onClick={() => navigate(`/debts/${cust.id}`)}
                      className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm text-text hover:bg-surface-2 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <HandCoins className="h-4 w-4 shrink-0 text-accent" />
                        <span className="font-medium">{cust.name}</span>
                      </div>
                      {cust.phone && (
                        <span className="text-xs text-text-muted tabular-nums">
                          {cust.phone}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {results.items.length === 0 && results.customers.length === 0 && (
                <p className="p-4 text-center text-xs text-text-muted">
                  No matching items or customers found.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
