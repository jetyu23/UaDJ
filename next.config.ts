import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16 blocks dev resources from non-localhost hosts by default.
  // We run on 127.0.0.1 (Spotify requires the loopback IP, not localhost),
  // so both are whitelisted for the dev server.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
