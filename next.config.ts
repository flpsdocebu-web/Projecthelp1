import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  trailingSlash: true,
  async redirects() {
    return [
      {
        source: "/",
        destination: "/landing/index.html",
        permanent: false,
      },
    ];
  },
  async headers() {
    return ["/home/:path*", "/library/:path*", "/dashboard/:path*"].map((source) => ({
      source,
      headers: [
        { key: "Cache-Control", value: "private, no-store, no-cache, must-revalidate, max-age=0" },
      ],
    }));
  },
};

export default nextConfig;
