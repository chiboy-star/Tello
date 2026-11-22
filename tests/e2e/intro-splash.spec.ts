import { test, expect } from '@playwright/test';
import { setupTestUserSession, teardownTestUser } from './auth.helper';

test.describe('Part 1: Splash Policy & Critical Pre-Paint Styling', () => {
  test('fresh context opening / shows splash within 500ms and hides by 3.5s, setting session flag', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');

    const splash = page.locator('#brand-splash');
    await expect(splash).toBeVisible({ timeout: 500 });
    await expect(splash).not.toBeVisible({ timeout: 3500 });

    const sessionFlag = await page.evaluate(() => sessionStorage.getItem('tallo.splash.session'));
    expect(sessionFlag).toBe('1');
    const hasSeenFlag = await page.evaluate(() => localStorage.getItem('tallo.intro.v1'));
    expect(hasSeenFlag).toBe('1');
  });

  test('opening /home directly as a logged-in user also shows splash in fresh session', async ({ browser }) => {
    test.setTimeout(60000);
    // 1. Create a dedicated user session
    const setupContext = await browser.newContext();
    const setupPage = await setupContext.newPage();
    const _user = await setupTestUserSession(setupPage);
    const storageState = await setupContext.storageState();
    await setupContext.close();

    // 2. Open /home in a fresh browser context (new tab/session without sessionStorage)
    const freshContext = await browser.newContext({ storageState });
    const freshPage = await freshContext.newPage();
    await freshPage.goto('/home');

    // Splash should show on first load of the session even on authenticated /home
    const splash = freshPage.locator('#brand-splash');
    await expect(splash).toBeVisible({ timeout: 500 });
    await expect(splash).not.toBeVisible({ timeout: 3500 });

    // Cleanup user
    await teardownTestUser(freshPage);
    await freshContext.close();
  });

  test('a second navigation in the same tab does not show splash', async ({ page }) => {
    await page.goto('/');
    const splash = page.locator('#brand-splash');
    await expect(splash).toBeVisible({ timeout: 500 });
    await expect(splash).not.toBeVisible({ timeout: 3500 });

    // In the same tab, navigate to /login
    await page.goto('/login');
    await expect(splash).not.toBeVisible({ timeout: 500 });
  });

  test('a new context (new session) shows it again', async ({ browser }) => {
    // Session 1
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    await page1.goto('/');
    const splash1 = page1.locator('#brand-splash');
    await expect(splash1).toBeVisible({ timeout: 500 });
    await expect(splash1).not.toBeVisible({ timeout: 3500 });
    await context1.close();

    // Session 2 (fresh context = new session)
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await page2.goto('/');
    const splash2 = page2.locator('#brand-splash');
    await expect(splash2).toBeVisible({ timeout: 500 });
    await expect(splash2).not.toBeVisible({ timeout: 3500 });
    await context2.close();
  });

  test('?splash=0 suppresses the splash completely', async ({ page }) => {
    await page.goto('/?splash=0');
    const splash = page.locator('#brand-splash');
    await expect(splash).not.toBeVisible({ timeout: 1000 });
  });

  test('SSR HTML contains critical background style, meta color-scheme, and #brand-splash element', async ({ request }) => {
    const res = await request.get('/');
    expect(res.status()).toBe(200);
    const html = await res.text();

    // Check meta color-scheme
    expect(html).toContain('name="color-scheme"');
    expect(html).toContain('content="light dark"');

    // Check critical inline style
    expect(html).toContain('#brand-splash');
    expect(html).toContain('background-color: #0E1512');
    expect(html).toContain('background-color: #F7F6F2');

    // Check SSR-rendered #brand-splash element
    expect(html).toContain('id="brand-splash"');
  });

  test('stubbed standalone mode: compact version visible and runs with pwa-timing', async ({ page }) => {
    await page.addInitScript(() => {
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

    await page.goto('/signup');
    const splash = page.locator('#brand-splash');
    await expect(splash).toBeVisible({ timeout: 500 });
    await expect(splash).not.toBeVisible({ timeout: 2000 });
  });

  test('reduced motion: shows final lockup only', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/?splash=1', { waitUntil: 'commit' });
    const splash = page.locator('#brand-splash');
    await expect(splash).toBeVisible({ timeout: 1000 });
    const strike = splash.locator('.splash-strike');
    await expect(strike).toHaveCSS('stroke-dashoffset', '0px');
  });
});
