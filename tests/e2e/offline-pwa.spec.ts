import { test, expect } from '@playwright/test';
import { setupTestUserSession, teardownTestUser } from './auth.helper';

test.describe('E2E #8 & #11: PWA Service Worker & Offline Queue', () => {
  test('PWA manifest is valid and accessible', async ({ request }) => {
    const res = await request.get('/manifest.webmanifest');
    expect(res.ok()).toBeTruthy();
    const manifest = await res.json();
    expect(manifest.name).toBe('Tallo');
    expect(manifest.short_name).toBe('Tallo');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/home');
  });

  test('offline fallback page renders cleanly', async ({ page }) => {
    await page.goto('/offline');
    await expect(page.getByRole('heading', { name: 'You are offline' })).toBeVisible();
  });

  test('E2E #8: Authenticated tap-sell while offline queues, shows "1 waiting to sync", and flushes once online with no duplicates', async ({ page }) => {
    test.setTimeout(60000);
    await setupTestUserSession(page);

    try {
      await page.goto('/sell');
      await page.waitForSelector('h1:has-text("Record Sale")', { timeout: 10000 });

      // Count initial entries before the offline sale
      const initialEntries = await page.evaluate(async () => {
        const res = await fetch('/api/entries');
        const data = await res.json();
        return data.entries || [];
      });
      const initialCount = initialEntries.length;

      // 1. Simulate going offline
      await page.context().setOffline(true);

      // 2. Tap-sell an item
      const itemCard = page.locator('div.cursor-pointer, [data-item-tile="true"]').first();
      await expect(itemCard).toBeVisible();
      await itemCard.click();

      // If multi-select summary bar is present, click "Record sale" first
      const recordSummaryBtn = page.locator('button:has-text("Record sale")');
      if (await recordSummaryBtn.isVisible()) {
        await recordSummaryBtn.click();
      }

      await page.click('button:has-text("Confirm Sale")');

      // 3. Assert top banner displays "1 waiting to sync"
      const syncBanner = page.locator('text=1 waiting to sync');
      await expect(syncBanner).toBeVisible({ timeout: 5000 });

      // 4. Restore online connection
      await page.context().setOffline(false);
      await page.evaluate(() => {
        window.dispatchEvent(new Event('online'));
      });

      // Trigger sync or wait for auto-flush
      const syncNowButton = page.locator('button:has-text("Sync Now")');
      await syncNowButton.click({ timeout: 3000 }).catch(() => {});

      // Banner should disappear after flush
      await expect(syncBanner).not.toBeVisible({ timeout: 15000 });

      // 5. Query /api/entries to verify exactly one new entry was saved and no duplicate batch
      const updatedEntries = await page.evaluate(async () => {
        const res = await fetch('/api/entries');
        const data = await res.json();
        return data.entries || [];
      });

      expect(updatedEntries.length).toBe(initialCount + 1);

      // Verify no duplicate batch_id in entries
      const batchIds = updatedEntries.map((e: any) => e.batch_id);
      const uniqueBatches = new Set(batchIds);
      expect(uniqueBatches.size).toBe(batchIds.length);
    } finally {
      await page.context().setOffline(false);
      await teardownTestUser(page);
    }
  });
});
