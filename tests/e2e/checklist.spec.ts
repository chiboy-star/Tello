import { test, expect } from '@playwright/test';

test.describe('Part 3: Getting Started Checklist Real State Transitions (Pure UI)', () => {
  test('fresh user starts at 0/5, ticks update on actions without page reload, hides at 5/5', async ({ page }) => {
    test.setTimeout(120000);
    const timestamp = Date.now();
    const email = `checklist-ui-${timestamp}@example.com`;
    const password = 'password123';

    // 1. Sign up fresh user through UI
    await page.goto('/signup');
    await page.locator('#brand-splash').waitFor({ state: 'hidden' }).catch(() => {});
    await page.fill('input[name="name"]', `Checklist Owner ${timestamp}`);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');

    // Onboarding step 1: Business type
    await page.waitForURL(/.*onboarding/, { timeout: 20000 });
    await page.click('text=Retail Shop');
    await page.click('button:has-text("Next: Select Categories")');

    // Onboarding step 2: Uncheck preselected categories so user starts with 0 items
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    for (let i = 0; i < count; i++) {
      if (await checkboxes.nth(i).isChecked()) {
        await checkboxes.nth(i).uncheck();
      }
    }
    await page.click('button:has-text("Next: Pick Items")');

    // Step 3: Finish setup and land on Home with 0 items
    await page.click('button:has-text("Finish Setup & Open Shop")');
    await page.waitForURL(/.*home/, { timeout: 25000 });

    // Assert Checklist card is visible on Home and tabular-nums is 0/5
    const checklistCard = page.locator('section[aria-labelledby="checklist-heading"]');
    await expect(checklistCard).toBeVisible();
    const countText = checklistCard.locator('span.tabular-nums');
    await expect(countText).toHaveText('0/5');

    // 2. Add 5 items with user-defined prices through the UI Add Item Drawer
    // Click the "Add at least 5 items" action inside the checklist
    await checklistCard.locator('button:has-text("Add at least 5 items")').click();

    // The Add Item Drawer opens
    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible();

    // Add 5 items via Custom tab with user prices
    await drawer.locator('button:has-text("Custom Item")').click();

    for (let i = 1; i <= 5; i++) {
      await drawer.locator('input#custom-item-name').fill(`Checklist Item ${i}`);
      await drawer.locator('input#custom-item-price').fill('500');
      await drawer.locator('input#custom-item-stock').fill('20');
      await drawer.locator('button:has-text("Add to Inventory")').click();

      if (i < 5) {
        // Re-open drawer for next custom item
        await page.click('button:has-text("Add Item")');
        await expect(drawer).toBeVisible();
        await drawer.locator('button:has-text("Custom Item")').click();
      }
    }

    // Both "Add at least 5 items" and "Review your prices" are now completed!
    // Assert completed count updates to 2/5 on Home automatically without reload
    await expect(countText).toHaveText('2/5', { timeout: 10000 });

    // 3. Add a customer record through the UI
    await checklistCard.locator('a:has-text("Add a customer record")').click();
    await page.waitForURL(/.*debts/, { timeout: 15000 });

    await page.click('button:has-text("Add Customer")');
    await page.fill('input#customer-name', 'Chinedu Okeke');
    await page.fill('input#customer-phone', '08012345678');
    await page.click('button:has-text("Save Customer")');

    // Navigate back to Home via bottom navigation
    await page.click('a[href="/home"]');
    await page.waitForURL(/.*home/, { timeout: 15000 });

    // Assert completed count updates to 3/5 automatically
    await expect(countText).toHaveText('3/5', { timeout: 10000 });

    // 4. Log a sale through the Sell UI
    await checklistCard.locator('a:has-text("Log your first sale")').click();
    await page.waitForURL(/.*sell/, { timeout: 15000 });

    // Tap first available item
    const itemTile = page.locator('[data-item-tile="true"], div.cursor-pointer').first();
    await expect(itemTile).toBeVisible();
    await itemTile.click();

    // If multi-select summary bar is present, click "Record sale"
    const recordBtn = page.locator('button:has-text("Record sale")');
    if (await recordBtn.isVisible()) {
      await recordBtn.click();
    }
    await page.click('button:has-text("Confirm Sale")');

    // Navigate back to Home via bottom nav
    await page.click('a[href="/home"]');
    await page.waitForURL(/.*home/, { timeout: 15000 });

    // Assert completed count updates to 4/5 automatically
    await expect(countText).toHaveText('4/5', { timeout: 10000 });

    // 5. Try voice or photo entry (Type mode on Sell UI)
    await checklistCard.locator('a:has-text("Try voice or photo entry")').click();
    await page.waitForURL(/.*sell/, { timeout: 15000 });

    // Click "Type" mode tab
    await page.click('button:has-text("Type")');
    await page.fill('textarea', 'sold 1 Checklist Item 1 500');
    await page.click('button:has-text("Parse")');

    await expect(page.locator('text=Confirm Entries')).toBeVisible({ timeout: 20000 });
    await page.click('button:has-text("Save All Confirmed")');
    await expect(page.locator('text=Sale recorded successfully')).toBeVisible({ timeout: 20000 });

    // Navigate back to Home via bottom nav
    await page.click('a[href="/home"]');
    await page.waitForURL(/.*home/, { timeout: 15000 });

    // When 5/5 complete, checklist section disappears completely from Home
    await expect(checklistCard).toBeHidden({ timeout: 10000 });
  });
});
