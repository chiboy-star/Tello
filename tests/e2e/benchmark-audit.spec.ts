import { test, expect } from '@playwright/test';
import { setupTestUserSession } from '../e2e/auth.helper';

test.describe('Part 6 Carry-Overs: Performance Benchmark & Trace Audit', () => {
  test('4x CPU throttle Home smoothness and Tab Switch durations (cold and warm)', async ({ page }) => {
    test.setTimeout(120000);
    await setupTestUserSession(page);

    // Create CDP session for 4x CPU throttling
    const client = await page.context().newCDPSession(page);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });

    // 1. Audit Home Load Smoothness under 4x CPU throttle
    // Track frame intervals via requestAnimationFrame using addInitScript
    await page.addInitScript(() => {
      (window as any).__rafTimings = [];
      let lastTime = performance.now();
      function measureRaf(now: number) {
        (window as any).__rafTimings.push(now - lastTime);
        lastTime = now;
        if ((window as any).__rafMeasuring) {
          requestAnimationFrame(measureRaf);
        }
      }
      (window as any).__rafMeasuring = true;
      requestAnimationFrame(measureRaf);
    });

    await page.goto('/home');
    await page.waitForSelector('h1:has-text("Shop Dashboard")', { timeout: 15000 });
    // Let page settle for 1 second
    await page.waitForTimeout(1000);

    const frameStats = await page.evaluate(() => {
      (window as any).__rafMeasuring = false;
      const timings: number[] = (window as any).__rafTimings || [];
      const longFrames33 = timings.filter((t) => t > 33.33);
      const longFrames50 = timings.filter((t) => t > 50);
      return {
        totalFrames: timings.length,
        framesOver33ms: longFrames33.length,
        framesOver50ms: longFrames50.length,
        maxFrameDuration: timings.length ? Math.max(...timings) : 0,
      };
    });

    console.log('[PERF BENCHMARK] 4x CPU Throttle Home Load:', frameStats);

    // Disable CPU throttling for tab-switch measurement
    await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });

    // 2. Measure Tab Switch Duration (Click to target heading visible, no artificial waits)
    const tabs = [
      { name: 'Stock', selector: 'a[href="/stock"]', heading: 'Stock & Inventory' },
      { name: 'Debts', selector: 'a[href="/debts"]', heading: 'Customers & Credit Ledger' },
      { name: 'Reports', selector: 'a[href="/reports"]', heading: 'Business Reports' },
      { name: 'Home', selector: 'a[href="/home"]', heading: 'Shop Dashboard' },
    ];

    // Cold switch measurements (first pass)
    const coldResults: Record<string, number> = {};
    for (const tab of tabs) {
      const tabLink = page.locator(`nav[aria-label="Desktop Navigation"] ${tab.selector}`).first();
      const heading = page.locator(`h1:has-text("${tab.heading}")`).first();

      const startTime = performance.now();
      await tabLink.click();
      await heading.waitFor({ state: 'visible', timeout: 10000 });
      const duration = performance.now() - startTime;
      coldResults[tab.name] = Math.round(duration);
    }

    console.log('[PERF BENCHMARK] Tab-switch cold durations (ms):', coldResults);

    // Warm switch measurements (10 iterations)
    const warmSamples: Record<string, number[]> = {
      Stock: [],
      Debts: [],
      Reports: [],
      Home: [],
    };

    for (let i = 0; i < 5; i++) {
      for (const tab of tabs) {
        const tabLink = page.locator(`nav[aria-label="Desktop Navigation"] ${tab.selector}`).first();
        const heading = page.locator(`h1:has-text("${tab.heading}")`).first();

        const startTime = performance.now();
        await tabLink.click();
        await heading.waitFor({ state: 'visible', timeout: 10000 });
        const duration = performance.now() - startTime;
        warmSamples[tab.name].push(Math.round(duration));
      }
    }

    const calcP50 = (arr: number[]) => {
      const sorted = [...arr].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length * 0.5)];
    };
    const calcP95 = (arr: number[]) => {
      const sorted = [...arr].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length * 0.95)];
    };

    const summary: Record<string, any> = {};
    for (const tab of tabs) {
      summary[tab.name] = {
        cold: coldResults[tab.name],
        warmP50: calcP50(warmSamples[tab.name]),
        warmP95: calcP95(warmSamples[tab.name]),
        samples: warmSamples[tab.name],
      };
    }

    console.log('[PERF BENCHMARK] Tab-switch summary:', JSON.stringify(summary, null, 2));
    expect(frameStats.totalFrames).toBeGreaterThan(10);
  });
});
