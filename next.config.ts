import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/prd",
        destination: "/",
        permanent: false,
      },
    ];
  },

  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },

  async rewrites() {
    return [];
  },

  turbopack: {},
};

export default nextConfig;
