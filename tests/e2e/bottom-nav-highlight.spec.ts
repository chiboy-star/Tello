import { test, expect } from '@playwright/test';
import { setupTestUserSession } from './auth.helper';
import * as path from 'path';
import * as fs from 'fs';

const screenshotDir = path.resolve(process.cwd(), 'tests/screenshots');

test.describe('Part 2: Bottom Navigation Highlight Geometry & Placement', () => {
  test.setTimeout(60000);
  test.beforeAll(() => {
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  });

  const routes = [
    { name: 'Home', href: '/home', label: 'Home' },
    { name: 'Stock', href: '/stock', label: 'Stock' },
    { name: 'Sell', href: '/sell', label: 'Sell' },
    { name: 'Debts', href: '/debts', label: 'Debts' },
    { name: 'Reports', href: '/reports', label: 'Reports' },
  ];

  const viewports = [
    { name: '360px', width: 360, height: 740 },
    { name: '390px', width: 390, height: 844 },
    { name: '430px', width: 430, height: 932 },
  ];

  for (const vp of viewports) {
    for (const route of routes) {
      test(`Mobile nav highlight at ${vp.name} on direct load of ${route.href}`, async ({ browser }) => {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
        });
        const page = await context.newPage();
        await setupTestUserSession(page);
        await page.goto(route.href);

        const nav = page.locator('nav[aria-label="Mobile Navigation"]');
        await expect(nav).toBeVisible();

        const activeItem = nav.locator(`[data-pill-id="${route.href}"]`);
        await expect(activeItem).toBeVisible();
        const activeBox = await activeItem.boundingBox();
        expect(activeBox).not.toBeNull();

        const pill = nav.locator('[data-sliding-pill]');
        
        if (route.href === '/sell') {
          // Sell is raised primary action: no sliding pill should be rendered under or behind it!
          // Active state is indicated by ring/styling on the Sell button itself
          await expect(pill).not.toBeVisible();
        } else {
          await expect(pill).toBeVisible();
          const pillBox = await pill.boundingBox();
          expect(pillBox).not.toBeNull();

          if (pillBox && activeBox) {
            const pillCenterX = pillBox.x + pillBox.width / 2;
            const activeCenterX = activeBox.x + activeBox.width / 2;

            const pillHtml = await pill.evaluate(el => el.outerHTML);
            const navHtml = await nav.evaluate(el => el.innerHTML);
            console.log(`[NAV DEBUG ${vp.name} ${route.href}] activeCenterX: ${activeCenterX}, pillCenterX: ${pillCenterX}, pillBox:`, pillBox, 'activeBox:', activeBox, 'pillHtml:', pillHtml, 'navHtml:', navHtml);

            // Highlight centre x within 2.5px of active item centre x
            expect(Math.abs(pillCenterX - activeCenterX)).toBeLessThanOrEqual(2.5);

            // Must NOT overlap any other non-active tab's centre
            for (const other of routes) {
              if (other.href === route.href) continue;
              const otherItem = nav.locator(`[data-pill-id="${other.href}"]`);
              const otherBox = await otherItem.boundingBox();
              if (otherBox) {
                expect(pillCenterX < otherBox.x || pillCenterX > otherBox.x + otherBox.width).toBe(true);
              }
            }
          }
        }

        if (vp.width === 390) {
          await page.screenshot({ path: path.join(screenshotDir, `nav-${route.name.toLowerCase()}-390px.png`) });
        }
        await context.close();
      });
    }
  }

  test('Click through all 5 tabs in sequence and assert highlight at each step at 390px', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await setupTestUserSession(page);
    await page.goto('/home');

    const nav = page.locator('nav[aria-label="Mobile Navigation"]');
    await expect(nav).toBeVisible();

    for (const route of routes) {
      const tabLink = nav.locator(`[data-pill-id="${route.href}"]`);
      await tabLink.click();
      await page.waitForURL(new RegExp(route.href));

      const pill = nav.locator('[data-sliding-pill]');
      if (route.href === '/sell') {
        await expect(pill).not.toBeVisible();
      } else {
        await expect(pill).toBeVisible();
        const activeBox = await tabLink.boundingBox();
        const pillBox = await pill.boundingBox();
        expect(activeBox).not.toBeNull();
        expect(pillBox).not.toBeNull();

        if (pillBox && activeBox) {
          const pillCenterX = pillBox.x + pillBox.width / 2;
          const activeCenterX = activeBox.x + activeBox.width / 2;
          expect(Math.abs(pillCenterX - activeCenterX)).toBeLessThanOrEqual(2.5);
        }
      }
    }
    await context.close();
  });
});

