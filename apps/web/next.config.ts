import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@tare/core",
    "@tare/db",
    "@tare/email",
    "@tare/rules",
  ],
  experimental: {
    typedRoutes: true,
  },
};

export default config;
