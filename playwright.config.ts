import { defineConfig } from "@playwright/test";

const port = 3187;
const baseURL = "http://127.0.0.1:" + port;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90_000,
  workers: 1,
  use: { baseURL, browserName: "chromium", actionTimeout: 10_000, trace: "retain-on-failure" },
  webServer: {
    command: `npm run start -- --hostname 127.0.0.1 --port ${port}`,
    url: baseURL + "/login",
    env: { AUTH_URL: baseURL },
    timeout: 45_000,
  },
});
