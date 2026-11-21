import { test, expect } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';

const PROD_PORT = 3005;
const PROD_URL = `http://localhost:${PROD_PORT}`;

test.describe('Production Service Worker Verification', () => {
  let prodServer: ChildProcess;

  test.beforeAll(async () => {
    // Start Next.js production server on port 3005
    prodServer = spawn('npx', ['next', 'start', '-p', String(PROD_PORT)], {
      shell: true,
      stdio: 'pipe',
      env: { ...process.env, PORT: String(PROD_PORT) },
    });

    prodServer.stderr?.on('data', (d) => {
      console.error(`[next start stderr]: ${d}`);
    });

    // Wait for server to become ready
    const start = Date.now();
    let ready = false;
    while (Date.now() - start < 30000) {
      try {
        const res = await fetch(`${PROD_URL}/login`);
        if (res.ok) {
          ready = true;
          break;
        }
      } catch {
        // server not ready yet
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    if (!ready) {
      throw new Error('Production server failed to start within 30 seconds.');
    }
  });

  test.afterAll(async () => {
    if (prodServer && prodServer.pid) {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(prodServer.pid), '/f', '/t']);
      } else {
        prodServer.kill('SIGTERM');
      }
    }
  });

  test('GET /sw.js returns HTTP 200 and serves valid javascript bundle', async ({ request }) => {
    const res = await request.get(`${PROD_URL}/sw.js`);
    expect(res.status()).toBe(200);

    const contentType = res.headers()['content-type'] || '';
    expect(contentType).toMatch(/javascript/i);

    const text = await res.text();
    expect(text.length).toBeGreaterThan(1000);
  });

  test('navigator.serviceWorker registers and reaches activated state in production', async ({ page }) => {
    await page.goto(`${PROD_URL}/login`, { waitUntil: 'networkidle' });

    // Wait for service worker to register and activate
    const swResult = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) {
        return { error: 'ServiceWorker not supported' };
      }

      // Wait up to 10s for navigator.serviceWorker.ready
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((r) => setTimeout(() => r(null), 10000)),
      ]);

      if (!reg) {
        return { error: 'ServiceWorker ready timed out' };
      }

      // If still activating, wait until state becomes activated
      const activeWorker = reg.active || reg.installing || reg.waiting;
      if (activeWorker && activeWorker.state !== 'activated') {
        await new Promise<void>((resolve) => {
          activeWorker!.addEventListener('statechange', () => {
            if (activeWorker!.state === 'activated') resolve();
          });
          setTimeout(resolve, 8000);
        });
      }

      return {
        scope: reg.scope,
        activeState: reg.active?.state,
      };
    });

    expect(swResult.error).toBeUndefined();
    expect(swResult.activeState).toBe('activated');
  });
});
