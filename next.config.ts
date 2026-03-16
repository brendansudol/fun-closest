import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/cwogo",
        destination: "/inkling",
        permanent: true,
      },
      {
        source: "/cwogo/:path*",
        destination: "/inkling/:path*",
        permanent: true,
      },
      {
        source: "/api/cwogo/:path*",
        destination: "/api/inkling/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
