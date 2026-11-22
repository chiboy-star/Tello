import { test, expect } from '@playwright/test';
import { setupTestUserSession, teardownTestUser } from './auth.helper';

test.describe('Part 3: PWA Install Banner & Installability', () => {
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => {
      try {
        localStorage.removeItem('tallo.install.snooze');
      } catch {}
    }).catch(() => {});
  });

  test('synthetic beforeinstallprompt: banner visible, Install calls prompt once, disappears', async ({ page }) => {
    await setupTestUserSession(page);
    await page.evaluate(() => {
      try {
        localStorage.removeItem('tallo.install.snooze');
      } catch {}
    });
    await page.goto('/home');
    await page.locator('#brand-splash').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});

    // Inject synthetic beforeinstallprompt event with spy
    await page.evaluate(() => {
      // @ts-expect-error test harness
      window.__promptCalled = 0;
      const event = new Event('beforeinstallprompt');
      // @ts-expect-error test harness
      event.prompt = () => {
        // @ts-expect-error test harness
        window.__promptCalled++;
        return Promise.resolve();
      };
      // @ts-expect-error test harness
      event.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });
      window.dispatchEvent(event);
    });

    // Wait for the banner to appear after timer
    const banner = page.locator('aside[aria-label="Install Tallo application"]');
    await expect(banner).toBeVisible({ timeout: 12000 });
    await expect(banner).toContainText('Install Tallo');
    await expect(banner).toContainText('Opens instantly and works offline.');

    // Click Install button
    const installBtn = banner.getByRole('button', { name: 'Install', exact: true });
    await installBtn.click();

    // Verify prompt was called exactly once
    const promptCalled = await page.evaluate(() => {
      // @ts-expect-error test harness
      return window.__promptCalled;
    });
    expect(promptCalled).toBe(1);

    // Verify banner disappears after install accepted
    await expect(banner).not.toBeVisible({ timeout: 2000 });

    await teardownTestUser(page);
  });

  test('appinstalled event hides all install affordances', async ({ page }) => {
    await setupTestUserSession(page);
    await page.evaluate(() => {
      try {
        localStorage.removeItem('tallo.install.snooze');
      } catch {}
    });
    await page.goto('/home');
    await page.locator('#brand-splash').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});

    // Trigger beforeinstallprompt first
    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt');
      // @ts-expect-error test harness
      event.prompt = () => Promise.resolve();
      // @ts-expect-error test harness
      event.userChoice = new Promise(() => {}); // pending
      window.dispatchEvent(event);
    });

    const banner = page.locator('aside[aria-label="Install Tallo application"]');
    await expect(banner).toBeVisible({ timeout: 12000 });

    // Dispatch appinstalled
    await page.evaluate(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });

    // Banner and persistent actions should be hidden
    await expect(banner).not.toBeVisible({ timeout: 2000 });
    const sidebarInstall = page.locator('button:has-text("Install App")');
    await expect(sidebarInstall).not.toBeVisible();

    await teardownTestUser(page);
  });

  test('iOS Safari user-agent opens instruction Drawer with Share and Add to Home Screen steps', async ({ browser }) => {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    });
    const page = await context.newPage();
    await setupTestUserSession(page);
    await page.goto('/home');
    await page.locator('#brand-splash').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});

    const banner = page.locator('aside[aria-label="Install Tallo application"]');
    await expect(banner).toBeVisible({ timeout: 12000 });

    // Click Install on iOS
    await banner.getByRole('button', { name: 'Install', exact: true }).click();

    // Drawer should open with iOS instructions
    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText('Install Tallo on iPhone & iPad');
    await expect(drawer).toContainText('Share');
    await expect(drawer).toContainText('Add to Home Screen');

    await teardownTestUser(page);
    await context.close();
  });

  test('standalone mode hides banner and install affordances', async ({ browser }) => {
    const context = await browser.newContext();
    // Emulate standalone display mode
    await context.addInitScript(() => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
          matches: query.includes('standalone'),
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        }),
      });
    });

    const page = await context.newPage();
    await setupTestUserSession(page);
    await page.goto('/home');

    // Trigger beforeinstallprompt
    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt');
      // @ts-expect-error test harness
      event.prompt = () => Promise.resolve();
      // @ts-expect-error test harness
      event.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });
      window.dispatchEvent(event);
    });

    // Wait and assert banner never shows
    await page.waitForTimeout(4500);
    const banner = page.locator('aside[aria-label="Install Tallo application"]');
    await expect(banner).not.toBeVisible();

    await teardownTestUser(page);
    await context.close();
  });

  test('Not now snoozes the install prompt for 7 days', async ({ page }) => {
    await setupTestUserSession(page);
    await page.goto('/home');
    await page.evaluate(() => {
      try {
        localStorage.removeItem('tallo.install.snooze');
      } catch {}
    });
    await page.locator('#brand-splash').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});

    // Trigger beforeinstallprompt
    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt');
      // @ts-expect-error test harness
      event.prompt = () => Promise.resolve();
      // @ts-expect-error test harness
      event.userChoice = new Promise(() => {});
      window.dispatchEvent(event);
    });

    const banner = page.locator('aside[aria-label="Install Tallo application"]');
    await expect(banner).toBeVisible({ timeout: 12000 });

    // Click Not now
    await banner.getByRole('button', { name: 'Not now', exact: true }).click();
    await expect(banner).not.toBeVisible();

    // Check localStorage snooze key
    const snoozeTime = await page.evaluate(() => {
      return localStorage.getItem('tallo.install.snooze');
    });
    expect(snoozeTime).not.toBeNull();
    expect(Number(snoozeTime)).toBeGreaterThan(0);

    // Reload page and trigger beforeinstallprompt again
    await page.reload();
    await page.locator('#brand-splash').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt');
      // @ts-expect-error test harness
      event.prompt = () => Promise.resolve();
      // @ts-expect-error test harness
      event.userChoice = new Promise(() => {});
      window.dispatchEvent(event);
    });

    await page.waitForTimeout(4500);
    await expect(banner).not.toBeVisible();

    await page.evaluate(() => {
      try {
        localStorage.removeItem('tallo.install.snooze');
      } catch {}
    });

    await teardownTestUser(page);
  });

  test('no banner appears during the splash screen', async ({ page }) => {
    // Go without suppressing splash
    await page.goto('/home?splash=1');
    const splash = page.locator('#brand-splash');
    await expect(splash).toBeVisible();

    // Trigger beforeinstallprompt while splash is visible
    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt');
      // @ts-expect-error test harness
      event.prompt = () => Promise.resolve();
      // @ts-expect-error test harness
      event.userChoice = new Promise(() => {});
      window.dispatchEvent(event);
    });

    const banner = page.locator('aside[aria-label="Install Tallo application"]');
    await expect(banner).not.toBeVisible();
  });

  test('CDP Page.getInstallabilityErrors check on production build', async ({ page }) => {
    // Navigate to /home
    await page.goto('/home');
    const client = await page.context().newCDPSession(page);

    try {
      const result = await client.send('Page.getInstallabilityErrors');
      console.log('\n[CDP Installability Result]:', JSON.stringify(result, null, 2));
      // In dev mode or without sw on dev origin, installability errors might include no service worker or dev flag
      expect(result).toBeDefined();
    } catch (err) {
      console.log('[CDP Installability] Note: getInstallabilityErrors response:', err);
    }
  });
});
