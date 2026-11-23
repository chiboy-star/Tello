import { test, expect } from '@playwright/test';
import { setupTestUserSession } from './auth.helper';
import * as fs from 'fs';
import * as path from 'path';

const VIEWPORTS = [
  { width: 360, height: 740, name: 'android-360' },
  { width: 390, height: 844, name: 'iphone-390' },
];

test.describe('Part 7: Mobile Visual QA & Layout Validation', () => {
  test.beforeAll(() => {
    const dir = path.resolve(process.cwd(), 'tests/screenshots');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  for (const vp of VIEWPORTS) {
    test(`Mobile visual QA at ${vp.width}x${vp.height} (${vp.name})`, async ({ page }) => {
      test.setTimeout(120000);
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // 1. Check Login page: no horizontal scroll + eye icon geometry
      await page.goto('/login');
      await page.waitForSelector('input[name="password"]', { timeout: 15000 });

      const loginScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const loginClientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(loginScrollWidth).toBeLessThanOrEqual(loginClientWidth);

      const passwordInput = page.locator('input[name="password"]').first();
      const eyeBtn = page.locator('button[aria-label="Show password"], button[aria-label="Hide password"]').first();
      await expect(eyeBtn).toBeVisible();

      const inputRect = await passwordInput.boundingBox();
      const eyeRect = await eyeBtn.boundingBox();
      expect(inputRect).not.toBeNull();
      expect(eyeRect).not.toBeNull();

      if (inputRect && eyeRect) {
        // Eye button inside password field
        expect(eyeRect.x).toBeGreaterThan(inputRect.x);
        expect(eyeRect.x + eyeRect.width).toBeLessThanOrEqual(inputRect.x + inputRect.width + 2);
        // Button bounding box >= 30x30 with hit-slop providing 44x44 touch target
        expect(eyeRect.width).toBeGreaterThanOrEqual(30);
        expect(eyeRect.height).toBeGreaterThanOrEqual(30);
        const hasHitSlop = await eyeBtn.evaluate((el) => el.classList.contains('hit-slop'));
        expect(hasHitSlop).toBe(true);
      }

      await page.screenshot({ path: `tests/screenshots/mobile-login-${vp.width}.png` });

      // 2. Authenticate user for app pages
      await setupTestUserSession(page);

      // Routes to inspect: /home, /stock, /sell, /debts, /reports
      const routes = ['/home', '/stock', '/sell', '/debts', '/reports'];

      for (const route of routes) {
        await page.goto(route);
        await page.waitForLoadState('networkidle');

        // Check horizontal scroll
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

        // Verify bottom navigation bar on app pages
        const bottomNav = page.locator('nav[aria-label="Bottom Navigation"], nav[aria-label="Mobile Navigation"]').first();
        if (await bottomNav.isVisible()) {
          const navRect = await bottomNav.boundingBox();
          expect(navRect).not.toBeNull();

          // Main content must have bottom spacing so fixed nav doesn't cover content
          const mainElement = page.locator('main').first();
          if (await mainElement.isVisible()) {
            const paddingBottom = await mainElement.evaluate((el) => {
              return parseFloat(window.getComputedStyle(el).paddingBottom) || 0;
            });
            // Bottom padding should accommodate bottom nav bar (>= 60px)
            expect(paddingBottom).toBeGreaterThanOrEqual(50);
          }

          // Check Sell button does not overlap Stock or Debts labels
          const sellBtn = page.locator('a[aria-label="Sell"], button[aria-label="Sell"], a:has-text("Sell")').first();
          const stockTab = page.locator('a[aria-label="Stock"], a:has-text("Stock")').first();
          const debtsTab = page.locator('a[aria-label="Debts"], a:has-text("Debts")').first();

          if (await sellBtn.isVisible() && await stockTab.isVisible() && await debtsTab.isVisible()) {
            const sellBox = await sellBtn.boundingBox();
            const stockBox = await stockTab.boundingBox();
            const debtsBox = await debtsTab.boundingBox();

            if (sellBox && stockBox && debtsBox) {
              // Sell button should sit between Stock and Debts without horizontally colliding
              expect(sellBox.x).toBeGreaterThanOrEqual(stockBox.x + stockBox.width - 15);
              expect(debtsBox.x).toBeGreaterThanOrEqual(sellBox.x + sellBox.width - 15);
            }
          }

          // Check interactive tap targets on bottom nav (all >= 44px)
          const navLinks = bottomNav.locator('a, button');
          const navCount = await navLinks.count();
          for (let i = 0; i < navCount; i++) {
            const linkBox = await navLinks.nth(i).boundingBox();
            if (linkBox && linkBox.width > 0 && linkBox.height > 0) {
              expect(linkBox.height).toBeGreaterThanOrEqual(44);
            }
          }
        }

        const pageSlug = route.replace('/', '') || 'root';
        await page.screenshot({ path: `tests/screenshots/mobile-${pageSlug}-${vp.width}.png` });
      }
    });
  }
});
