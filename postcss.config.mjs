/** @type {import('postcss-load-config').Config} */
// Tailwind v4 PostCSS setup for Next 16 + Turbopack.
// The plugin is the only thing Tailwind v4 needs — config is CSS-first
// (see `@import "tailwindcss"` + `@theme` in src/app/globals.css).
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
