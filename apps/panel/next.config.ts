import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.slingacademy.com',
        port: ''
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: ''
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: ''
      }
    ]
  },
  transpilePackages: ['geist'],
  turbopack: {
    root: __dirname
  },
  webpack: (config) => {
    const adminNodeModules = path.resolve(__dirname, 'node_modules');
    if (Array.isArray(config.resolve?.modules)) {
      config.resolve.modules = [adminNodeModules, ...config.resolve.modules];
    } else {
      config.resolve = {
        ...(config.resolve ?? {}),
        modules: [adminNodeModules, 'node_modules']
      };
    }
    return config;
  }
};

export default nextConfig;
