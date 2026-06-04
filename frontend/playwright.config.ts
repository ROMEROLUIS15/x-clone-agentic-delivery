import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  // Provision/clean a dedicated SQLite DB so E2E never touches dev.db.
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Start both the backend and the frontend so E2E is self-contained.
  // The backend runs with NODE_ENV=test to relax the auth rate limiter
  // (otherwise repeated suite runs trip the 20 req/15 min brute-force guard).
  webServer: [
    {
      command: "npm run dev",
      cwd: "../backend",
      url: "http://localhost:4000/api/health",
      reuseExistingServer: !process.env.CI,
      // NODE_ENV=test relaxes the auth rate limiter; the dedicated e2e.db
      // (provisioned in global-setup) keeps E2E data out of dev.db.
      env: { NODE_ENV: "test", DATABASE_URL: "file:./e2e.db" },
      timeout: 120000,
    },
    {
      command: "npm run dev",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      cwd: "./",
      timeout: 120000,
    },
  ],
});
