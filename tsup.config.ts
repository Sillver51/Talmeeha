import { defineConfig } from "tsup";
import { fileURLToPath } from "node:url";
import path from "node:path";

const srcDir = path.dirname(fileURLToPath(import.meta.url));

// Bundle the custom Socket.io server into a single ESM file for production so we
// no longer pay the `tsx` runtime cost. `src/lib` (the pure game engine + shared
// types/schemas) is inlined via the `@` alias; `next`, `socket.io`, etc. stay
// external and are resolved from node_modules at runtime.
export default defineConfig({
  entry: ["server/index.ts"],
  format: ["esm"],
  platform: "node",
  target: "node20",
  outDir: "dist",
  bundle: true,
  clean: true,
  tsconfig: "tsconfig.server.json",
  esbuildOptions(options) {
    options.alias = {
      ...options.alias,
      "@": path.resolve(srcDir, "src"),
    };
  },
});
