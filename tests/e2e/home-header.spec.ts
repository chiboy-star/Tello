import { test, expect } from '@playwright/test';
import { setupTestUserSession } from './auth.helper';

test('Capture Home Header with Greeting, Shop Name, Date and No Updated text', async ({ page }) => {
  test.setTimeout(60000);
  await setupTestUserSession(page);

  await page.goto('/home');
  await page.waitForSelector('h1:has-text("Good ")', { timeout: 15000 });

  // Verify header elements
  const h1 = page.locator('h1').first();
  await expect(h1).toContainText(/Good (morning|afternoon|evening)/);

  // Assert "Updated" text does NOT exist in the header
  const header = h1.locator('../..');
  const headerText = await header.innerText();
  expect(headerText).not.toContain('Updated');

  // Capture screenshot of the header
  await header.screenshot({ path: 'tests/screenshots/home-header-verified.png' });
  await page.screenshot({ path: 'tests/screenshots/home-page-verified.png', fullPage: false });
});
