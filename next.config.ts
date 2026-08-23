import type { NextConfig } from "next";

const staticExport = process.env.SITES_STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  output: staticExport ? "export" : "standalone",
  // The app is reached at http://focus-list.local (see scripts/local-domain.sh),
  // so the dev server must treat that host as a first-party origin.
  allowedDevOrigins: ["focus-list.local"],
  devIndicators: false,
  /* config options here */
  ...(staticExport
    ? {
        images: {
          unoptimized: true,
        },
      }
    : {}),
  reactStrictMode: false,
};

export default nextConfig;
