/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.logo.dev',
      },
    ],
  },
  // Increase body size limit for API routes to support video uploads
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude native binaries from webpack bundling
      config.externals.push({
        sharp: 'commonjs sharp',
      });
    }
    return config;
  },
};

export default nextConfig;
