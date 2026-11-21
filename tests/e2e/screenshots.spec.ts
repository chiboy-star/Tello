import { test } from '@playwright/test';
import { setupTestUserSession } from './auth.helper';
import * as path from 'path';
import * as fs from 'fs';

const screenshotDir = path.resolve(process.cwd(), 'tests/screenshots');

test.describe('Design Pass Visual Verification Screenshots', () => {
  test.beforeAll(async () => {
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  });

  test('Capture screenshots across light & dark at 375px and 1280px', async ({ browser }) => {
    test.setTimeout(240000);

    const viewports = [
      { name: '375px', width: 375, height: 667 },
      { name: '1280px', width: 1280, height: 800 },
    ];

    const themes: ('light' | 'dark')[] = ['light', 'dark'];

    // 1. Landing Page (unauthenticated)
    for (const vp of viewports) {
      for (const th of themes) {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          colorScheme: th,
        });
        const page = await context.newPage();
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Ensure theme class is applied
        await page.evaluate((theme) => {
          if (theme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }, th);

        const outPath = path.join(screenshotDir, `landing-${vp.name}-${th}.png`);
        await page.screenshot({ path: outPath, fullPage: false });
        await context.close();
      }
    }

    // 2. App Pages (authenticated)
    const authContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const authPage = await authContext.newPage();
    await setupTestUserSession(authPage);

    // Save storage state for reuse
    const storageState = await authContext.storageState();
    await authContext.close();

    const appRoutes = [
      { name: 'home', path: '/home', waitFor: 'text=Shop Dashboard' },
      { name: 'sell', path: '/sell', waitFor: 'text=Confirm Sale' },
      { name: 'stock', path: '/stock', waitFor: 'text=Stock & Inventory' },
      { name: 'debts', path: '/debts', waitFor: 'text=Customers & Credit Ledger' },
      { name: 'reports', path: '/reports', waitFor: 'text=Business Reports' },
    ];

    for (const route of appRoutes) {
      for (const vp of viewports) {
        for (const th of themes) {
          const context = await browser.newContext({
            storageState,
            viewport: { width: vp.width, height: vp.height },
            colorScheme: th,
          });
          const page = await context.newPage();
          await page.goto(route.path);
          await page.waitForSelector(route.waitFor, { timeout: 15000 });
          await page.waitForTimeout(300); // Allow any transitions to settle

          await page.evaluate((theme) => {
            if (theme === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          }, th);

          const outPath = path.join(screenshotDir, `${route.name}-${vp.name}-${th}.png`);
          await page.screenshot({ path: outPath, fullPage: false });
          await context.close();
        }
      }
    }
  });

  test('Capture BrandSplash frame strip at 0, 100, 300, 600, 1000, 1500, 2000 ms in dark mode opening /home', async ({ browser }) => {
    test.setTimeout(90000);

    // 1. Setup authenticated session
    const setupContext = await browser.newContext();
    const setupPage = await setupContext.newPage();
    await setupTestUserSession(setupPage);
    const storageState = await setupContext.storageState();
    await setupContext.close();

    // 2. Open fresh context in dark mode without tallo.splash.session
    const context = await browser.newContext({
      storageState,
      colorScheme: 'dark',
      viewport: { width: 1280, height: 800 },
      recordVideo: {
        dir: screenshotDir,
        size: { width: 1280, height: 800 },
      },
    });

    const page = await context.newPage();
    await page.goto('/home');

    const targetTimes = [0, 100, 300, 600, 1000, 1500, 2000];
    for (const ms of targetTimes) {
      await page.evaluate((targetMs) => {
        document.getAnimations().forEach((anim) => {
          anim.currentTime = targetMs;
          anim.pause();
        });
      }, ms);

      const splash = page.locator('#brand-splash');
      await splash.screenshot({ path: path.join(screenshotDir, `splash-dark-home-${ms}ms.png`) });
      await splash.screenshot({ path: path.join(screenshotDir, `splash-frame-${ms}ms.png`) });
    }

    await page.evaluate(() => {
      document.getAnimations().forEach((anim) => anim.play());
    });
    await page.waitForTimeout(2000);

    const video = page.video();
    await page.close();
    await context.close();

    if (video) {
      const videoPath = await video.path();
      try {
        fs.copyFileSync(videoPath, path.join(screenshotDir, 'splash-dark-home-recording.webm'));
        fs.copyFileSync(videoPath, path.join(screenshotDir, 'splash-screen-recording.webm'));
      } catch {}
    }
  });
});
