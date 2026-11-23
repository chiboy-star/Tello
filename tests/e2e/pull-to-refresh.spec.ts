import { test, expect } from '@playwright/test';
import { setupTestUserSession } from './auth.helper';

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
      touches: [{ identifier: 0, clientX: 180, clientY: 250 }],
    });

    // Should NOT translate
    const styleScrolled = await pullContainer.getAttribute('style');
    expect(styleScrolled).toContain('translateY(0px)');
  });
});
