import { test, expect } from '@playwright/test';

test.describe('Part 1: Production Stylesheet Delivery & Applied Styling', () => {
  test('all stylesheet links in SSR HTML return HTTP 200 with text/css for unauthenticated requests', async ({
    page,
    request,
  }) => {
    // 1. Visit landing page logged out
    const response = await page.goto('/?splash=0');
    expect(response?.status()).toBe(200);

    // 2. Query all <link rel="stylesheet"> elements
    const linkHrefs = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      return links.map((l) => l.getAttribute('href')).filter(Boolean) as string[];
    });

    expect(linkHrefs.length).toBeGreaterThan(0);

    // 3. For each stylesheet, make direct unauthenticated request
    for (const href of linkHrefs) {
      const cssRes = await request.get(href);
      expect(cssRes.status(), `Stylesheet ${href} must return 200`).toBe(200);

      const contentType = cssRes.headers()['content-type'] || '';
      expect(contentType, `Stylesheet ${href} must have text/css content-type`).toContain('text/css');

      const body = await cssRes.text();
      expect(body.length, `Stylesheet ${href} must not be empty`).toBeGreaterThan(1000);
      expect(body, `Stylesheet ${href} must contain utilities`).toContain('.flex');
    }

    // 4. Verify computed styles on landing elements (ensuring styles actually applied)
    const heroHeading = page.locator('h1').first();
    await expect(heroHeading).toBeVisible();

    const headingStyles = await heroHeading.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        fontFamily: computed.fontFamily,
        fontWeight: computed.fontWeight,
      };
    });
    // Heading should have styled font weight (bold / 700 or 800)
    expect(Number(headingStyles.fontWeight)).toBeGreaterThanOrEqual(600);
  });
});
