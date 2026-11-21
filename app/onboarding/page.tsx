'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CATALOG_ITEMS, CatalogSeedItem } from '@/lib/catalog/catalog.data';
import { Check, ChevronRight, Store, Package, Plus, Loader2, ArrowLeft } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [businessType, setBusinessType] = useState<'retail' | 'wholesale'>('retail');
  const [shopName, setShopName] = useState('');
  
  // Step 2 categories
  const categoriesList = [
    { id: 'everyday', label: 'Everyday Snacks & Basics' },
    { id: 'food', label: 'Food Staples & Cooking' },
    { id: 'drinks', label: 'Drinks & Beverages' },
    { id: 'household', label: 'Household & Cleaning' },
    { id: 'personal_care', label: 'Personal Care & Hygiene' },
  ];
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['everyday', 'food']);

  // Step 3 catalog checklist
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Map<string, { name: string; unit: string; sellPrice?: number }>>(new Map());
  const [customItemName, setCustomItemName] = useState('');
  const [customItemUnit, setCustomItemUnit] = useState('piece');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pre-select default items when entering step 3
  useEffect(() => {
    if (step === 3 && selectedItems.size === 0) {
      const initialMap = new Map<string, { name: string; unit: string; sellPrice?: number }>();
      CATALOG_ITEMS.forEach((it) => {
        if (
          it.businessTypes.includes(businessType) &&
          selectedCategories.includes(it.category) &&
          it.isDefault
        ) {
          initialMap.set(it.name, { name: it.name, unit: it.unit });
        }
      });
      setSelectedItems(initialMap);
    }
  }, [step, businessType, selectedCategories, selectedItems.size]);

  const toggleCategory = (catId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId]
    );
  };

  const toggleItem = (item: CatalogSeedItem) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      if (next.has(item.name)) {
        next.delete(item.name);
      } else {
        next.set(item.name, { name: item.name, unit: item.unit });
      }
      return next;
    });
  };

  const addCustomItem = () => {
    if (!customItemName.trim()) return;
    const name = customItemName.trim();
    setSelectedItems((prev) => {
      const next = new Map(prev);
      next.set(name, { name, unit: customItemUnit || 'piece' });
      return next;
    });
    setCustomItemName('');
  };

  const handleComplete = async () => {
    if (selectedItems.size === 0) {
      setErrorMsg('Please select at least one item for your shop.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const itemsPayload = Array.from(selectedItems.values()).map((it) => ({
        name: it.name,
        unit: it.unit,
        sellPrice: it.sellPrice || null,
      }));

      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessType,
          shopName: shopName || 'My Shop',
          categories: selectedCategories,
          items: itemsPayload,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error?.message || 'Failed to complete onboarding');
      }

      router.push('/home');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to complete setup');
      setSubmitting(false);
    }
  };

  // Filter catalog items for step 3
  const filteredCatalogItems = CATALOG_ITEMS.filter((item) => {
    const matchesBiz = item.businessTypes.includes(businessType);
    const matchesCat = selectedCategories.includes(item.category);
    const matchesSearch =
      !searchQuery.trim() ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.aliases.some((a) => a.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesBiz && matchesCat && matchesSearch;
  });

  return (
    <main id="main-content" className="min-h-screen bg-[var(--bg)] px-4 py-8 flex flex-col justify-between">
      <div className="mx-auto w-full max-w-2xl">
        {/* Brand header */}
        <div className="flex items-center justify-between mb-8">
          <BrandLogo size="md" />
          <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Step {step} of 3
          </div>
        </div>

        {/* Top Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)] uppercase mb-2">
            <span className={step >= 1 ? 'text-[var(--brand)] font-bold' : ''}>1. Business Type</span>
            <span className={step >= 2 ? 'text-[var(--brand)] font-bold' : ''}>2. Categories</span>
            <span className={step >= 3 ? 'text-[var(--brand)] font-bold' : ''}>3. Initial Stock</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[var(--surface-2)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--brand)] transition-all duration-300 ease-out"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        <div className="rounded-[var(--r-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 shadow-sm">
          {errorMsg && (
            <div
              role="alert"
              className="mb-6 rounded-[var(--r-sm)] bg-[var(--danger-soft)] p-3 text-xs text-[var(--danger)] border border-[var(--danger)]/30 font-medium"
            >
              {errorMsg}
            </div>
          )}

          {/* STEP 1: BUSINESS TYPE */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--text)]">
                  What type of shop do you operate?
                </h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  This sets up your default package sizes, units, and inventory tracking.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1">
                  Shop Name (optional)
                </label>
                <Input
                  placeholder="e.g. Mama Ngozi Provisions"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div
                  onClick={() => setBusinessType('retail')}
                  className={`cursor-pointer rounded-[var(--r-md)] border-2 p-4 transition-all ${
                    businessType === 'retail'
                      ? 'border-[var(--brand)] bg-[var(--brand-soft)]'
                      : 'border-[var(--border)] hover:border-[var(--text-muted)] bg-[var(--surface)]'
                  }`}
                >
                  <Store className="h-7 w-7 text-[var(--brand)] mb-2" />
                  <h3 className="font-display font-semibold text-base text-[var(--text)]">Retail Shop</h3>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Selling directly to consumers in pieces, sachets, packets, or cups.
                  </p>
                </div>

                <div
                  onClick={() => setBusinessType('wholesale')}
                  className={`cursor-pointer rounded-[var(--r-md)] border-2 p-4 transition-all ${
                    businessType === 'wholesale'
                      ? 'border-[var(--brand)] bg-[var(--brand-soft)]'
                      : 'border-[var(--border)] hover:border-[var(--text-muted)] bg-[var(--surface)]'
                  }`}
                >
                  <Package className="h-7 w-7 text-[var(--brand)] mb-2" />
                  <h3 className="font-display font-semibold text-base text-[var(--text)]">Wholesale / Depot</h3>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Selling in cartons, crates, sacks, or bulk cases to resellers.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-[var(--border)]">
                <Button onClick={() => setStep(2)} className="gap-2 font-semibold text-xs h-10 px-5">
                  Next: Select Categories <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: CATEGORIES */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--text)]">
                  What items do you sell?
                </h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Select the product categories that apply to your shop.
                </p>
              </div>

              <div className="space-y-2.5">
                {categoriesList.map((cat) => {
                  const isChecked = selectedCategories.includes(cat.id);
                  return (
                    <div
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className={`flex cursor-pointer items-center justify-between rounded-[var(--r-md)] border p-3.5 transition-all ${
                        isChecked
                          ? 'border-[var(--brand)] bg-[var(--brand-soft)]'
                          : 'border-[var(--border)] hover:bg-[var(--surface-2)] bg-[var(--surface)]'
                      }`}
                    >
                      <span className="font-medium text-xs text-[var(--text)]">{cat.label}</span>
                      <div
                        className={`flex h-4 w-4 items-center justify-center rounded-[var(--r-sm)] border ${
                          isChecked
                            ? 'border-[var(--brand)] bg-[var(--brand)] text-[var(--on-brand)]'
                            : 'border-[var(--border)] bg-[var(--surface)]'
                        }`}
                      >
                        {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                <Button variant="outline" onClick={() => setStep(1)} className="gap-2 text-xs h-10">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button
                  onClick={() => {
                    if (selectedCategories.length === 0) {
                      setErrorMsg('Please select at least one category.');
                      return;
                    }
                    setErrorMsg(null);
                    setStep(3);
                  }}
                  className="gap-2 font-semibold text-xs h-10 px-5"
                >
                  Next: Pick Items <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: ITEMS CHECKLIST */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--text)]">
                  Confirm your initial items
                </h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  We pre-selected common Nigerian shop items. Toggle items or add custom products.
                </p>
              </div>

              {/* Search */}
              <Input
                placeholder="Search catalog items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 text-xs bg-[var(--surface)]"
              />

              {/* Catalog List */}
              <div className="max-h-72 overflow-y-auto rounded-[var(--r-md)] border border-[var(--border)] divide-y divide-[var(--border)] bg-[var(--surface)]">
                {filteredCatalogItems.map((item) => {
                  const isChecked = selectedItems.has(item.name);
                  return (
                    <div
                      key={item.name}
                      onClick={() => toggleItem(item)}
                      className={`flex cursor-pointer items-center justify-between p-3 transition-colors ${
                        isChecked ? 'bg-[var(--brand-soft)]/50' : 'hover:bg-[var(--surface-2)]/50'
                      }`}
                    >
                      <div>
                        <div className="font-medium text-xs text-[var(--text)]">{item.name}</div>
                        <div className="text-[11px] text-[var(--text-muted)]">Unit: {item.unit}</div>
                      </div>
                      <div
                        className={`flex h-4 w-4 items-center justify-center rounded-[var(--r-sm)] border ${
                          isChecked
                            ? 'border-[var(--brand)] bg-[var(--brand)] text-[var(--on-brand)]'
                            : 'border-[var(--border)] bg-[var(--surface)]'
                        }`}
                      >
                        {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
                {filteredCatalogItems.length === 0 && (
                  <p className="p-6 text-center text-xs text-[var(--text-muted)]">No matching catalog items found.</p>
                )}
              </div>

              {/* Add Custom Item */}
              <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface-2)]/40 p-3.5 space-y-2">
                <h4 className="text-[11px] font-semibold text-[var(--text)] uppercase tracking-wider">
                  Add Custom Item
                </h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="Custom item name"
                    value={customItemName}
                    onChange={(e) => setCustomItemName(e.target.value)}
                    className="flex-1 h-9 text-xs"
                  />
                  <Input
                    placeholder="Unit (piece, bag...)"
                    value={customItemUnit}
                    onChange={(e) => setCustomItemUnit(e.target.value)}
                    className="w-28 h-9 text-xs"
                  />
                  <Button type="button" variant="outline" onClick={addCustomItem} className="gap-1 h-9 text-xs font-semibold">
                    <Plus className="h-3.5 w-3.5" /> Add
                  </Button>
                </div>
              </div>

              <div className="text-xs text-[var(--text-muted)] tabular-nums">
                <strong>{selectedItems.size}</strong> items selected. You can adjust prices and stock counts anytime.
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                <Button variant="outline" onClick={() => setStep(2)} className="gap-2 text-xs h-10">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button onClick={handleComplete} disabled={submitting} className="gap-2 font-semibold text-xs h-10 px-5">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Finish Setup & Open Shop
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
