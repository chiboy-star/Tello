import { test, expect } from '@playwright/test';
import { setupTestUserSession } from './auth.helper';

test.describe('Part 4: Comprehensive Error Layer & Resilience', () => {
  test('Test 1: Intercept /api/reports with 500 status renders retry UI while shell navigation remains functional', async ({
    page,
  }) => {
    test.setTimeout(60000);
    await setupTestUserSession(page);

    let shouldFail = true;
    await page.route('**/api/reports*', async (route) => {
      if (shouldFail) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: { code: 'INTERNAL', message: 'Simulated server error' },
          }),
        });
      } else {
        await route.continue();
      }
    });

    // Navigate to /reports
    await page.goto('/reports');
    await page.locator('#brand-splash').waitFor({ state: 'hidden' }).catch(() => {});

    // Assert retry card or route error card is rendered
    const retryCard = page.locator('[data-testid="section-retry-card"], [data-testid="error-boundary-card"]');
    await expect(retryCard.first()).toBeVisible({ timeout: 15000 });

    // Assert app navigation shell is intact and functional
    const homeTab = page.locator('nav:visible a[href="/home"]').first();
    await expect(homeTab).toBeVisible();

    // Clicking "Home" tab navigates cleanly away
    await homeTab.evaluate((el: HTMLElement) => el.click());
    await page.waitForURL(/.*home/, { timeout: 15000 });

    // Navigate back to reports, unblock API, and click retry
    shouldFail = false;
    await page.goto('/reports');
    await page.locator('#brand-splash').waitFor({ state: 'hidden' }).catch(() => {});

    // If retry card is visible, click retry
    const retryBtn = page.locator('button:has-text("Retry"), button:has-text("Try again")');
    if (await retryBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await retryBtn.first().click();
    }

    // Reports performance narrative section or heading is displayed
    await expect(page.locator('h1:has-text("Business Reports")')).toBeVisible();
  });

  test('Test 2: Thrown client error inside route is caught by error boundary, shell remains intact, technical details collapsible', async ({
    page,
  }) => {
    test.setTimeout(60000);
    await setupTestUserSession(page);

    // Navigate to reports with ?crash=1 to trigger render crash
    await page.goto('/reports?crash=1');
    await page.locator('#brand-splash').waitFor({ state: 'hidden' }).catch(() => {});

    // Error boundary must catch it
    const errorCard = page.locator('[data-testid="error-boundary-card"]');
    await expect(errorCard).toBeVisible({ timeout: 15000 });

    // Header says Reports could not be loaded
    await expect(errorCard.locator('h2')).toContainText('Reports could not be loaded');

    // Navigation bar remains visible and functional
    const navBar = page.locator('nav:visible').first();
    await expect(navBar).toBeVisible();

    // Collapsible technical details disclosure contains the thrown error
    const detailsDisclosure = errorCard.locator('details');
    await expect(detailsDisclosure).toBeVisible();
    await detailsDisclosure.click();
    await expect(detailsDisclosure).toContainText('Simulated test client crash');

    // Go to Home button functions
    const homeBtn = errorCard.locator('a[href="/home"]');
    await expect(homeBtn).toBeVisible();
    await homeBtn.click({ force: true });
    await page.waitForURL(/.*home/, { timeout: 10000 });
  });

  test('Test 3: Offline simulation displays offline-specific banner with reconnection instruction', async ({
    page,
  }) => {
    test.setTimeout(60000);
    await setupTestUserSession(page);

    await page.goto('/reports');
    await page.locator('#brand-splash').waitFor({ state: 'hidden' }).catch(() => {});

    // Simulate going offline
    await page.context().setOffline(true);
    await page.evaluate(() => {
      window.dispatchEvent(new Event('offline'));
    });

    // Offline status bar should appear
    const offlineNotice = page.locator('[role="status"]:has-text("offline")');
    await expect(offlineNotice).toBeVisible({ timeout: 10000 });

    // Restore online
    await page.context().setOffline(false);
    await page.evaluate(() => {
      window.dispatchEvent(new Event('online'));
    });
  });

  test('Test 4: Non-existent route renders custom 404 page with Home link', async ({ page }) => {
    test.setTimeout(60000);
    await setupTestUserSession(page);

    await page.goto('/this-page-does-not-exist-404');
    await page.locator('#brand-splash').waitFor({ state: 'hidden' }).catch(() => {});

    // Assert 404 screen
    await expect(page.locator('text=404')).toBeVisible();
    await expect(page.locator('text=Page Not Found')).toBeVisible();

    // Link back to dashboard / home
    const homeLink = page.locator('a[href="/home"]:has-text("Dashboard"), a[href="/home"]:has-text("Home")').first();
    await expect(homeLink).toBeVisible();
    await homeLink.click();
    await page.waitForURL(/.*home/, { timeout: 10000 });
  });
});
