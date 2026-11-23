import { test, expect } from '@playwright/test';
import { setupTestUserSession } from './auth.helper';
import path from 'node:path';

test.describe('Part 6: Standalone PWA Pull-to-Refresh & Touch Handling', () => {
  test.beforeEach(async ({ page }) => {
    // Stub standalone mode and touch support before page load
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'standalone', { get: () => true });
      Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 5 });
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
    });
  });

  test('pull below 72px threshold springs back without refetching; pull past 72px triggers refetch and logo animation', async ({
    page,
  }) => {
    test.setTimeout(60000);
    await setupTestUserSession(page);

    await page.goto('/home');
    await page.waitForSelector('h1:has-text("Good ")', { timeout: 15000 });

    const pullContainer = page.locator('[data-pull-container="true"]');
    await expect(pullContainer).toBeVisible();

    // 1. Pull below threshold: touchstart at y=100, move to y=180 (delta = 80 -> distance = 40px < 72px)
    await pullContainer.dispatchEvent('touchstart', {
      touches: [{ identifier: 0, clientX: 180, clientY: 100 }],
    });
    await pullContainer.dispatchEvent('touchmove', {
      touches: [{ identifier: 0, clientX: 180, clientY: 180 }],
    });

    // Check style transform translateY is approx 40px
    const styleBelow = await pullContainer.getAttribute('style');
    expect(styleBelow).toContain('translateY(40px)');

    // End touch -> springs back to translateY(0px)
    await pullContainer.dispatchEvent('touchend');
    await expect.poll(async () => {
      const s = await pullContainer.getAttribute('style');
      return s;
    }, { timeout: 2000 }).toContain('translateY(0px)');

    // 2. Pull above threshold: touchstart at y=100, move to y=260 (delta = 160 -> distance = 80px > 72px)
    await pullContainer.dispatchEvent('touchstart', {
      touches: [{ identifier: 0, clientX: 180, clientY: 100 }],
    });
    await pullContainer.dispatchEvent('touchmove', {
      touches: [{ identifier: 0, clientX: 180, clientY: 260 }],
    });

    const styleAbove = await pullContainer.getAttribute('style');
    expect(styleAbove).toContain('translateY(80px)');

    // Release to trigger refresh
    await pullContainer.dispatchEvent('touchend');

    // Indicator / logo is active during refresh
    const indicator = page.locator('[data-pull-indicator="true"]');
    await expect(indicator).toBeVisible({ timeout: 2000 });

    // Capture screenshot of pull indicator logo
    await page.screenshot({ path: 'test-results/pull-to-refresh-indicator.png' });

    // Settles back to translateY(0px) after refresh finishes
    await expect.poll(async () => {
      const s = await pullContainer.getAttribute('style');
      return s;
    }, { timeout: 10000 }).toContain('translateY(0px)');
  });

  test('pull to refresh frame strip captures: 0, 30, 60, 72 px, refreshing, and finishing', async ({ page }) => {
    test.setTimeout(60000);
    const screenshotDir = path.join(process.cwd(), 'tests', 'screenshots');
    await setupTestUserSession(page);

    await page.goto('/home');
    await page.waitForSelector('h1:has-text("Good ")', { timeout: 15000 });

    const pullContainer = page.locator('[data-pull-container="true"]');
    await expect(pullContainer).toBeVisible();

    // Frame 0px: Idle resting state
    await page.screenshot({ path: path.join(screenshotDir, 'pull-frame-0px.png') });

    // Frame 30px: delta = 60 (distance = 30px)
    await pullContainer.dispatchEvent('touchstart', {
      touches: [{ identifier: 0, clientX: 180, clientY: 100 }],
    });
    await pullContainer.dispatchEvent('touchmove', {
      touches: [{ identifier: 0, clientX: 180, clientY: 160 }],
    });
    await page.waitForTimeout(50);
    await page.screenshot({ path: path.join(screenshotDir, 'pull-frame-30px.png') });

    // Frame 60px: delta = 120 (distance = 60px)
    await pullContainer.dispatchEvent('touchmove', {
      touches: [{ identifier: 0, clientX: 180, clientY: 220 }],
    });
    await page.waitForTimeout(50);
    await page.screenshot({ path: path.join(screenshotDir, 'pull-frame-60px.png') });

    // Frame 72px: delta = 144 (distance = 72px - threshold reached)
    await pullContainer.dispatchEvent('touchmove', {
      touches: [{ identifier: 0, clientX: 180, clientY: 244 }],
    });
    await page.waitForTimeout(50);
    await page.screenshot({ path: path.join(screenshotDir, 'pull-frame-72px.png') });

    // Release to enter Refreshing state
    await pullContainer.dispatchEvent('touchend');
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(screenshotDir, 'pull-frame-refreshing.png') });

    // Wait for finishing state
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(screenshotDir, 'pull-frame-finishing.png') });

    // Final settled state
    await expect.poll(async () => {
      const s = await pullContainer.getAttribute('style');
      return s;
    }, { timeout: 10000 }).toContain('translateY(0px)');
  });

  test('does not trigger pull-to-refresh when scrolled down or when a drawer is open', async ({ page }) => {
    test.setTimeout(60000);
    await setupTestUserSession(page);

    await page.goto('/home');
    await page.waitForSelector('h1:has-text("Good ")', { timeout: 15000 });

    const pullContainer = page.locator('[data-pull-container="true"]');

    // Simulate scrolled down: set scrollY > 0
    await page.evaluate(() => {
      window.scrollTo(0, 100);
    });

    await pullContainer.dispatchEvent('touchstart', {
      touches: [{ identifier: 0, clientX: 180, clientY: 100 }],
    });
    await pullContainer.dispatchEvent('touchmove', {
      touches: [{ identifier: 0, clientX: 180, clientY: 260 }],
    });

    // Should NOT have moved because scrollY > 0
    const styleScrolled = await pullContainer.getAttribute('style');
    expect(styleScrolled).toContain('translateY(0px)');
    await pullContainer.dispatchEvent('touchend');

    // Open Add Item Drawer on /stock and verify pull is suppressed when drawer is open
    await page.goto('/stock');
    await page.waitForSelector('text=Stock & Inventory', { timeout: 15000 });
    await page.click('button:has-text("Add Item")');
    const drawer = page.locator('[role="dialog"]');
    await expect(drawer).toBeVisible();

    const stockPullContainer = page.locator('[data-pull-container="true"]');
    await stockPullContainer.dispatchEvent('touchstart', {
      touches: [{ identifier: 0, clientX: 180, clientY: 100 }],
    });
    await stockPullContainer.dispatchEvent('touchmove', {
      touches: [{ identifier: 0, clientX: 180, clientY: 260 }],
    });

    const styleDrawerOpen = await stockPullContainer.getAttribute('style');
    expect(styleDrawerOpen).toContain('translateY(0px)');
  });
});
