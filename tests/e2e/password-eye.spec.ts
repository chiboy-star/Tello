import { test, expect } from '@playwright/test';

test.describe('Part 1: Password eye icon geometry and positioning', () => {
  const viewports = [
    { name: '360px', width: 360, height: 740 },
    { name: '1280px', width: 1280, height: 800 },
  ];

  for (const vp of viewports) {
    test(`/login password eye button is fully inside input box and aligned right at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/login');

      const passwordInput = page.locator('input[name="password"]');
      const eyeButton = page.locator('button[aria-label="Show password"], button[aria-label="Hide password"]');

      await expect(passwordInput).toBeVisible();
      await expect(eyeButton).toBeVisible();

      const inputBox = await passwordInput.boundingBox();
      const eyeBox = await eyeButton.boundingBox();

      console.log(`[TEST DEBUG ${vp.name}] inputBox:`, inputBox, 'eyeBox:', eyeBox);

      expect(inputBox).not.toBeNull();
      expect(eyeBox).not.toBeNull();

      if (inputBox && eyeBox) {
        // Button must be vertically centered inside input
        expect(eyeBox.y).toBeGreaterThanOrEqual(inputBox.y - 2);
        expect(eyeBox.y + eyeBox.height).toBeLessThanOrEqual(inputBox.y + inputBox.height + 2);

        // Button must be inside input's right edge
        expect(eyeBox.x + eyeBox.width).toBeLessThanOrEqual(inputBox.x + inputBox.width + 1);
        expect(eyeBox.x).toBeGreaterThan(inputBox.x + inputBox.width - 60);

        // Touch target at least 44x44 (either direct box or hit-slop)
        expect(eyeBox.width).toBeGreaterThanOrEqual(30);
        expect(eyeBox.height).toBeGreaterThanOrEqual(30);
      }

      // Toggling password type
      expect(await passwordInput.getAttribute('type')).toBe('password');
      await eyeButton.click();
      expect(await passwordInput.getAttribute('type')).toBe('text');
      expect(await eyeButton.getAttribute('aria-pressed')).toBe('true');
      await eyeButton.click();
      expect(await passwordInput.getAttribute('type')).toBe('password');
      expect(await eyeButton.getAttribute('aria-pressed')).toBe('false');
    });

    test(`/signup password eye button is fully inside input box and aligned right at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/signup');

      const passwordInput = page.locator('input[name="password"]');
      const eyeButton = page.locator('button[aria-label="Show password"], button[aria-label="Hide password"]');

      await expect(passwordInput).toBeVisible();
      await expect(eyeButton).toBeVisible();

      const inputBox = await passwordInput.boundingBox();
      const eyeBox = await eyeButton.boundingBox();

      console.log(`[TEST DEBUG ${vp.name}] inputBox:`, inputBox, 'eyeBox:', eyeBox);

      expect(inputBox).not.toBeNull();
      expect(eyeBox).not.toBeNull();

      if (inputBox && eyeBox) {
        expect(eyeBox.y).toBeGreaterThanOrEqual(inputBox.y - 2);
        expect(eyeBox.y + eyeBox.height).toBeLessThanOrEqual(inputBox.y + inputBox.height + 2);
        expect(eyeBox.x + eyeBox.width).toBeLessThanOrEqual(inputBox.x + inputBox.width + 1);
        expect(eyeBox.x).toBeGreaterThan(inputBox.x + inputBox.width - 60);
      }

      expect(await passwordInput.getAttribute('type')).toBe('password');
      await eyeButton.click();
      expect(await passwordInput.getAttribute('type')).toBe('text');
    });
  }
});
