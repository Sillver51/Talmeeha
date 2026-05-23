import type { NextConfig } from "next";
// Next 16: Turbopack is the default bundler. Do NOT add a `webpack` key here or
// `next build` will fail. Turbopack options (if ever needed) go under `turbopack: {}`.
const nextConfig: NextConfig = { reactStrictMode: true };
export default nextConfig;
