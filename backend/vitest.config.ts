import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    fileParallelism: false,
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
    globalSetup: ["src/tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/**",
        "prisma/**",
        "dist/**",
        "src/index.ts",
        "src/types/**",
        "src/db.ts",
        "src/tests/**",
        "vitest.config.ts"
      ]
    }
  },
});
