import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Uploads are served from this app at /media/<id>.webp (see src/lib/media.ts).
    localPatterns: [{ pathname: "/media/**" }, { pathname: "/logo.png" }],
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  experimental: {
    // Product images are uploaded through a server action.
    serverActions: { bodySizeLimit: "12mb" },
  },
};

export default nextConfig;
