import type { NextConfig } from "next";

// Where uploads live when they're stored on a remote upload server (UPLOAD_ENDPOINT), e.g.
// https://classytouchbd.com/uploads while testing. Restart the dev server after changing it.
type RemotePattern = NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>[number];
function uploadHostPattern(): RemotePattern[] {
  const value = process.env.UPLOAD_PUBLIC_URL?.trim();
  if (!value) return [];
  const url = new URL(value);
  return [
    {
      protocol: url.protocol === "http:" ? "http" : "https",
      hostname: url.hostname,
      port: url.port,
      pathname: `${url.pathname.replace(/\/+$/, "")}/**`,
    },
  ];
}

const nextConfig: NextConfig = {
  images: {
    // Uploads are served from this app at /uploads/<file> (legacy GridFS ones at /media/<id>), see src/lib/media.ts.
    localPatterns: [{ pathname: "/uploads/**" }, { pathname: "/media/**" }, { pathname: "/logo.png" }],
    remotePatterns: [
      ...uploadHostPattern(),
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "classytouchbd.com" },

    ],
  },
  experimental: {
    // Product images are uploaded through a server action.
    serverActions: { bodySizeLimit: "12mb" },
  },
};

export default nextConfig;
