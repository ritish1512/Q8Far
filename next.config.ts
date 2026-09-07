import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack:{},
  devIndicators:false,
  allowedDevOrigins: ['oppose-vendor-armed.ngrok-free.dev'],
};

export default nextConfig;
