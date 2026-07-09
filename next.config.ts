import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  experimental: {
    externalDir: true,
  },
  async rewrites() {
    return [
      {
        source: '/.well-known/mythos-handshake',
        destination: '/api/well-known/mythos-handshake',
      },
      {
        source: '/.well-known/mythos-listing-registered',
        destination: '/api/well-known/mythos-listing-registered',
      },
    ];
  },
};

export default nextConfig;
