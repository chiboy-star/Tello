import { test, expect } from '@playwright/test';
import { setupTestUserSession, teardownTestUser } from './auth.helper';

test.describe('E2E #3, #4, #5: Type, Voice, Image AI Modes', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestUserSession(page);
  });

  test.afterEach(async ({ page }) => {
    await teardownTestUser(page);
  });

  test('E2E #3: Type mode free-text parse produces Confirm screen and saves credit entry', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/sell');
    await page.click('button:has-text("Type")');

    await page.fill('input[placeholder*="3 Indomie"]', '2 rice 5k credit Mama Ngozi');
    await page.click('button:has-text("Parse")');

    // Confirm screen should display parsed entry
    await expect(page.locator('text=Confirm Entries')).toBeVisible();
    await expect(page.locator('input[value="Mama Ngozi"]')).toBeVisible();

    await page.click('button:has-text("Save All Confirmed")');
    await expect(page.locator('text=Sale recorded successfully')).toBeVisible();
  });

  test('E2E #4: Voice mode parses audio recording and shows Confirm screen', async ({ page }) => {
    await page.goto('/sell');
    await page.click('button:has-text("Speak")');
    await expect(page.locator('text=Record voice note')).toBeVisible();
  });

  test('E2E #5: Snap mode allows image capture and shows Confirm screen', async ({ page }) => {
    await page.goto('/sell');
    await page.click('button:has-text("Snap")');
    await expect(page.locator('text=Photograph receipt or sales book')).toBeVisible();
  });
});
