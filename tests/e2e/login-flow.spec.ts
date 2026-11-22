import { test, expect, Page } from '@playwright/test';
import { setupTestUserSession, teardownTestUser } from './auth.helper';

test.describe('BUG A: Existing User Login Flow', () => {
  test.setTimeout(60000);
  let existingUser: { email: string; name: string };

  async function openLogin(page: Page) {
    await page.goto('/login');
    await page.locator('#brand-splash').waitFor({ state: 'hidden' }).catch(() => {});
    await page.waitForSelector('input[type="email"]', { state: 'visible' });
  }

  test.beforeEach(async ({ page }) => {
    // Ensure clean state before each test
    await page.context().clearCookies();
  });

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    existingUser = await setupTestUserSession(page);
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    if (existingUser) {
      try {
        const page = await browser.newPage();
        await openLogin(page);
        await page.fill('input[type="email"]', existingUser.email);
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForURL(/.*home/, { timeout: 15000 });
        await teardownTestUser(page);
        await page.close();
      } catch (err) {
        console.warn('Teardown existing test user warning:', err);
      }
    }
  });

  test('(i) existing user logs in through the UI and lands on /home', async ({ page }) => {
    await openLogin(page);

    await page.fill('input[type="email"]', existingUser.email);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/home/, { timeout: 15000 });
    await expect(page.locator('h1')).toBeVisible();
  });

  test('(ii) wrong password shows an inline error and stays on /login', async ({ page }) => {
    await openLogin(page);

    await page.fill('input[type="email"]', existingUser.email);
    await page.fill('input[type="password"]', 'wrong-password-12345');
    await page.click('button[type="submit"]');

    // Assert stays on /login
    await expect(page).toHaveURL(/\/login/);
    const alert = page.locator('div[role="alert"]:not(#__next-route-announcer__)');
    await expect(alert).toBeVisible({ timeout: 10000 });
    await expect(alert).toContainText(/Invalid login credentials|invalid|error/i);
  });

  test('(iii) reload keeps the session', async ({ page }) => {
    await openLogin(page);

    await page.fill('input[type="email"]', existingUser.email);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/home/, { timeout: 15000 });

    // Reload page and assert user remains on /home
    await page.reload();
    await expect(page).toHaveURL(/\/home/);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('(iv) log out, then log in again', async ({ page }) => {
    await openLogin(page);

    await page.fill('input[type="email"]', existingUser.email);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/home/, { timeout: 15000 });

    // Click Sign Out in Settings
    await page.goto('/settings');
    await page.waitForSelector('button:has-text("Sign Out")', { timeout: 10000 });
    await page.click('button:has-text("Sign Out")');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    // Log in again through the UI
    await page.waitForLoadState('domcontentloaded');
    await page.locator('#brand-splash').waitFor({ state: 'hidden' }).catch(() => {});
    await page.waitForSelector('input[type="email"]', { state: 'visible' });
    await page.fill('input[type="email"]', existingUser.email);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/home/, { timeout: 15000 });
  });

  test('(v) with a stale service worker present, login still works', async ({ page }) => {
    // Simulate stale SW registered on this origin
    await page.goto('/');
    await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.register('/sw.js');
        } catch {}
      }
    });

    // Go to /login and sign in
    await openLogin(page);
    await page.fill('input[type="email"]', existingUser.email);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Must successfully reach /home
    await expect(page).toHaveURL(/\/home/, { timeout: 15000 });
    await expect(page.locator('h1')).toBeVisible();
  });
});
