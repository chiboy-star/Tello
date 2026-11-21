import { test, expect } from '@playwright/test';
import { setupTestUserSession, teardownTestUser } from './auth.helper';

test.use({
  video: 'on',
});

test.describe('Part 3: Tab-Switch Timing & Instant Navigation Benchmark', () => {
  test.setTimeout(90000);

  test('warms 5 tabs, measures switch timings, and verifies p95 < 300ms', async ({ page }) => {
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

    // 2. Warm up phase: visit each tab via client navigation once
    console.log('[Benchmark] Warming tabs...');
    for (const tab of tabs) {
      console.log(`[Benchmark] Warmup navigating to ${tab.href}...`);
      const navLink = page.locator(`a[data-pill-id="${tab.href}"]:visible`).first();
      await navLink.click({ force: true });
      await page.waitForSelector(tab.selector, { state: 'visible' });
      console.log(`[Benchmark] ${tab.href} ready.`);
    }
    console.log('[Benchmark] Warmup complete.');

    // 3. Timing benchmark loop (4 iterations across all 5 tabs)
    const measurements: Record<string, number[]> = {
      '/home': [],
      '/stock': [],
      '/sell': [],
      '/debts': [],
      '/reports': [],
    };

    const iterations = 4;
    for (let round = 0; round < iterations; round++) {
      for (const tab of tabs) {
        // Find visible navigation link to this tab
        const navLink = page.locator(`a[data-pill-id="${tab.href}"]:visible`).first();
        await expect(navLink).toBeVisible();

        const startTime = Date.now();
        await navLink.click({ force: true });
        await page.waitForSelector(tab.selector, { state: 'visible' });
        const elapsed = Date.now() - startTime;

        measurements[tab.href].push(elapsed);
        await page.waitForTimeout(40);
      }
    }

    // 4. Calculate p50 and p95 per tab
    console.log('\n--- Instant Navigation Latency Benchmark Results ---');
    for (const [route, times] of Object.entries(measurements)) {
      times.sort((a, b) => a - b);
      const p50 = times[Math.floor(times.length * 0.5)];
      const p95 = times[Math.floor(times.length * 0.95)];
      console.log(`${route.padEnd(10)}: p50 = ${p50}ms | p95 = ${p95}ms (samples: [${times.join(', ')}])`);

      // Assert instant responsiveness: p95 should be snappy (< 300ms)
      expect(p95).toBeLessThan(300);
    }
    console.log('---------------------------------------------------\n');

    // 5. Test splash animation capture for video
    await page.goto('/home?splash=1');
    const splashEl = page.locator('#brand-splash');
    if (await splashEl.isVisible()) {
      await expect(splashEl).toBeVisible();
      // Wait for splash dismissal
      await page.waitForTimeout(1600);
    }

    // 6. Clean up test user
    await teardownTestUser(page);
  });
});
