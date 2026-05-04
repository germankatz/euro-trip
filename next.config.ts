import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle at `.next/standalone` so the Docker
  // runner stage can ship a minimal image with `node server.js`.
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "tiles.openfreemap.org",
      },
    ],
  },
};

export default nextConfig;
