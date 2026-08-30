import type { NextConfig } from "next";

const staticExport = process.env.SITES_STATIC_EXPORT === "1";
const githubPages = process.env.GITHUB_PAGES === "1";
const basePath = githubPages ? "/Focus-List" : "";

const nextConfig: NextConfig = {
  output: staticExport || githubPages ? "export" : "standalone",
  trailingSlash: staticExport || githubPages,
  basePath,
  assetPrefix: githubPages ? `${basePath}/` : undefined,
  // The app is reached at http://focus-list.local (see scripts/local-domain.sh),
  // so the dev server must treat that host as a first-party origin.
  allowedDevOrigins: ["focus-list.local"],
  devIndicators: false,
  /* config options here */
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  ...(staticExport || githubPages
    ? {
        images: {
          unoptimized: true,
        },
      }
    : {}),
  reactStrictMode: false,
};

export default nextConfig;
