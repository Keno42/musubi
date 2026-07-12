import { defineConfig, devices } from '@playwright/test';

// BDD/golden-image tests. Scoped to public, unauthenticated pages for now —
// authenticated pages (User/Supporter/Admin) need Firestore/Auth emulator +
// seeded fixtures, which is a separate follow-up. See test/bdd/README.md.
export default defineConfig({
  testDir: './test/bdd',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  snapshotPathTemplate: '{testDir}/goldens/{arg}{ext}',
  use: {
    baseURL: 'http://127.0.0.1:5173',
  },
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Optional local/CI override for environments with a pre-installed
        // Chromium at a nonstandard path, instead of Playwright's own
        // managed download. Unset by default.
        ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } }
          : {}),
      },
    },
  ],
});
