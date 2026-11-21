import fs from 'node:fs';
import { chromium } from '@playwright/test';

async function generate() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const iconSvg = fs.readFileSync('public/icons/icon.svg', 'utf8');
  const maskableSvg = fs.readFileSync('public/icons/icon-maskable.svg', 'utf8');

  // 192x192 standard icon
  await page.setViewportSize({ width: 192, height: 192 });
  await page.setContent(`<!DOCTYPE html><html style="margin:0;padding:0;overflow:hidden;"><head><style>body,html{margin:0;padding:0;overflow:hidden;background:transparent;}svg{width:192px;height:192px;display:block;}</style></head><body>${iconSvg}</body></html>`);
  await page.locator('svg').screenshot({ path: 'public/icons/icon-192.png', omitBackground: true });
  console.log('Generated public/icons/icon-192.png');

  // 512x512 standard icon
  await page.setViewportSize({ width: 512, height: 512 });
  await page.setContent(`<!DOCTYPE html><html style="margin:0;padding:0;overflow:hidden;"><head><style>body,html{margin:0;padding:0;overflow:hidden;background:transparent;}svg{width:512px;height:512px;display:block;}</style></head><body>${iconSvg}</body></html>`);
  await page.locator('svg').screenshot({ path: 'public/icons/icon-512.png', omitBackground: true });
  console.log('Generated public/icons/icon-512.png');

  // 512x512 maskable icon
  await page.setContent(`<!DOCTYPE html><html style="margin:0;padding:0;overflow:hidden;"><head><style>body,html{margin:0;padding:0;overflow:hidden;background:#0E7C57;}svg{width:512px;height:512px;display:block;}</style></head><body>${maskableSvg}</body></html>`);
  await page.locator('svg').screenshot({ path: 'public/icons/icon-512-maskable.png', omitBackground: false });
  console.log('Generated public/icons/icon-512-maskable.png');

  await browser.close();
  console.log('All real PNG icons generated successfully.');
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
