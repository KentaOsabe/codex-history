import { defineConfig } from '@playwright/test'

const PORT = 6106
const BASE_URL = `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: './tests/storybook',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'off',
    video: 'off',
  },
  webServer: {
    command: `sh -c "npm run build-storybook -- --quiet && npx http-server storybook-static -p ${PORT} --silent"`,
    url: BASE_URL,
    reuseExistingServer: false,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 240_000,
  },
})
