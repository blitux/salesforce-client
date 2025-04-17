import {
  configDefaults,
  coverageConfigDefaults,
  defineConfig,
} from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    coverage: {
      exclude: [
        ...coverageConfigDefaults.exclude,
        "old/**",
        "commitlint.config.js",
        "node_modules",
      ],
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
