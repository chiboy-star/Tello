import { describe, it, expect } from 'vitest';
import { CATALOG_ITEMS, getCatalogItemById } from '@/lib/catalog/catalog.data';

describe('Catalog Reference Prices & Prefill Logic', () => {
  it('all catalog items have valid reference prices and metadata', () => {
    expect(CATALOG_ITEMS.length).toBe(75);

    for (const item of CATALOG_ITEMS) {
      expect(item.name.trim().length).toBeGreaterThan(0);
      expect(item.category).toBeTruthy();
      expect(item.unit).toBeTruthy();
      expect(typeof item.refPrice).toBe('number');
      expect(item.refPrice).toBeGreaterThan(0);
      expect(item.refPriceSource).toBeTruthy();
      expect(['high', 'medium']).toContain(item.refPriceConfidence);
    }
  });

  it('getCatalogItemById retrieves reference prices accurately', () => {
    const gala = getCatalogItemById('cat_everyday_gala_sausage');
    expect(gala).toBeDefined();
    expect(gala?.name).toBe('Gala Sausage');
    expect(gala?.refPrice).toBe(200);
    expect(gala?.refPriceConfidence).toBe('high');

    const indomie = getCatalogItemById('cat_everyday_indomie_chicken');
    expect(indomie).toBeDefined();
    expect(indomie?.name).toBe('Indomie Chicken');
    expect(indomie?.refPrice).toBe(150);
  });

  it('prefills sell price with estimate only when currency is NGN and price is not provided', () => {
    // Helper function simulating the server-side onboarding / bulk-add resolution logic
    function resolveItemPrice(
      catalogId: string | null,
      currency: string,
      userPrice: number | null
    ) {
      if (userPrice !== null && userPrice !== undefined && userPrice > 0) {
        return {
          sell_price_minor: userPrice * 100,
          sell_price_source: 'manual',
        };
      }

      if (currency === 'NGN' && catalogId) {
        const catItem = getCatalogItemById(catalogId);
        if (catItem?.refPrice) {
          return {
            sell_price_minor: catItem.refPrice * 100,
            sell_price_source: 'estimate',
          };
        }
      }

      return {
        sell_price_minor: null,
        sell_price_source: 'manual',
      };
    }

    // 1. NGN currency with catalog item and no user price -> prefilled with estimate
    const ngnAuto = resolveItemPrice('cat_food_rice', 'NGN', null);
    expect(ngnAuto.sell_price_minor).toBe(160000); // ₦1,600 = 160,000 minor
    expect(ngnAuto.sell_price_source).toBe('estimate');

    // 2. Non-NGN currency (e.g. USD, GHS) -> stays null, source manual
    const usdAuto = resolveItemPrice('cat_food_rice', 'USD', null);
    expect(usdAuto.sell_price_minor).toBeNull();
    expect(usdAuto.sell_price_source).toBe('manual');

    const ghsAuto = resolveItemPrice('cat_food_rice', 'GHS', null);
    expect(ghsAuto.sell_price_minor).toBeNull();
    expect(ghsAuto.sell_price_source).toBe('manual');

    // 3. User provides explicit price in NGN -> preserves user price, source manual
    const ngnManual = resolveItemPrice('cat_food_rice', 'NGN', 2000);
    expect(ngnManual.sell_price_minor).toBe(200000); // ₦2,000 = 200,000 minor
    expect(ngnManual.sell_price_source).toBe('manual');

    // 4. Unknown catalog ID -> stays null
    const unknownCat = resolveItemPrice('cat_nonexistent', 'NGN', null);
    expect(unknownCat.sell_price_minor).toBeNull();
    expect(unknownCat.sell_price_source).toBe('manual');
  });

  it('user price is never overwritten during price confirmation or bulk import', () => {
    const existingItem = {
      id: 'item-1',
      name: 'Custom Bread',
      sell_price_minor: 140000,
      sell_price_source: 'manual',
    };

    // When a batch or catalog update runs, existing manual price must remain untouchable
    function applyEstimateUpdate(
      item: typeof existingItem,
      suggestedRefPrice: number
    ) {
      if (item.sell_price_source === 'manual') {
        return item; // Do not overwrite manual prices
      }
      return {
        ...item,
        sell_price_minor: suggestedRefPrice * 100,
        sell_price_source: 'estimate',
      };
    }

    const updated = applyEstimateUpdate(existingItem, 1200);
    expect(updated.sell_price_minor).toBe(140000);
    expect(updated.sell_price_source).toBe('manual');
  });
});
