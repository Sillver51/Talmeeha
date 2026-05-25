import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Next 16 removed `next lint`; this is the official flat-config replacement
// (eslint-config-next now ships flat configs). `npm run lint` -> `eslint .`.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    // eslint-config-next defaults:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Project-specific build/coverage output + legacy reference app:
    "dist/**",
    "coverage/**",
    "public/**",
    "server.js",
  ]),
  {
    // `react-hooks/set-state-in-effect` (React Compiler rule, on-by-default in the
    // Next 16 flat config) flags our legitimate "initialize from a browser-only
    // source" patterns: reading localStorage on mount (Onboarding/CoachMarks),
    // and syncing local display state from the Zustand store (Toast/HomeScreen).
    // None can run during SSR render, so the effect is correct. Disable this one
    // known-noisy rule rather than littering per-line eslint-disable comments.
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
