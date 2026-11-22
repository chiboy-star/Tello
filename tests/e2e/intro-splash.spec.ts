import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { setupTestUserSession, teardownTestUser } from './auth.helper';

const screenshotDir = path.resolve(process.cwd(), 'tests', 'screenshots');

test.describe('Part 1 & 3: Splash Policy, Smoothness & Loop while not ready', () => {
  test('fresh context opening / shows splash within 500ms, plays intro in full, and hides by 3.5s', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');

    const splash = page.locator('#brand-splash');
    await expect(splash).toBeVisible({ timeout: 500 });

    // Intro plays in full: still visible at 1000ms
    await page.waitForTimeout(1000);
    await expect(splash).toBeVisible();

    // Hides cleanly once ready and intro complete
    await expect(splash).not.toBeVisible({ timeout: 3500 });

    const sessionFlag = await page.evaluate(() => sessionStorage.getItem('tallo.splash.session'));
    expect(sessionFlag).toBe('1');
    const hasSeenFlag = await page.evaluate(() => localStorage.getItem('tallo.intro.v1'));
    expect(hasSeenFlag).toBe('1');
  });

  test('opening /home directly as a logged-in user also shows splash in fresh session', async ({ browser }) => {
    test.setTimeout(60000);
    const setupContext = await browser.newContext();
    const setupPage = await setupContext.newPage();
    await setupTestUserSession(setupPage);
    const storageState = await setupContext.storageState();
    await setupContext.close();

    const freshContext = await browser.newContext({ storageState });
    const freshPage = await freshContext.newPage();
    await freshPage.goto('/home');

    const splash = freshPage.locator('#brand-splash');
    await expect(splash).toBeVisible({ timeout: 500 });
    await expect(splash).not.toBeVisible({ timeout: 3500 });

    await teardownTestUser(freshPage);
    await freshContext.close();
  });

  test('a second navigation in the same tab does not show splash', async ({ page }) => {
    await page.goto('/');
    const splash = page.locator('#brand-splash');
    await expect(splash).toBeVisible({ timeout: 500 });
    await expect(splash).not.toBeVisible({ timeout: 3500 });

    await page.goto('/login');
    await expect(splash).not.toBeVisible({ timeout: 500 });
  });

  test('a new context (new session) shows it again', async ({ browser }) => {
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    await page1.goto('/');
    const splash1 = page1.locator('#brand-splash');
    await expect(splash1).toBeVisible({ timeout: 500 });
    await expect(splash1).not.toBeVisible({ timeout: 3500 });
    await context1.close();

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

    expect(html).toContain('name="color-scheme"');
    expect(html).toContain('content="light dark"');
    expect(html).toContain('#brand-splash');
    expect(html).toContain('background-color: #0E1512');
    expect(html).toContain('background-color: #F7F6F2');
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
    await expect(splash).not.toBeVisible({ timeout: 2500 });
  });

  test('reduced motion: shows final lockup only and never loops', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/?splash=1', { waitUntil: 'commit' });
    const splash = page.locator('#brand-splash');
    await expect(splash).toBeVisible({ timeout: 1000 });
    const strike = splash.locator('.splash-strike');
    await expect(strike).toHaveCSS('stroke-dashoffset', '0px');
    await expect(splash).not.toHaveClass(/splash-looping/);
  });

  // Part 3 New Tests:
  test('delayed app (5s): keeps splash visible and seamlessly looping with amber slash pulse', async ({ page }) => {
    test.setTimeout(30000);

    // Block app-ready signal artificially by delaying the ready dispatch
    await page.addInitScript(() => {
      // @ts-expect-error test hook
      window.__TALLO_DELAY_APP_READY_MS = 5000;
    });

    await page.goto('/?splash=1');
    const splash = page.locator('#brand-splash');
    await expect(splash).toBeVisible({ timeout: 500 });

    // Past 1.9s, intro is done but app is delayed: must enter loop!
    await page.waitForTimeout(2500);
    await expect(splash).toBeVisible();
    await expect(splash).toHaveClass(/splash-looping/);

    // Still looping at 4.5s
    await page.waitForTimeout(2000);
    await expect(splash).toBeVisible();

    // After 5s delay expires, splash receives signal and fades out cleanly over 200ms
    await expect(splash).not.toBeVisible({ timeout: 3500 });
  });

  test('worst-case safety cap: splash is guaranteed gone by 8.5s even if app never signals ready', async ({ page }) => {
    test.setTimeout(30000);

    // Suppress app-ready signal entirely
    await page.addInitScript(() => {
      // @ts-expect-error test hook
      window.__TALLO_SUPPRESS_APP_READY = true;
    });

    await page.goto('/?splash=1');
    const splash = page.locator('#brand-splash');
    await expect(splash).toBeVisible({ timeout: 500 });

    // Enters loop
    await page.waitForTimeout(2200);
    await expect(splash).toBeVisible();
    await expect(splash).toHaveClass(/splash-looping/);

    // Safety cap: by 8.5s it must be gone!
    await expect(splash).not.toBeVisible({ timeout: 7000 });
  });

  test('Part 3 Smoothness Audit: frame deltas recorded across Desktop, Mobile 4x, Mobile 6x+4G', async ({
    browser,
  }) => {
    test.setTimeout(120000);
    const results: Record<string, { p50: number; p95: number; max: number; over20: number; over33: number }> = {};

    const conditions = [
      { name: 'Desktop (No Throttle)', cpuRate: 1, slow4g: false },
      { name: 'Mobile 4x CPU Throttle', cpuRate: 4, slow4g: false },
      { name: 'Mobile 6x CPU Throttle + Slow 4G', cpuRate: 6, slow4g: true },
    ];

    for (const cond of conditions) {
      const ctx = await browser.newContext({
        viewport: cond.name.includes('Mobile') ? { width: 375, height: 667 } : { width: 1280, height: 800 },
        isMobile: cond.name.includes('Mobile'),
      });
      const p = await ctx.newPage();

      // Setup CDP throttling
      const client = await ctx.newCDPSession(p);
      if (cond.cpuRate > 1) {
        await client.send('Emulation.setCPUThrottlingRate', { rate: cond.cpuRate });
      }
      if (cond.slow4g) {
        // Slow 4G: Latency 100ms, Download 400kbps, Upload 400kbps
        await client.send('Network.emulateNetworkConditions', {
          offline: false,
          latency: 100,
          downloadThroughput: (400 * 1024) / 8,
          uploadThroughput: (400 * 1024) / 8,
        });
      }

      // Add rAF frame delta recorder
      await p.addInitScript(() => {
        // @ts-expect-error window audit
        window.__frameDeltas = [];
        let last = performance.now();
        function loop(now: number) {
          const delta = now - last;
          // @ts-expect-error window audit
          window.__frameDeltas.push(delta);
          last = now;
          // Record for ~2.5s (about 150 frames)
          // @ts-expect-error window audit
          if (window.__frameDeltas.length < 160) {
            requestAnimationFrame(loop);
          }
        }
        requestAnimationFrame(loop);
      });

      await p.goto('/?splash=1');
      await p.waitForTimeout(2500);

      const deltas: number[] = await p.evaluate(() => {
        // @ts-expect-error window audit
        return window.__frameDeltas || [];
      });

      // Ignore the initial 2 frames of document initialization
      const validDeltas = deltas.slice(2).filter((d) => d > 0);
      validDeltas.sort((a, b) => a - b);

      const p50 = Math.round(validDeltas[Math.floor(validDeltas.length * 0.5)] || 16);
      const p95 = Math.round(validDeltas[Math.floor(validDeltas.length * 0.95)] || 16);
      const max = Math.round(validDeltas[validDeltas.length - 1] || 16);
      const over20 = validDeltas.filter((d) => d > 20).length;
      const over33 = validDeltas.filter((d) => d > 33).length;

      results[cond.name] = { p50, p95, max, over20, over33 };
      console.log(`\n[Smoothness Audit - ${cond.name}]: p50=${p50}ms, p95=${p95}ms, max=${max}ms, >20ms=${over20}, >33ms=${over33}`);

      expect(p50).toBeLessThanOrEqual(35);
      await ctx.close();
    }
  });

  test('Part 3 Seams & Frame Strip: captures 0, 500, 1000, 1500, 2000, 3000, 5000ms with 5s delayed app', async ({
    browser,
  }) => {
    test.setTimeout(90000);
    fs.mkdirSync(screenshotDir, { recursive: true });

    const context = await browser.newContext({
      colorScheme: 'dark',
      viewport: { width: 375, height: 667 },
      recordVideo: {
        dir: screenshotDir,
        size: { width: 375, height: 667 },
      },
    });

    const page = await context.newPage();

    // 5s artificial ready delay
    await page.addInitScript(() => {
      // @ts-expect-error test hook
      window.__TALLO_DELAY_APP_READY_MS = 5000;
    });

    await page.goto('/?splash=1');

    const targetTimes = [0, 500, 1000, 1500, 2000, 3000, 5000];
    const startTime = Date.now();

    for (const targetMs of targetTimes) {
      const elapsed = Date.now() - startTime;
      const wait = targetMs - elapsed;
      if (wait > 0) {
        await page.waitForTimeout(wait);
      }
      const splash = page.locator('#brand-splash');
      if (await splash.isVisible()) {
        await page.screenshot({ path: path.join(screenshotDir, `splash-loop-delayed-${targetMs}ms.png`) });
      }
    }

    // Wait for splash to fade out after 5s
    await page.waitForTimeout(1000);
    await context.close();
  });
});
