import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    react(),
    // Scope the tsconfig scan to this project; without `projects` the plugin
    // walks the whole home directory looking for stray tsconfig files.
    tsconfigPaths({ root: import.meta.dirname, projects: ["./tsconfig.json"] }),
  ],
  test: {
    environment: "node",
    globals: true,
    testTimeout: 20000,
    hookTimeout: 30000,
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.test.{ts,tsx}"],
    // The rate-limiter ships its test helper as TypeScript source, so it must
    // be transformed by Vite rather than treated as an external dependency.
    server: {
      deps: {
        inline: ["@convex-dev/rate-limiter"],
      },
    },
  },
});
