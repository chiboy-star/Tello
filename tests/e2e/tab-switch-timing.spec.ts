import { test, expect } from '@playwright/test';
import { setupTestUserSession, teardownTestUser } from './auth.helper';

test.use({
  video: 'on',
});

test.describe('Part 3: Tab-Switch Timing & Instant Navigation Benchmark', () => {
  test.setTimeout(180000);

  test('measures cold and warm switch timings across all 5 tabs with no fixed waits', async ({ page }) => {
    test.setTimeout(180000);
    // 1. Setup authenticated session
    console.log('[Benchmark] Setting up test user session...');
    await setupTestUserSession(page);
    console.log('[Benchmark] Test user session established.');

    // Ensure initial splash screen is completely dismissed
    const splash = page.locator('#brand-splash');
    await splash.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});

    // Hide Next.js dev tools badge that can intercept bottom-left mobile nav clicks in dev
    await page.addStyleTag({
      content: 'nextjs-portal, button[aria-label*="Next.js"] { display: none !important; pointer-events: none !important; }',
    }).catch(() => {});

    const tabs = [
      { href: '/stock', selector: 'h1:has-text("Stock & Inventory")' },
      { href: '/sell', selector: 'h1:has-text("Record Sale")' },
      { href: '/debts', selector: 'h1:has-text("Customers & Credit Ledger")' },
      { href: '/reports', selector: 'h1:has-text("Business Reports")' },
      { href: '/home', selector: 'h1:has-text("Shop Dashboard")' },
    ];

    // 2. Cold navigation benchmark (first visit to each tab from cold cache)
    console.log('\n--- Cold Tab-Switch Timing (First Navigation) ---');
    const coldTimes: Record<string, number> = {};
    for (const tab of tabs) {
      const navLink = page.locator(`a[data-pill-id="${tab.href}"]:visible`).first();
      await expect(navLink).toBeVisible();

      const startTime = Date.now();
      await navLink.click({ force: true });
      await page.waitForSelector(tab.selector, { state: 'visible' });
      const elapsed = Date.now() - startTime;

      coldTimes[tab.href] = elapsed;
      console.log(`[Cold] ${tab.href.padEnd(10)}: ${elapsed}ms`);
    }

    // 3. Warm navigation benchmark (10 iterations across all 5 tabs = 10 samples per tab)
    const measurements: Record<string, number[]> = {
      '/home': [],
      '/stock': [],
      '/sell': [],
      '/debts': [],
      '/reports': [],
    };

    const iterations = 10;
    for (let round = 0; round < iterations; round++) {
      for (const tab of tabs) {
        const navLink = page.locator(`a[data-pill-id="${tab.href}"]:visible`).first();
        await expect(navLink).toBeVisible();

        const startTime = Date.now();
        await navLink.click({ force: true });
        await page.waitForSelector(tab.selector, { state: 'visible' });
        const elapsed = Date.now() - startTime;

        measurements[tab.href].push(elapsed);
      }
    }

    // 4. Calculate p50 and p95 per tab
    console.log('\n--- Warm Instant Navigation Latency Benchmark (10 samples per tab) ---');
    for (const [route, times] of Object.entries(measurements)) {
      times.sort((a, b) => a - b);
      const p50 = times[Math.floor(times.length * 0.5)];
      const p95 = times[Math.floor(times.length * 0.95)];
      console.log(`${route.padEnd(10)}: p50 = ${p50}ms | p95 = ${p95}ms (samples: [${times.join(', ')}])`);

      // Assert all navigation iterations completed
      expect(times.length).toBe(iterations);
    }
    console.log('---------------------------------------------------\n');

    // 5. Clean up test user
    await teardownTestUser(page);
  });
});
