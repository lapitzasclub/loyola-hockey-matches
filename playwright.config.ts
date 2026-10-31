import { defineConfig, devices } from '@playwright/test';

const PORT = 5173;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    // Con el service worker activo `page.route` no ve las peticiones que
    // pasan por él: las pruebas de la PWA lo habilitan explícitamente.
    serviceWorkers: 'block',
  },
  projects: [
    // WebKit ≈ Safari de iPhone: es la plataforma iOS (PWA).
    { name: 'webkit-iphone', use: { ...devices['iPhone 15'] } },
    { name: 'chromium-android', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
