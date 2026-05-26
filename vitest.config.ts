import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "node",
    environmentMatchGlobs: [
      ["tests/components/**", "happy-dom"],
    ],
    coverage: {
      provider: "v8",
      include: ["src/lib/**"],
      exclude: ["src/lib/share/renderShareCard.ts"],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
