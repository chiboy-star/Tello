import { test, expect } from '@playwright/test';

test.describe('BUG B: Intro Splash Verification', () => {
  test('fresh visit to / shows #brand-splash within 500ms and hides by 3s, setting localStorage flag', async ({ page, context }) => {
    // Clear storage to guarantee fresh first visit
    await context.clearCookies();
    await page.goto('/');
    
    // Assert visible within 500ms
    const splash = page.locator('#brand-splash');
    await expect(splash).toBeVisible({ timeout: 500 });

    // Expect hidden by 3s
    await expect(splash).not.toBeVisible({ timeout: 3500 });

    // Expect localStorage flag set
    const flag = await page.evaluate(() => localStorage.getItem('tallo.intro.v1'));
    expect(flag).toBe('1');
  });

  test('second visit: #brand-splash is never visible', async ({ page }) => {
    // Flag is already set from first visit, but explicitly ensure it
    await page.addInitScript(() => {
      localStorage.setItem('tallo.intro.v1', '1');
    });

    await page.goto('/');
    const splash = page.locator('#brand-splash');
    await expect(splash).not.toBeVisible({ timeout: 1000 });
  });

  test('/?splash=1: #brand-splash is visible again even if flag set', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('tallo.intro.v1', '1');
    });

    await page.goto('/?splash=1');
    const splash = page.locator('#brand-splash');
    await expect(splash).toBeVisible({ timeout: 500 });
    await expect(splash).not.toBeVisible({ timeout: 3500 });
  });

  test('stubbed standalone mode: compact version visible and runs with pwa-timing', async ({ page }) => {
    await page.addInitScript(() => {
      // Stub standalone display mode
      Object.defineProperty(navigator, 'standalone', { get: () => true });
      const origMatchMedia = window.matchMedia;
      window.matchMedia = (query) => {
        if (query.includes('display-mode: standalone')) {
          return {
            matches: true,
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => true,
          } as any;
        }
        return origMatchMedia(query);
      };
    });

    await page.goto('/signup'); // Standalone logged-out redirects to /signup
    const splash = page.locator('#brand-splash');
    await expect(splash).toBeVisible({ timeout: 500 });
    // Compact version should dismiss around 1.1s - 1.5s
    await expect(splash).not.toBeVisible({ timeout: 2000 });
  });

  test('reduced motion: shows final lockup only', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/?splash=1', { waitUntil: 'commit' });
    const splash = page.locator('#brand-splash');
    await expect(splash).toBeVisible({ timeout: 1000 });
    // In reduced motion, stroke-dashoffset is 0 and animations are none
    const strike = splash.locator('.splash-strike');
    await expect(strike).toHaveCSS('stroke-dashoffset', '0px');
  });
});
