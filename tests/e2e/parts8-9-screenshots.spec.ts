import { test } from '@playwright/test';
import { setupTestUserSession } from './auth.helper';
import path from 'node:path';

test.describe('Parts 8 and 9 Visual Verification Screenshots', () => {
  test('capture Adjust Stock dialog, Activity list, Per-item history, Purchase drawer, and Purchases list at 390px and 1280px', async ({ browser }) => {
    test.setTimeout(120000);
    const screenshotDir = path.join(process.cwd(), 'tests', 'screenshots');

    const authContext = await browser.newContext();
    const authPage = await authContext.newPage();
    await setupTestUserSession(authPage);
    const storageState = await authContext.storageState();
    await authContext.close();

    const viewports = [
      { name: '390px', width: 390, height: 844 },
      { name: '1280px', width: 1280, height: 800 },
    ];

    for (const vp of viewports) {
      const context = await browser.newContext({
        storageState,
        viewport: { width: vp.width, height: vp.height },
      });
      const page = await context.newPage();

      // 1. Get first item ID
      await page.goto('/stock');
      await page.waitForSelector('text=Stock & Inventory', { timeout: 15000 });
      const firstItemRow = page.locator('div[data-item-card="true"], tr, a[href^="/stock/"]').first();
      await firstItemRow.waitFor({ state: 'visible', timeout: 10000 });

      // Read an itemId from the page or API
      const itemId = await page.evaluate(async () => {
        const res = await fetch('/api/items');
        const data = await res.json();
        return data.items?.[0]?.id || '';
      });

      // 2. Adjust Stock Dialog with reason chips and before/after line
      await page.goto(`/stock?action=adjust&itemId=${itemId}`);
      const adjustModal = page.locator('div[role="dialog"]:has-text("Adjust Stock")');
      await adjustModal.waitFor({ state: 'visible', timeout: 10000 });
      // Set new quantity to trigger before/after line preview
      const qtyInput = adjustModal.locator('input[type="number"]');
      if (await qtyInput.isVisible()) {
        await qtyInput.fill('8');
      }
      await page.waitForTimeout(300);
      await page.screenshot({
        path: path.join(screenshotDir, `adjust-stock-dialog-${vp.name}.png`),
      });

      // Close dialog
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      // 3. Activity List
      await page.goto('/stock?tab=activity');
      await page.waitForSelector('text=Stock & Inventory', { timeout: 15000 });
      await page.waitForTimeout(400);
      await page.screenshot({
        path: path.join(screenshotDir, `activity-list-${vp.name}.png`),
      });

      // 4. Purchases List
      await page.goto('/stock?tab=purchases');
      await page.waitForSelector('text=Stock & Inventory', { timeout: 15000 });
      await page.waitForTimeout(400);
      await page.screenshot({
        path: path.join(screenshotDir, `purchases-list-${vp.name}.png`),
      });

      // 5. Purchase Drawer with live conversion
      await page.click('button:has-text("Record Purchase"), button:has-text("Restock")');
      const purchaseDrawer = page.locator('div[role="dialog"]:has-text("Record Purchase"), div[role="dialog"]:has-text("Restock")');
      await purchaseDrawer.waitFor({ state: 'visible', timeout: 10000 });
      // Fill pack count and units per pack to show conversion
      const packCountInput = purchaseDrawer.locator('input#pack-count, input[name="packCount"]').first();
      if (await packCountInput.isVisible()) {
        await packCountInput.fill('5');
      }
      await page.waitForTimeout(400);
      await page.screenshot({
        path: path.join(screenshotDir, `purchase-drawer-${vp.name}.png`),
      });

      // Close drawer
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      // 6. Per-Item History
      if (itemId) {
        await page.goto(`/stock/${itemId}`);
        await page.waitForSelector('h1', { timeout: 15000 });
        await page.waitForTimeout(400);
        await page.screenshot({
          path: path.join(screenshotDir, `per-item-history-${vp.name}.png`),
        });
      }

      await context.close();
    }
  });
});
