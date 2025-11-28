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
};

export default nextConfig;
