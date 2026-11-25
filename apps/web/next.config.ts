import type { NextConfig } from 'next';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
const config: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
  poweredByHeader: false,
  logging: { incomingRequests: false },
  devIndicators: false,
};
export default config;
