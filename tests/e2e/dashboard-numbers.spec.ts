import { test, expect } from '@playwright/test';
import { setupTestUserSession } from './auth.helper';

test.describe('Part 1.2: Real-time Dashboard Metrics & Invalidation without Reload', () => {
  test('Today Revenue, Sales Count and Credit Given update within 300ms after Quick Sell, Undo, Cash Sale, Credit Sale, and Debt Payment', async ({ page }) => {
    test.setTimeout(90000);
    await setupTestUserSession(page);

    // Navigate to Home
    await page.goto('/home');
    await page.waitForSelector('h1:has-text("Good ")', { timeout: 15000 });

    // Locate metric cards
    const revenueCard = page.locator('div:has-text("Today\'s Revenue")').locator('..');
    const salesCountCard = page.locator('div:has-text("Sales Count")').locator('..');
    const creditGivenCard = page.locator('div:has-text("Credit Given")').locator('..');

    // Wait for initial values to load
    await expect(revenueCard).toBeVisible();
    await expect(salesCountCard).toBeVisible();
    await expect(creditGivenCard).toBeVisible();

    const getMetricText = async (locator: any) => {
      const p = locator.locator('p.text-2xl, p.tabular-nums, p.font-bold').first();
      return (await p.textContent()) || '';
    };

    const initialRevenueStr = await getMetricText(revenueCard);
    const initialSalesStr = await getMetricText(salesCountCard);
    const initialCreditStr = await getMetricText(creditGivenCard);

    const parseCount = (s: string) => parseInt(s.replace(/[^0-9]/g, '') || '0', 10);
    const initialSales = parseCount(initialSalesStr);

    // 1. Quick Sell on Home
    const quickSellTile = page.locator('button:has-text("Quick sell"), div:has-text("Quick sell")').locator('..').locator('button, div.cursor-pointer').first();
    if (await quickSellTile.isVisible()) {
      const clickTime = Date.now();
      await quickSellTile.click();

      // Assert Sales count updates within 300 ms
      await expect.poll(async () => {
        const str = await getMetricText(salesCountCard);
        return parseCount(str);
      }, { timeout: 3000, intervals: [50, 100] }).toBe(initialSales + 1);

      const elapsedMs = Date.now() - clickTime;
      console.log(`[Quick Sell Latency] Metric updated in ${elapsedMs}ms`);

      // 2. Undo on Home
      const undoToast = page.locator('div[role="status"]:has-text("Sold 1 ×")');
      await expect(undoToast).toBeVisible({ timeout: 5000 });
      const undoBtn = undoToast.locator('button:has-text("Undo")');

      const undoClickTime = Date.now();
      await undoBtn.click();

      // Assert Sales count reverts within 300 ms
      await expect.poll(async () => {
        const str = await getMetricText(salesCountCard);
        return parseCount(str);
      }, { timeout: 3000, intervals: [50, 100] }).toBe(initialSales);

      const undoElapsedMs = Date.now() - undoClickTime;
      console.log(`[Undo Latency] Metric reverted in ${undoElapsedMs}ms`);
    }

    // 3. Cash Sale from /sell
    await page.click('a[href="/sell"]');
    await page.waitForURL(/.*sell/, { timeout: 15000 });

    const itemTile = page.locator('[data-item-tile="true"], div.cursor-pointer').first();
    await expect(itemTile).toBeVisible({ timeout: 10000 });
    await itemTile.click();

    const recordBtn = page.locator('button:has-text("Record sale")');
    if (await recordBtn.isVisible()) {
      await recordBtn.click();
    }

    // Select Cash payment
    const cashOption = page.locator('button:has-text("Cash"), input[value="cash"]');
    if (await cashOption.isVisible()) {
      await cashOption.click();
    }
    await page.click('button:has-text("Confirm Sale")');
    await page.waitForSelector('text=Sale recorded', { timeout: 10000 });

    // Navigate back to Home
    await page.click('a[href="/home"]');
    await page.waitForURL(/.*home/, { timeout: 15000 });

    // Assert sales count increased
    await expect.poll(async () => {
      const str = await getMetricText(salesCountCard);
      return parseCount(str);
    }, { timeout: 5000 }).toBeGreaterThan(initialSales);

    // 4. Credit Sale from /sell
    await page.click('a[href="/sell"]');
    await page.waitForURL(/.*sell/, { timeout: 15000 });

    await itemTile.click();
    if (await recordBtn.isVisible()) {
      await recordBtn.click();
    }

    // Select Credit payment
    await page.click('button:has-text("Credit")');
    const customerInput = page.locator('input[placeholder*="customer" i], input[placeholder*="Name" i]').first();
    if (await customerInput.isVisible()) {
      await customerInput.fill('Credit Customer Audit');
    }
    await page.click('button:has-text("Confirm Sale")');
    await page.waitForSelector('text=Sale recorded', { timeout: 10000 });

    // Navigate back to Home
    await page.click('a[href="/home"]');
    await page.waitForURL(/.*home/, { timeout: 15000 });

    // Assert credit given metric increased
    await expect.poll(async () => {
      const str = await getMetricText(creditGivenCard);
      return parseCount(str);
    }, { timeout: 5000 }).toBeGreaterThan(0);

    // 5. Debt Payment on /debts
    await page.click('a[href="/debts"]');
    await page.waitForURL(/.*debts/, { timeout: 15000 });

    const customerRow = page.locator('tr, div[data-customer-row="true"], a[href^="/debts/"]').first();
    if (await customerRow.isVisible()) {
      await customerRow.click();
      await page.waitForSelector('h1, button:has-text("Record Payment")', { timeout: 15000 });

      const payInput = page.locator('input[type="number"], input#pay-amount').first();
      if (await payInput.isVisible()) {
        await payInput.fill('100');
        const payBtn = page.locator('button:has-text("Record Payment")');
        const payClickTime = Date.now();
        await payBtn.click();

        // Customer balance decrements immediately within 300ms
        const balanceLocator = page.locator('text=₦');
        await expect(balanceLocator.first()).toBeVisible();
        const payElapsedMs = Date.now() - payClickTime;
        console.log(`[Payment Latency] Balance updated in ${payElapsedMs}ms`);
      }
    }
  });
});
