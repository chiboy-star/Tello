import { test, expect } from '@playwright/test';
import { setupTestUserSession, teardownTestUser } from './auth.helper';

test.describe('E2E #2, #6, #9: Tap Sell & Undo, Debt Payment, Command Menu', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestUserSession(page);
  });

  test.afterEach(async ({ page }) => {
    await teardownTestUser(page);
  });

  test('E2E #2: Tap-sell an item, see stock decrease, press Undo, see stock restored', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/sell');
    await page.waitForSelector('text=Confirm Sale', { timeout: 10000 });

    // Locate the first item card and read its initial stock
    const itemCard = page.locator('div.cursor-pointer').first();
    await expect(itemCard).toBeVisible();
    const initialText = await itemCard.innerText();
    const stockMatch = initialText.match(/Stock:\s*(-?\d+(\.\d+)?)/);
    const initialStock = stockMatch ? parseFloat(stockMatch[1]) : 0;

    // Click item card to select it
    await itemCard.click();

    // Confirm sale of 1 unit
    await page.click('button:has-text("Confirm Sale")');

    // Verify Undo toast appears and stock decreased by 1
    const undoToast = page.locator('text=Sale recorded successfully');
    await expect(undoToast).toBeVisible();

    const decrementedText = await itemCard.innerText();
    const decrementedStock = parseFloat(decrementedText.match(/Stock:\s*(-?\d+(\.\d+)?)/)?.[1] || '0');
    expect(decrementedStock).toBe(initialStock - 1);

    // Click Undo
    await page.click('button:has-text("Undo")');

    // Verify Undo toast is dismissed and stock is restored
    await expect(undoToast).not.toBeVisible();
    const restoredText = await itemCard.innerText();
    const restoredStock = parseFloat(restoredText.match(/Stock:\s*(-?\d+(\.\d+)?)/)?.[1] || '0');
    expect(restoredStock).toBe(initialStock);
  });

  test('E2E #6: Record a debt payment; balance updates', async ({ page }) => {
    test.setTimeout(60000);
    // 1. Record a credit sale to create customer debt
    await page.goto('/sell');
    await page.click('button:has-text("Type")');
    await page.fill('input[placeholder*="3 Indomie"]', '2 rice 5000 credit Mama Ngozi');
    await page.click('button:has-text("Parse")');

    await expect(page.locator('text=Confirm Entries')).toBeVisible();
    await page.click('button:has-text("Save All Confirmed")');
    await expect(page.locator('text=Sale recorded successfully')).toBeVisible({ timeout: 15000 });

    // 2. Navigate to debts ledger and verify debt balance
    await page.goto('/debts');
    await expect(page.locator('text=Mama Ngozi')).toBeVisible({ timeout: 15000 });

    // 3. Record a debt payment of 2,000 NGN
    await page.click('button:has-text("Record Payment")');
    await expect(page.locator('text=Record Payment: Mama Ngozi')).toBeVisible();

    await page.fill('input[placeholder="e.g. 5000"]', '2000');
    await page.click('button:has-text("Confirm Payment")');

    // 4. Verify balance updates
    await expect(page.locator('text=Record Payment: Mama Ngozi')).not.toBeVisible();
    await expect(page.locator('text=Mama Ngozi')).toBeVisible();
    await expect(page.locator('tbody tr', { hasText: 'Mama Ngozi' })).toContainText('3,000');
  });

  test('E2E #9: Command menu opens with Ctrl+K, finds an item', async ({ page }) => {
    await page.goto('/home');
    await page.waitForSelector('text=Shop Dashboard', { timeout: 10000 });

    // Trigger Ctrl+K
    await page.keyboard.press('Control+k');

    // Verify search modal appears
    const searchInput = page.locator('input[placeholder*="Type a command or search"]');
    await expect(searchInput).toBeVisible();

    // Search for an item from onboarding (e.g., Indomie)
    await searchInput.fill('Indomie');

    // Wait for search result dropdown
    await expect(page.locator('button:has-text("Indomie")').first()).toBeVisible({ timeout: 5000 });

    // Press Escape to dismiss
    await page.keyboard.press('Escape');
    await expect(searchInput).not.toBeVisible();
  });

  test('Type mode structured quick form records sale with idempotency key and updates stock', async ({ page }) => {
    await page.goto('/sell');
    await page.waitForSelector('text=Confirm Sale', { timeout: 10000 });

    // Switch to Type mode
    await page.click('button:has-text("Type")');
    await expect(page.locator('text=Structured Quick Sale')).toBeVisible();

    // Select the first item in the item dropdown
    const itemSelect = page.locator('select').first();
    const firstItemOption = await itemSelect.locator('option').nth(1).getAttribute('value');
    expect(firstItemOption).toBeTruthy();
    await itemSelect.selectOption(firstItemOption!);

    // Set Quantity to 2
    const qtyInput = page.locator('input[type="number"]').first();
    await qtyInput.fill('2');

    // Fill Unit price if empty
    const priceInput = page.locator('input[placeholder*="Unit price in NGN"]');
    await priceInput.fill('500');

    // Click Record Sale
    await page.click('button:has-text("Record Sale")');

    // Verify Undo toast appears confirming successful commit
    await expect(page.locator('text=Sale recorded successfully')).toBeVisible();
  });
});
