import { defineConfig } from 'vitest/config';

// Separate from vite.config.js on purpose: Vitest reads this file first, so the
// React and Tailwind plugins are not loaded while testing. Tests here only
// cover plain JS modules (no DOM, no JSX), so the default node environment is
// enough and keeps the suite fast.
export default defineConfig({
  // Component tests are JSX: use the automatic runtime so React need not be imported.
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
    // Never let a hung test block CI.
    testTimeout: 5000,
  },
});
