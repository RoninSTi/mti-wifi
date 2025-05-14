import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* Add environment variables for OpenTelemetry */
  env: {
    OTEL_SERVICE_NAME: 'nextjs-starter',
    OTEL_COLLECTOR_URL: process.env.OTEL_COLLECTOR_URL || 'http://localhost:4318',
  },
};

export default nextConfig;
