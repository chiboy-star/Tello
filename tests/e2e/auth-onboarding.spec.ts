import { test, expect } from '@playwright/test';

test.describe('Auth Guard & Onboarding Flow', () => {
  test('E2E #10: visiting /home signed out redirects to /login', async ({ page }) => {
    await page.goto('/home');
    await expect(page).toHaveURL(/.*login/);
  });

  test('E2E #1: signup and full onboarding flow lands on /home', async ({ page }) => {
    // 1. Visit signup
    await page.goto('/signup');
    await page.locator('#brand-splash').waitFor({ state: 'hidden' }).catch(() => {});
    await page.waitForSelector('input[name="name"]', { state: 'visible' });
    await page.fill('input[name="name"]', 'Chukwuma Test');
    await page.fill('input[name="email"]', `test-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'password123');
    
    // In e2e mock environment, clicking create account moves to onboarding
    await page.click('button[type="submit"]');

    // Step 1: Business type
    await expect(page).toHaveURL(/.*onboarding/, { timeout: 15000 });
    await page.click('text=Retail Shop');
    await page.click('button:has-text("Next: Select Categories")');

    // Step 2: Categories
    await page.click('text=Food Staples & Cooking');
    await page.click('button:has-text("Next: Pick Items")');

    // Step 3: Pick items & add custom
    await page.fill('input[placeholder="Custom item name"]', 'Special Suya Pepper');
    await page.click('button:has-text("Add")');

    // Complete setup
    await page.click('button:has-text("Finish Setup & Open Shop")');

    // Should redirect to /home
    await expect(page).toHaveURL(/.*home/, { timeout: 20000 });
  });
});
