import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // 允许局域网设备访问 dev 资源（HMR / _next/*）。生产环境不受此项影响。
  allowedDevOrigins: ['192.168.3.174'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  serverExternalPackages: ['ali-oss'],
  experimental: {
    serverActions: {
      allowedOrigins: ['quote.shitianuav.com', '8.141.118.200', '8.141.118.200:18563'],
    },
  },
  output: 'standalone',
};

export default withNextIntl(nextConfig);
