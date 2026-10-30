import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // Lets `npm test` pass before the first test file exists.
    passWithNoTests: true,
  },
});
