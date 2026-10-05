import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "localhost:3000",
    "127.0.0.1:3000",
    "192.168.137.200:3000",
    "172.16.225.244:3000",
  ],
};

export default nextConfig;
