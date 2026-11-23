'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  emptyText = 'No options found.',
  disabled = false,
  className = '',
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const selectedOption = React.useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const filteredOptions = React.useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.description && opt.description.toLowerCase().includes(q)) ||
        opt.value.toLowerCase().includes(q)
    );
  }, [options, search]);

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    setSearch('');
  };

  return (
    <div className={`relative ${className}`}>
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="w-full justify-between h-9 px-3 text-xs bg-[var(--surface)] border-[var(--border)] text-[var(--text)] font-normal hover:bg-[var(--surface-2)] focus:ring-1 focus:ring-[var(--brand)]"
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {/* Desktop Popover */}
      {open && !isMobile && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-72 w-full min-w-[200px] overflow-hidden rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-lg animate-in fade-in-80">
          <div className="flex items-center border-b border-[var(--border)] px-2.5 py-1.5">
            <Search className="mr-2 h-3.5 w-3.5 shrink-0 opacity-50 text-[var(--text-muted)]" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-xs text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none"
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1 divide-y divide-[var(--border)]/20">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-[var(--text-muted)]">
                {emptyText}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt.value)}
                    className={`flex w-full items-center justify-between rounded-sm px-2.5 py-2 text-left text-xs transition-colors hover:bg-[var(--surface-2)] ${
                      isSelected
                        ? 'bg-[var(--surface-2)] font-semibold text-[var(--brand)]'
                        : 'text-[var(--text)]'
                    }`}
                  >
                    <div>
                      <div>{opt.label}</div>
                      {opt.description && (
                        <div className="text-[10px] text-[var(--text-muted)]">
                          {opt.description}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-[var(--brand)] stroke-[2.5]" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Mobile Drawer (Vaul) */}
      {isMobile && (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="max-h-[85vh] bg-[var(--surface)] text-[var(--text)]">
            <DrawerHeader className="border-b border-[var(--border)] pb-3">
              <DrawerTitle className="text-sm font-semibold">{placeholder}</DrawerTitle>
              <div className="mt-2 flex items-center rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5">
                <Search className="mr-2 h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full bg-transparent text-xs text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none"
                />
              </div>
            </DrawerHeader>
            <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
              {filteredOptions.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                  {emptyText}
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(opt.value)}
                      className={`flex w-full items-center justify-between rounded-[var(--r-sm)] px-3 py-3 text-left text-xs transition-colors min-h-[44px] ${
                        isSelected
                          ? 'bg-[var(--surface-2)] font-semibold text-[var(--brand)]'
                          : 'text-[var(--text)] hover:bg-[var(--surface-2)]'
                      }`}
                    >
                      <div>
                        <div className="text-sm">{opt.label}</div>
                        {opt.description && (
                          <div className="text-xs text-[var(--text-muted)] mt-0.5">
                            {opt.description}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 text-[var(--brand)] stroke-[2.5]" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}
