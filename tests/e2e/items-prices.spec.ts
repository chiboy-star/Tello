import { test, expect } from '@playwright/test';
import { setupTestUserSession, teardownTestUser } from './auth.helper';

test.describe('Part 4 & 5: Item Addition, Catalog & Estimated Prices', () => {
  test.setTimeout(90000);

  test('full items and price workflow: custom item, catalog bulk, duplicates, undo, price sheet and review screen', async ({
    page,
  }) => {
    // 1. Setup authenticated test user session
    await setupTestUserSession(page);
    const uniqueItemName = `A1 Golden Loaf ${Date.now().toString().slice(-4)}`;

    // 2. Open /stock and verify Add Item opens the Vaul Drawer
    await page.goto('/stock');
    await page.waitForSelector('h1:has-text("Stock")');

    // Click "Add Item" button
    await page.click('button:has-text("Add Item")');
    const drawer = page.locator('[role="dialog"]:has-text("Add Items")');
    await expect(drawer).toBeVisible();

    // 3. Switch to "Custom item" tab and create a custom item
    await drawer.locator('button:has-text("Custom item")').click();
    await drawer.locator('input[placeholder*="Sugar"]').fill(uniqueItemName);
    
    // Select unit 'loaf'
    await drawer.locator('button:has-text("loaf")').click();
    
    // Fill selling price, cost price, and opening stock
    await drawer.locator('input[placeholder="0.00"]').fill('1500');
    await drawer.locator('input[placeholder="Optional"]').fill('1200');
    await drawer.locator('input[placeholder*="starts empty"]').fill('20');

    // Submit custom item
    await drawer.locator('button:has-text("Save Custom Item")').click();

    // Verify Undo toast appears (give 15s for remote DB commit)
    const undoToast = page.locator('text=added · Undo');
    await expect(undoToast).toBeVisible({ timeout: 15000 });

    // Verify item appears in Stock list
    await expect(page.locator('table').locator(`text=${uniqueItemName}`)).toBeVisible({ timeout: 15000 });

    // 4. Verify custom item appears on /sell Tap grid
    await page.goto('/sell');
    await page.waitForSelector('h1:has-text("Record Sale")');
    await expect(page.locator(`div[class*="cursor-pointer"]:has-text("${uniqueItemName}")`)).toBeVisible({ timeout: 15000 });

    // 5. Test Duplicate Prevention (409 DUPLICATE_ITEM)
    // Open drawer via + Add item tile on Sell page
    await page.click('text=+ Add item');
    await expect(drawer).toBeVisible();
    await drawer.locator('button:has-text("Custom item")').click();
    await drawer.locator('input[placeholder*="Sugar"]').fill(uniqueItemName);
    await drawer.locator('button:has-text("Save Custom Item")').click();

    // Assert duplicate error message
    await expect(drawer.locator('text=You already have')).toBeVisible({ timeout: 10000 });
    await page.keyboard.press('Escape');

    // 6. Test Catalog Items Bulk Add
    await page.goto('/stock');
    await page.click('button:has-text("Add Item")');
    await expect(drawer).toBeVisible();

    // Under "From catalog" tab, select first available catalog item with Est. price
    const catalogCards = drawer.locator('div[class*="cursor-pointer"]:has-text("Est. price")');
    const count = await catalogCards.count();
    if (count > 0) {
      await catalogCards.first().click();
      const addBtn = drawer.locator('button:has-text("Add 1 Item")');
      await addBtn.click();
      await expect(page.locator('text=added · Undo')).toBeVisible({ timeout: 15000 });
    }

    // 7. Test Price Review Screen (/stock/prices)
    await page.goto('/stock/prices');
    await page.waitForSelector('main h1');

    // Confirm all button should be visible if estimates exist
    const confirmAllBtn = page.locator('button:has-text("Confirm all as your prices")');
    if (await confirmAllBtn.isVisible()) {
      await confirmAllBtn.click();
      // Count should drop to 0 and heading should show all prices confirmed
      await expect(page.locator('h1:has-text("All prices confirmed")')).toBeVisible({ timeout: 15000 });
    }

    // 8. Test Teardown
    await teardownTestUser(page);
  });
});
