import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The repo has multiple lockfiles, so Next can infer the wrong workspace
  // root and silently load .env from the wrong directory. Pin it to this
  // dashboard folder (the cwd when `npm run dev` is invoked here) so
  // dashboard/.env.local is actually loaded.
  turbopack: { root: process.cwd() },
  // The dashboard talks to the ICE backend through a same-origin proxy at /api.
  // This avoids CORS entirely and keeps a single connection point. The proxy
  // target is resolved server-side from INTERNAL_API_URL (defaults to the local
  // backend on PORT 10000). The browser always calls relative /api/* URLs, so
  // the wiring works identically in dev and in production.
  async rewrites() {
    const target = process.env.INTERNAL_API_URL || "http://localhost:10000";
    return [
      {
        source: "/api/:path*",
        destination: `${target}/:path*`,
      },
    ];
  },
};

export default nextConfig;
