import { defineConfig } from "@playwright/test";

// Enforce ipv4first globally so Node fetch never times out on Cloudflare/Supabase on Windows
process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS || ""} --dns-result-order=ipv4first`.trim();

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    trace: "on-first-retry",
    launchOptions: {
      args: ["--host-resolver-rules=MAP gksaxxvxzzpgamnwsczl.supabase.co 172.64.149.246"],
    },
  },
  projects: [
    {
      name: "Mobile",
      use: {
        viewport: { width: 375, height: 812 },
        isMobile: true,
      },
    },
    {
      name: "Desktop",
      use: {
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  webServer: {
    command: "node --dns-result-order=ipv4first ./node_modules/next/dist/bin/next dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    env: {
      AI_PROVIDER: "mock",
    },
  },
});
