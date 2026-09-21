import type { NextConfig } from "next";
import path from "path";

const projectRoot = process.cwd();

const nextConfig: NextConfig = {
  // Hide the Next.js "N" badge so it doesn't cover landing cards in local preview.
  devIndicators: false,
  // Docker / Railway / Fly (`next start`) without Vercel-specific bundling.
  output: "standalone",
  // Keep Turbopack rooted on this app so a parent-folder lockfile cannot
  // steal module resolution (which 404s routes and breaks tailwindcss).
  // process.cwd() is more reliable on Windows than import.meta.url.
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "images.clerk.dev" },
    ],
  },
};

export default nextConfig;
