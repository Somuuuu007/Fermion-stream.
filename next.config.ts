import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/hls/:path*',
        destination: '/api/hls/:path*',
      },
    ];
  },
};

export default nextConfig;
