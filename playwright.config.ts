import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch:
    process.env.CLERK_TEST_LIVE === "1"
      ? ["**/auth-live.spec.ts", "**/helpers.spec.ts"]
      : ["**/demo.spec.ts", "**/auth-config.spec.ts", "**/helpers.spec.ts"],
  timeout: 45000,
  workers: 1,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3001",
    headless: true,
    channel: "msedge",
    screenshot: "only-on-failure",
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "node node_modules/next/dist/bin/next start -p 3001",
        url: "http://localhost:3001",
        reuseExistingServer: true,
        timeout: 30000,
      },
  reporter: "list",
});
