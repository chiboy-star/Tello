import { Page } from '@playwright/test';

export interface TestUser {
  email: string;
  name: string;
}

/**
 * Creates and logs in a dedicated test user through the UI, finishing onboarding.
 */
export async function setupTestUserSession(page: Page): Promise<TestUser> {
  const timestamp = Date.now();
  const email = `e2e-user-${timestamp}@example.com`;
  const name = `E2E Tester ${timestamp}`;
  const password = 'password123';

  // 1. Visit signup
  await page.goto('/signup');
  await page.locator('#brand-splash').waitFor({ state: 'hidden' }).catch(() => {});
  await page.waitForSelector('input[name="name"]', { state: 'visible' });
  await page.fill('input[name="name"]', name);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  
  // Submit and wait for redirect to onboarding or home
  await Promise.all([
    page.waitForURL(/.*(onboarding|home)/, { timeout: 25000 }),
    page.click('button[type="submit"]'),
  ]);

  if (page.url().includes('onboarding')) {
    // Step 1: Business type
    await page.click('text=Retail Shop');
    await page.click('button:has-text("Next: Select Categories")');

    // Step 2: Categories
    await page.click('button:has-text("Next: Pick Items")');

    // Step 3: Complete
    await page.click('button:has-text("Finish Setup & Open Shop")');
    await page.waitForURL(/.*home/, { timeout: 15000 });
  }

  return { email, name };
}

/**
 * Purges the test user account using DELETE /api/account
 */
export async function teardownTestUser(page: Page) {
  try {
    await page.goto('/settings');
    await page.waitForSelector('text=Delete Account & Data', { timeout: 5000 });
    await page.click('button:has-text("Delete Account & Data")');
    await page.click('button:has-text("Yes, Delete Everything")');
    await page.waitForURL('/', { timeout: 10000 });
  } catch (err) {
    console.warn('Teardown test user warning:', err);
  }
}
