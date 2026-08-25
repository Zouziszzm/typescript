import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  transpilePackages: ["@key-warriors/shared"],
  outputFileTracingRoot: path.join(__dirname, "../.."),
  // LAN dev: allow opening via http://192.168.x.x:3000 (hostname only, no port)
  allowedDevOrigins: ["192.168.*", "10.*", "172.16.*", "172.17.*", "172.18.*", "172.19.*", "172.2*"],
};

export default nextConfig;
