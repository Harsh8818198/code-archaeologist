/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {
      root: process.cwd(),
    },
  },
  // Ignore external file system warnings
  webpack: (config) => {
    config.watchOptions = {
      ignored: ['**/node_modules', '**/.git', '**/.next', '**/dist'],
    };
    return config;
  },
};

module.exports = nextConfig;
