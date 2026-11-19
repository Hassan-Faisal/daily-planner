import type { NextConfig } from "next";

// Browser calls /api/... on the Next server, which forwards to FastAPI.
// No CORS setup needed. Change BACKEND_URL if the API runs elsewhere.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
};

export default nextConfig;
