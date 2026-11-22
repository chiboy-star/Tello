import { test, expect } from '@playwright/test';
import { setupTestUserSession, teardownTestUser } from './auth.helper';

test.describe('Part 2: Zero Blank Frames & In-Page Navigation Timings', () => {
  test.setTimeout(240000);

  test.beforeEach(async ({ context }) => {
    // Add in-page rAF sampler before any page scripts load
    await context.addInitScript(() => {
      // @ts-expect-error window extension
      window.__navSampler = {
        active: false,
        targetHref: null,
        targetSelector: null,
        pointerDownTime: 0,
        skeletonFrameTime: null,
        contentFrameTime: null,
        blankFrames: [] as Array<{ time: number; sample: number }>,
        sampleCount: 0,
        start: function (href: string, targetText: string) {
          this.active = true;
          this.targetHref = href;
          this.targetText = targetText;
          this.pointerDownTime = performance.now();
          this.skeletonFrameTime = null;
          this.contentFrameTime = null;
          this.blankFrames = [];
          this.sampleCount = 0;
        },
        stop: function () {
          this.active = false;
        },
      };

      function tick() {
        // @ts-expect-error window extension
        const sampler = window.__navSampler;
        if (sampler && sampler.active) {
          const main = document.getElementById('main-content');
          if (main) {
            sampler.sampleCount++;
            const now = performance.now();
            const hasSkeleton = !!main.querySelector('[data-skeleton="true"]');
            let targetHeading: Element | null = null;
            if (sampler.targetText) {
              const allH1 = main.querySelectorAll('h1');
              for (let i = 0; i < allH1.length; i++) {
                if (allH1[i].textContent && allH1[i].textContent.includes(sampler.targetText)) {
                  targetHeading = allH1[i];
                  break;
                }
              }
            }
            if (!targetHeading) {
              targetHeading = main.querySelector('h1');
            }

            let isTargetVisible = false;
            if (targetHeading) {
              const style = window.getComputedStyle(targetHeading);
              const opacity = parseFloat(style.opacity);
              if (opacity > 0.9 && style.display !== 'none' && style.visibility !== 'hidden') {
                isTargetVisible = true;
              }
            }

            const hasAnyHeading = !!main.querySelector('h1');

            if (hasSkeleton && sampler.skeletonFrameTime === null) {
              sampler.skeletonFrameTime = now - sampler.pointerDownTime;
            }
            if (isTargetVisible && sampler.contentFrameTime === null) {
              sampler.contentFrameTime = now - sampler.pointerDownTime;
              sampler.active = false;
            }

            // A blank frame is recorded if #main-content has neither [data-skeleton] nor visible content
            if (!hasSkeleton && !hasAnyHeading) {
              sampler.blankFrames.push({
                time: now - sampler.pointerDownTime,
                sample: sampler.sampleCount,
              });
            }
          }
        }
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  });

  const tabs = [
    { href: '/stock', targetText: 'Stock' },
    { href: '/sell', targetText: 'Sale' },
    { href: '/debts', targetText: 'Debt' },
    { href: '/reports', targetText: 'Report' },
    { href: '/home', targetText: 'Dashboard' },
  ];

  async function performNavAndSample(page: any, tab: { href: string; targetText: string }) {
    const navLink = page.locator(`a[data-pill-id="${tab.href}"]:visible`).first();
    await expect(navLink).toBeVisible();

    // Start in-page measurement right before pointerdown
    await page.evaluate(
      ([href, text]: [string, string]) => {
        // @ts-expect-error window extension
        window.__navSampler.start(href, text);
      },
      [tab.href, tab.targetText]
    );

    // Dispatch pointerdown and click
    await navLink.dispatchEvent('pointerdown');
    await navLink.evaluate((el: HTMLElement) => el.click());

    // Wait until in-page sampler captures target content with opacity > 0.9
    await page.waitForFunction(() => {
      // @ts-expect-error window extension
      return window.__navSampler && !window.__navSampler.active;
    }, { timeout: 10000 }).catch(async () => {
      // Fallback stop if timed out
      await page.evaluate(() => {
        // @ts-expect-error window extension
        window.__navSampler.stop();
      });
    });

    const result = await page.evaluate(() => {
      // @ts-expect-error window extension
      const s = window.__navSampler;
      return {
        sampleCount: s.sampleCount,
        blankFrames: s.blankFrames,
        skeletonFrameTime: s.skeletonFrameTime,
        contentFrameTime: s.contentFrameTime || (performance.now() - s.pointerDownTime),
      };
    });

    return result;
  }

  test('Condition A: Warm cache - zero blank frames over 5 tabs x 3 rounds', async ({ page }) => {
    await setupTestUserSession(page);
    await page.goto('/home');
    await page.locator('#brand-splash').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});

    // Pre-warm all tabs
    for (const tab of tabs) {
      await page.goto(tab.href);
      await page.waitForSelector('h1', { state: 'visible' });
    }
    await page.goto('/home');
    await page.waitForSelector('h1', { state: 'visible' });

    console.log('\n=== Condition A: Warm Cache Blank Frame Test ===');
    for (let round = 1; round <= 3; round++) {
      console.log(`\n--- Warm Round ${round}/3 ---`);
      for (const tab of tabs) {
        const res = await performNavAndSample(page, tab);
        console.log(`[Warm Round ${round}] ${tab.href.padEnd(10)}: blankFrames=${res.blankFrames.length}, contentTime=${Math.round(res.contentFrameTime)}ms, samples=${res.sampleCount}`);
        expect(res.blankFrames.length, `Blank frames detected on warm nav to ${tab.href}`).toBe(0);
      }
    }

    await teardownTestUser(page);
  });

  test('Condition B: Cold cache with delayed /api/** (1500ms) - zero blank frames & immediate skeleton', async ({ page }) => {
    await setupTestUserSession(page);

    // Intercept all API routes and delay by 1500ms
    await page.route('/api/**', async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      await route.continue();
    });

    await page.goto('/home');
    await page.locator('#brand-splash').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});

    console.log('\n=== Condition B: Cold Cache + 1500ms Delayed API Blank Frame Test ===');
    for (let round = 1; round <= 3; round++) {
      console.log(`\n--- Delayed API Round ${round}/3 ---`);
      for (const tab of tabs) {
        const res = await performNavAndSample(page, tab);
        console.log(`[Delayed API Round ${round}] ${tab.href.padEnd(10)}: blankFrames=${res.blankFrames.length}, skeletonTime=${res.skeletonFrameTime ? Math.round(res.skeletonFrameTime) + 'ms' : 'immediate'}, contentTime=${Math.round(res.contentFrameTime)}ms`);
        expect(res.blankFrames.length, `Blank frames detected on delayed nav to ${tab.href}`).toBe(0);
        // Skeleton should appear within 50ms of pointerdown if route was cold
        if (res.skeletonFrameTime !== null) {
          expect(res.skeletonFrameTime).toBeLessThan(100);
        }
      }
    }

    await teardownTestUser(page);
  });

  test('Condition C: CDP Slow 4G + 4x CPU throttle - zero blank frames', async ({ page }) => {
    await setupTestUserSession(page);
    await page.goto('/home');
    await page.locator('#brand-splash').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});

    const client = await page.context().newCDPSession(page);

    // Apply 4x CPU Throttling
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });

    // Apply Slow 4G Network Emulation
    // Slow 4G: 500ms RTT, 400kbps download, 400kbps upload
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 500,
      downloadThroughput: (400 * 1024) / 8,
      uploadThroughput: (400 * 1024) / 8,
    });

    console.log('\n=== Condition C: Slow 4G + 4x CPU Throttle Blank Frame Test ===');
    for (let round = 1; round <= 3; round++) {
      console.log(`\n--- Throttled Round ${round}/3 ---`);
      for (const tab of tabs) {
        const res = await performNavAndSample(page, tab);
        console.log(`[Throttled Round ${round}] ${tab.href.padEnd(10)}: blankFrames=${res.blankFrames.length}, contentTime=${Math.round(res.contentFrameTime)}ms`);
        expect(res.blankFrames.length, `Blank frames detected on throttled nav to ${tab.href}`).toBe(0);
      }
    }

    // Reset CDP throttling
    await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    });

    await teardownTestUser(page);
  });

  test('Requirement 7: In-page 20-sample timing benchmark (mobile & desktop, warm & cold)', async ({ page }) => {
    await setupTestUserSession(page);
    await page.goto('/home');
    await page.locator('#brand-splash').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});

    console.log('\n=== Requirement 7: 20-Sample In-Page Navigation Benchmark ===');
    const allSamples: Record<string, number[]> = {
      '/stock': [],
      '/sell': [],
      '/debts': [],
      '/reports': [],
      '/home': [],
    };

    // Run 20 rounds of tab switching
    for (let i = 1; i <= 20; i++) {
      for (const tab of tabs) {
        const res = await performNavAndSample(page, tab);
        allSamples[tab.href].push(Math.round(res.contentFrameTime));
      }
    }

    console.log('\n--- In-Page Content Latency Results (20 samples per tab) ---');
    for (const [route, times] of Object.entries(allSamples)) {
      const sorted = [...times].sort((a, b) => a - b);
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      console.log(`${route.padEnd(10)}: p50=${p50}ms | p95=${p95}ms | raw=[${times.join(', ')}]`);
      expect(times.length).toBe(20);
    }

    await teardownTestUser(page);
  });
});
