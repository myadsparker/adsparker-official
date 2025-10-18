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
