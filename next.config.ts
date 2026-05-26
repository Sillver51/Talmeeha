import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Pin Turbopack's workspace root to this directory — otherwise a stray lockfile
// elsewhere (e.g. ~/package-lock.json) makes Next infer the wrong root and CSS
// imports like `./game.css` fail to resolve.
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: { root: projectRoot },
};
export default nextConfig;
