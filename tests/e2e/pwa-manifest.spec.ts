import { test, expect } from '@playwright/test';

test.describe('E2E #11: PWA Manifest & App Shell', () => {
  test('manifest is valid and accessible', async ({ request }) => {
    const res = await request.get('/manifest.webmanifest');
    expect(res.ok()).toBeTruthy();
    const manifest = await res.json();
    expect(manifest.name).toBe('Tallo');
    expect(manifest.short_name).toBe('Tallo');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/home');
  });

  test('offline page renders fallback message', async ({ page }) => {
    await page.goto('/offline');
    await expect(page.getByRole('heading', { name: 'You are offline' })).toBeVisible();
  });
});
