import path from "path";
import { fileURLToPath } from "url";
import type { NextConfig } from "next";

/** App directory (where this file and `node_modules` live). Fixes Tailwind/PostCSS resolve when the repo root is mis-detected (e.g. parent `Land-Purchasing` or a higher lockfile). */
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
