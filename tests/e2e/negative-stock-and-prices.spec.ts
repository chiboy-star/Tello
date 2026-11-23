import { test, expect } from '@playwright/test';
import { setupTestUserSession } from './auth.helper';

test.describe('Part 5: Stock Guard and Price Tier Estimates', () => {
  test('0-stock item shows Out badge with Add stock button, prevents negative sell, and shows price tiers', async ({ page }) => {
    test.setTimeout(90000);
    await setupTestUserSession(page);

    // 1. Create an item with currentQty = 0 and estimated price (named 000-Beans so it's in top 4 quick-sell items)
    const uniqueName = `000 Beans ${Date.now()}`;
    const createRes = await page.evaluate(async (name) => {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          unit: 'derica',
          category: 'food',
          startingQty: 0,
          sellPrice: 1500,
          sellPriceSource: 'estimate',
        }),
      });
      return res.status;
    }, uniqueName);

    expect(createRes).toBe(200);

    // 2. Open /home and verify "est." marker is displayed
    await page.goto('/home');
    await page.waitForSelector('h1:has-text("Good ")', { timeout: 15000 });

    const itemTile = page.locator(`div:has-text("${uniqueName}")`).filter({ has: page.locator('text=Out') }).first();
    await expect(itemTile).toBeVisible({ timeout: 10000 });

    // Assert "est." marker appears on the tile
    const estMarker = itemTile.getByText('est.', { exact: true }).first();
    await expect(estMarker).toBeVisible({ timeout: 5000 });

    // 3. 0-stock quick-sell tile is disabled: contains "Out" badge and amber outline "Add stock" button
    const addStockBtn = itemTile.locator('a:has-text("Add stock")').first();
    await expect(addStockBtn).toBeVisible({ timeout: 5000 });
    await expect(addStockBtn).toHaveAttribute('href', /stock.*action=adjust/);

    // 4. Verify stock cannot go below zero via API
    const negativeRes = await page.evaluate(async (name) => {
      // Find item id
      const itemsRes = await fetch('/api/items');
      const itemsData = await itemsRes.json();
      const targetItem = (itemsData.items || itemsData).find((i: any) => i.name === name);
      if (!targetItem) return { status: 404 };

      const commitRes = await fetch('/api/entries/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: [{
            type: 'sale',
            itemId: targetItem.id,
            quantity: 5,
            unitAmount: 1500,
            paymentType: 'cash',
          }]
        }),
      });
      return { status: commitRes.status, body: await commitRes.json() };
    }, uniqueName);

    expect(negativeRes.status).toBe(400);
    expect(negativeRes.body?.code).toBe('INSUFFICIENT_STOCK');

    // 5. Navigate to /stock/prices and verify confidence tiers are displayed
    await page.goto('/stock/prices');
    await page.waitForSelector('h1', { timeout: 15000 });
    const tierText = page.locator('text=/Rough estimate|Market estimate|Verified price/').first();
    await expect(tierText).toBeVisible({ timeout: 10000 });
  });
});
