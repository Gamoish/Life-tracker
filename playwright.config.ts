import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

/**
 * Runs against the ALREADY-RUNNING Docker stack rather than spawning its own
 * server — the point is to verify the live containers, not a separate dev build.
 *
 *   docker compose up --build -d
 *   npm run e2e
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
