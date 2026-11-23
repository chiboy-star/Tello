import { test, expect } from '@playwright/test';
import { setupTestUserSession } from './auth.helper';

test.describe('Part 5: Negative Stock Warning and Price Tier Estimates', () => {
  test('negative stock warning shows on Sell and Home, allows Sell anyway, and shows Fix stock badge', async ({ page }) => {
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
    await page.waitForSelector('h1:has-text("Shop Dashboard")', { timeout: 15000 });

    const itemTile = page.locator(`button:has-text("${uniqueName}")`).first();
    await expect(itemTile).toBeVisible({ timeout: 10000 });

    // Assert "est." marker appears on the tile
    const estMarker = itemTile.getByText('est.', { exact: true });
    await expect(estMarker).toBeVisible({ timeout: 5000 });

    // 3. Tap quick-sell item with 0 stock -> should show Stock Warning modal
    await itemTile.click();
    const warningModal = page.locator('div[role="dialog"]:has-text("Stock Warning")');
    await expect(warningModal).toBeVisible({ timeout: 5000 });
    await expect(warningModal).toContainText('left in stock');
    await expect(warningModal).toContainText('Logging this sale will take your stock into negative count');

    // Cancel first
    await warningModal.locator('button:has-text("Cancel")').click();
    await expect(warningModal).not.toBeVisible();

    // Click again and confirm "Sell anyway"
    await itemTile.click();
    await expect(warningModal).toBeVisible();
    await warningModal.locator('button:has-text("Sell anyway")').click();
    await expect(warningModal).not.toBeVisible();

    // 4. Verify "Fix stock" badge appears on Running Low section on Home
    const fixStockBadge = page.locator('a:has-text("Fix stock")').first();
    await expect(fixStockBadge).toBeVisible({ timeout: 10000 });
    await expect(fixStockBadge).toHaveAttribute('href', '/stock');

    // 5. Navigate to /stock/prices and verify confidence tiers are displayed
    await page.goto('/stock/prices');
    await page.waitForSelector('h1', { timeout: 15000 });
    const tierText = page.locator('text=/Rough estimate|Market estimate|Verified price/').first();
    await expect(tierText).toBeVisible({ timeout: 10000 });
  });
});
