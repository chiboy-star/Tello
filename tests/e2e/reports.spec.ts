import { test, expect } from '@playwright/test';
import { setupTestUserSession, teardownTestUser } from './auth.helper';

test.describe('E2E #7: Reports & Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestUserSession(page);
  });

  test.afterEach(async ({ page }) => {
    await teardownTestUser(page);
  });

  test('renders report with totals, top sellers, and buy more restock suggestions', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.locator('text=Business Reports')).toBeVisible();
    await expect(page.locator('text=Total Revenue')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Top 5 Best Sellers')).toBeVisible();
    await expect(page.locator('text=Buy More (Restock Advice)')).toBeVisible();
  });
});
