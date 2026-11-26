import type { NextConfig } from 'next';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
const config: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: 'export',
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
  poweredByHeader: false,
  logging: { incomingRequests: false },
  devIndicators: false,
};
export default config;
