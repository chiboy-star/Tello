import { test, expect } from '@playwright/test';
import { setupTestUserSession, teardownTestUser } from './auth.helper';

test.describe('Part 2: PWA Standalone Mode & Instant Auth Routing', () => {
  test('logged-in user visiting /, /login, /signup redirects to /home with zero landing flash', async ({ page }) => {
    test.setTimeout(60000);
    await setupTestUserSession(page);

    // 1. Visit landing '/'
    await page.goto('/');
    await expect(page).toHaveURL(/.*home/);
    await expect(page.locator('text=Shop Dashboard')).toBeVisible();
    await expect(page.locator('text=Know what to restock')).not.toBeVisible();

    // 2. Visit '/login'
    await page.goto('/login');
    await expect(page).toHaveURL(/.*home/);

    // 3. Visit '/signup'
    await page.goto('/signup');
    await expect(page).toHaveURL(/.*home/);

    await teardownTestUser(page);
  });

  test('standalone PWA logged out without returning flag redirects to /signup before paint', async ({ page }) => {
    // Stub standalone mode before any script runs
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'standalone', { get: () => true });
      const origMatchMedia = window.matchMedia;
      window.matchMedia = (query) => {
        if (query === '(display-mode: standalone)') {
          return {
            matches: true,
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
          } as unknown as MediaQueryList;
        }
        return origMatchMedia(query);
      };
      localStorage.removeItem('tallo.returning');
    });

    await page.goto('/');
    await expect(page).toHaveURL(/.*signup/);
    await expect(page.locator('text=Create your shop account')).toBeVisible();
    // Assert landing page hero is never visible
    await expect(page.locator('text=Know what to restock')).not.toBeVisible();
  });

  test('standalone PWA logged out with returning flag redirects to /login before paint', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'standalone', { get: () => true });
      const origMatchMedia = window.matchMedia;
      window.matchMedia = (query) => {
        if (query === '(display-mode: standalone)') {
          return {
            matches: true,
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
          } as unknown as MediaQueryList;
        }
        return origMatchMedia(query);
      };
      localStorage.setItem('tallo.returning', 'true');
    });

    await page.goto('/');
    await expect(page).toHaveURL(/.*login/);
    await expect(page.locator('text=Welcome back')).toBeVisible();
    await expect(page.locator('text=Know what to restock')).not.toBeVisible();
  });
});
