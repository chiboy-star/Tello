import { test, expect } from '@playwright/test';

test.describe('Part 3: Getting Started Checklist Real State Transitions', () => {
  test('fresh user starts at 0/5, ticks update on actions without page reload, hides at 5/5', async ({ page }) => {
    test.setTimeout(90000);
    const timestamp = Date.now();
    const email = `checklist-user-${timestamp}@example.com`;
    const password = 'password123';

    // 1. Sign up fresh user without pre-filled items
    await page.goto('/signup');
    await page.locator('#brand-splash').waitFor({ state: 'hidden' }).catch(() => {});
    await page.fill('input[name="name"]', `Checklist Owner ${timestamp}`);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');

    // Onboarding step 1
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

    // Step 3: Finish setup and land on Home
    await page.click('button:has-text("Finish Setup & Open Shop")');
    await page.waitForURL(/.*home/, { timeout: 25000 });

    // Clean any onboarding items so user starts at 0/5
    await page.evaluate(async () => {
      const res = await fetch('/api/items');
      const data = await res.json();
      for (const item of (data.items || [])) {
        await fetch(`/api/items/${item.id}`, { method: 'DELETE' });
      }
      await (window as any).__REACT_QUERY_CLIENT__?.refetchQueries({ queryKey: ['dashboard'] });
      await (window as any).__REACT_QUERY_CLIENT__?.refetchQueries({ queryKey: ['checklist'] });
    });

    // Assert Checklist shows on Home
    const checklistCard = page.locator('section[aria-labelledby="checklist-heading"]');
    await expect(checklistCard).toBeVisible();

    // With 0 items, completed count should be 0/5
    const countText = checklistCard.locator('span.tabular-nums');
    await expect(countText).toHaveText('0/5');

    // 2. Add 5 items with user-defined prices via API
    await page.evaluate(async () => {
      for (let i = 1; i <= 5; i++) {
        await fetch('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `Checklist Item ${i}`,
            category: 'Beverages',
            unit: 'piece',
            startingQty: 10,
            sellPrice: 500, // Explicit user price (sell_price_source = 'user')
          }),
        });
      }
      await (window as any).__REACT_QUERY_CLIENT__?.refetchQueries({ queryKey: ['dashboard'] });
      await (window as any).__REACT_QUERY_CLIENT__?.refetchQueries({ queryKey: ['checklist'] });
    });

    // Both "Add at least 5 items" and "Review your prices" should now be ticked!
    // Completed count updates to 2/5 without manual page reload
    await expect(countText).toHaveText('2/5', { timeout: 10000 });

    // 3. Add a customer record via API
    await page.evaluate(async () => {
      await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Chinedu Okeke', phone: '08012345678' }),
      });
      await (window as any).__REACT_QUERY_CLIENT__?.refetchQueries({ queryKey: ['dashboard'] });
      await (window as any).__REACT_QUERY_CLIENT__?.refetchQueries({ queryKey: ['checklist'] });
    });

    // Completed count updates to 3/5
    await expect(countText).toHaveText('3/5', { timeout: 10000 });

    // 4. Log a sale via API
    await page.evaluate(async () => {
      const itemsRes = await fetch('/api/items');
      const { items } = await itemsRes.json();
      const itemId = items[0].id;

      await fetch('/api/entries/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: [
            {
              type: 'sale',
              itemId,
              quantity: 1,
              unitAmount: 500,
              paymentType: 'cash',
              source: 'tap',
            },
          ],
        }),
      });
      await (window as any).__REACT_QUERY_CLIENT__?.refetchQueries({ queryKey: ['dashboard'] });
      await (window as any).__REACT_QUERY_CLIENT__?.refetchQueries({ queryKey: ['checklist'] });
    });

    // Completed count updates to 4/5
    await expect(countText).toHaveText('4/5', { timeout: 10000 });

    // 5. Try voice or photo entry
    await page.evaluate(async () => {
      const itemsRes = await fetch('/api/items');
      const { items } = await itemsRes.json();
      const itemId = items[0].id;

      await fetch('/api/entries/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: [
            {
              type: 'sale',
              itemId,
              quantity: 1,
              unitAmount: 500,
              paymentType: 'cash',
              source: 'voice',
            },
          ],
        }),
      });
      await (window as any).__REACT_QUERY_CLIENT__?.refetchQueries({ queryKey: ['dashboard'] });
      await (window as any).__REACT_QUERY_CLIENT__?.refetchQueries({ queryKey: ['checklist'] });
    });

    // When 5/5 complete, checklist section disappears completely!
    await expect(checklistCard).toBeHidden({ timeout: 10000 });
  });
});
