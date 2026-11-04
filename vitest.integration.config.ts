import dotenv from "dotenv";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

dotenv.config({ path: ".env.test", quiet: true });

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    name: "integration",
    include: ["tests/Integration/**/*.int.spec.ts"],

    environment: "node",
    env: { NODE_ENV: "test" },

    isolate: false,
    pool: "threads",
    fileParallelism: false,

    globals: true,

    globalSetup: ["tests/Setup/GlobalSetup.ts"],
    setupFiles: ["tests/Setup/ResetDatabase.ts"],

    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
