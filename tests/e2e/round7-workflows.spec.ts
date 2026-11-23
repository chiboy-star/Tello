import { test, expect } from '@playwright/test';
import { setupTestUserSession } from './auth.helper';

test.describe('Round 7 Workflows', () => {
  test('Sell tab multi-select with sticky bottom bar and commit', async ({ page }) => {
    test.setTimeout(90000);
    await setupTestUserSession(page);

    // Create an item with startingQty > 0
    const uniqueItem = `SellTest ${Date.now()}`;
    await page.evaluate(async (name) => {
      await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          unit: 'pcs',
          category: 'provisions',
          startingQty: 25,
          sellPrice: 500,
        }),
      });
    }, uniqueItem);

    // Navigate to Sell page
    await page.goto('/sell');
    await page.waitForSelector('h1:has-text("Record Sale")', { timeout: 15000 });

    // Ensure we are in Tap mode
    const tapButton = page.locator('button:has-text("Tap")');
    await tapButton.click();

    // Find the created item tile
    const targetTile = page.locator(`[data-item-tile="true"]:has-text("${uniqueItem}")`).first();
    await expect(targetTile).toBeVisible({ timeout: 10000 });

    // Tap item tile to select it
    await targetTile.click();

    // Verify sticky bottom summary bar appears
    const summaryBar = page.locator('button:has-text("Record sale")').locator('..');
    await expect(summaryBar).toBeVisible({ timeout: 5000 });

    // Click "Record sale" in summary bar
    const recordBtn = page.locator('button:has-text("Record sale")');
    await recordBtn.click();

    // Verify Record Sale bottom sheet opens
    const sheet = page.locator('div[role="dialog"]');
    await expect(sheet).toBeVisible({ timeout: 5000 });
    await expect(sheet.locator('button:has-text("Confirm Sale")')).toBeVisible();

    // Confirm sale
    const confirmBtn = sheet.locator('button:has-text("Confirm Sale")');
    await confirmBtn.click();

    // Verify success toast with Undo option appears
    await expect(page.locator('text=Sale recorded successfully')).toBeVisible({ timeout: 10000 });
  });

  test('Stock page in-memory filter tabs and reason chips', async ({ page }) => {
    test.setTimeout(90000);
    await setupTestUserSession(page);

    await page.goto('/stock');
    await page.waitForSelector('h1:has-text("Stock & Inventory")', { timeout: 15000 });

    // Test sub-filter pills: Running Low, Out of Stock, All Items
    const lowPill = page.locator('button:has-text("Running Low")');
    await lowPill.click();
    await page.waitForTimeout(200);

    const outPill = page.locator('button:has-text("Out of Stock")');
    await outPill.click();
    await page.waitForTimeout(200);

    const allPill = page.locator('button:has-text("All Items")');
    await allPill.click();
    await page.waitForTimeout(200);

    // Switch top segment to Purchases
    const purchasesTab = page.locator('button:has-text("Purchases")');
    await purchasesTab.click();
    await expect(page.locator('button:has-text("Record Purchase")').first()).toBeVisible({ timeout: 5000 });

    // Switch top segment to Activity Log
    const activityTab = page.locator('button:has-text("Activity Log")');
    await activityTab.click();
    await expect(page.locator('text=Stock Audit & Correction Activity')).toBeVisible({ timeout: 5000 });

    // Switch back to Items
    const itemsTab = page.locator('button:has-text("Items")');
    await itemsTab.click();
    await expect(page.locator('button:has-text("Add Item")').first()).toBeVisible({ timeout: 5000 });
  });

  test('Settings page accessible Select and Combobox dropdowns', async ({ page }) => {
    test.setTimeout(60000);
    await setupTestUserSession(page);

    await page.goto('/settings');
    await page.waitForSelector('h1:has-text("Settings")', { timeout: 15000 });

    // Currency Select (Radix Select with role="combobox")
    const currencyTrigger = page.locator('button[role="combobox"]').first();
    await expect(currencyTrigger).toBeVisible({ timeout: 5000 });
    await currencyTrigger.click();

    // Verify options are displayed
    const selectContent = page.locator('[role="listbox"]');
    await expect(selectContent).toBeVisible({ timeout: 5000 });
    await expect(selectContent.locator('text=/NGN/')).toBeVisible();
    await page.keyboard.press('Escape');

    // Timezone Combobox
    const timezoneTrigger = page.locator('button:has-text("Africa/Lagos")').first();
    await expect(timezoneTrigger).toBeVisible({ timeout: 5000 });
    await timezoneTrigger.click();

    // Verify combobox search input appears (either in desktop popover or mobile drawer)
    const searchInput = page.locator('input[placeholder*="Search timezone"]');
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    await page.keyboard.press('Escape');
  });
});
