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
      { source: "/home", destination: "/home1/", permanent: false },
      { source: "/library", destination: "/library1/", permanent: false },
      { source: "/dashboard", destination: "/dashboard1/", permanent: false },
    ];
  },
  async headers() {
    return ["/home1/:path*", "/library1/:path*", "/dashboard1/:path*"].map((source) => ({
      source,
      headers: [
        { key: "Cache-Control", value: "private, no-store, no-cache, must-revalidate, max-age=0" },
      ],
    }));
  },
};

export default nextConfig;
