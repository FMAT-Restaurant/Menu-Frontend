import { defineConfig, devices } from "@playwright/test";

const permissions = ["menu:catalog:read", "menu:catalog:print", "menu:categories:read", "menu:categories:write", "menu:entries:read", "menu:entries:write", "menu:entries:status", "menu:offers:read", "menu:offers:write", "menu:offers:status", "menu:recipes:read", "menu:recipes:write", "menu:images:write"];
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
const testToken = `${encode({ alg: "none", typ: "JWT" })}.${encode({ permissions })}.signature`;
const testStorageState = {
  cookies: [],
  origins: [{
    origin: "http://127.0.0.1:5174",
    localStorage: [{ name: "fmat_restaurant_auth_session", value: JSON.stringify({ accessToken: testToken }) }],
  }],
};

export default defineConfig({
  testDir: "./e2e",
  testMatch: ["**/demo-mode.e2e.ts", "**/ux-ui-*.demo.spec.ts"],
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5174",
    trace: "retain-on-failure",
    storageState: testStorageState,
  },
  webServer: {
    command: "npm run dev:mock",
    url: "http://127.0.0.1:5174",
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
