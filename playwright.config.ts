import { defineConfig, devices } from '@playwright/test';

/**
 * Abnahmetests im Browser (Chromium).
 * Start:  npm run test:e2e
 * Einmalig vorher auf einem neuen Rechner:  npx playwright install chromium
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4174',
    trace: 'off',
  },
  webServer: [
    {
      command: 'npm run build && npx vite preview --port 4174 --strictPort',
      url: 'http://localhost:4174',
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      // wie auf GitHub Pages: App liegt in einem Unterordner
      command:
        'npx vite build --outDir dist-unterordner && npx vite preview --outDir dist-unterordner --port 4175 --strictPort',
      url: 'http://localhost:4175/intervall-trainer/',
      env: { BASE_PATH: '/intervall-trainer/' },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
  projects: [
    { name: 'android-hochformat', use: { ...devices['Pixel 7'] } },
    { name: 'android-querformat', use: { ...devices['Pixel 7 landscape'] } },
    {
      name: 'iphone-groesse-hochformat',
      // Bildschirmgröße eines iPhones, aber mit Chromium (WebKit ist hier nicht installiert)
      use: { ...devices['iPhone 13'], browserName: 'chromium', defaultBrowserType: 'chromium' },
    },
  ],
});
