import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', 
  images: {
    unoptimized: true, 
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8080',
        pathname: '/GMPSPROJECT/**',
      },
      {
        protocol: 'https',
        hostname: 'utarts.in',
      },
      {
        protocol: 'https',
        hostname: 'govindmadhav.com',
        pathname: '/**',
      }
    ],
  },
};

export default withPWA(nextConfig);