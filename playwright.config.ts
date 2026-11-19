import { defineConfig, devices } from "@playwright/test";

const permissions = ["menu:catalog:read", "menu:catalog:print", "menu:categories:read", "menu:categories:write", "menu:entries:read", "menu:entries:write", "menu:entries:status", "menu:offers:read", "menu:offers:write", "menu:offers:status", "menu:recipes:read", "menu:recipes:write", "menu:images:write"];
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
const testToken = `${encode({ alg: "none", typ: "JWT" })}.${encode({ permissions })}.signature`;
const testStorageState = {
  cookies: [],
  origins: [{
    origin: new URL(process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5175").origin,
    localStorage: [{ name: "fmat_restaurant_auth_session", value: JSON.stringify({ accessToken: testToken }) }],
  }],
};

export default defineConfig({
  testDir: "./e2e",
  testIgnore: "**/*.demo.spec.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["junit", { outputFile: "test-results/e2e-junit.xml" }],
  ],
  outputDir: "test-results",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5175",
    trace: "on-first-retry",
    storageState: testStorageState,
    screenshot: "only-on-failure",
  },
  ...(process.env.PLAYWRIGHT_USE_EXTERNAL_SERVER === "true"
    ? {}
    : {
        webServer: {
          command: "npm run build && npm run preview",
          port: 5175,
          reuseExistingServer: !process.env.CI,
        },
      }),
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
