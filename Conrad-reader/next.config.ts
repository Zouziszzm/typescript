import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin dev server root — avoids Turbopack picking a parent lockfile and
  // recompiling (spamming GET /) when unrelated files change elsewhere.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
