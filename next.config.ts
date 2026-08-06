import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // The app is reached at http://focus-list.local (see scripts/local-domain.sh),
  // so the dev server must treat that host as a first-party origin.
  allowedDevOrigins: ["focus-list.local"],
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
