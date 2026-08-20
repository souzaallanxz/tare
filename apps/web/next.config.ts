import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@tare/core",
    "@tare/crypto",
    "@tare/db",
    "@tare/email",
    "@tare/ingest",
    "@tare/rules",
  ],
  experimental: {
    typedRoutes: true,
  },
};

export default config;
