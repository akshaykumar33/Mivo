import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@mivo/shared', '@mivo/ui'],
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, '../../'),
  async redirects() {
    return [
      {
        source: '/channels/@me',
        destination: '/channels',
        permanent: false,
      },
      {
        source: '/channels/me',
        destination: '/channels',
        permanent: false,
      },
    ];
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
