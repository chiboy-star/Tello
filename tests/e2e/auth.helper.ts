import { Page, expect } from '@playwright/test';

export interface TestUser {
  email: string;
  name: string;
}

/**
 * Creates and logs in a dedicated test user through the UI, finishing onboarding.
 */
export const TEST_USER: TestUser = {
  email: 'e2e-tester@tallo.app',
  name: 'E2E Tester',
};

/**
 * Logs in the dedicated confirmed test user through the UI and lands on /home.
 */
export async function setupTestUserSession(page: Page): Promise<TestUser> {
  const email = TEST_USER.email;
  const password = 'password123';

  // Suppress splash during functional setup
  await page.context().addInitScript(() => {
    try {
      sessionStorage.setItem('tallo.splash.session', '1');
    } catch {}
  });

  // Direct login with confirmed test account
  await page.goto('/login');
  await page.locator('#brand-splash').waitFor({ state: 'hidden' }).catch(() => {});
  await page.waitForSelector('input[type="email"]', { state: 'visible' });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/.*home/, { timeout: 25000 });

  return TEST_USER;
}

/**
 * Clears session cookies after tests without deleting the persistent test user.
 */
export async function teardownTestUser(page: Page) {
  try {
    await page.context().clearCookies();
  } catch (err) {
    console.warn('Teardown test user warning:', err);
  }
}
