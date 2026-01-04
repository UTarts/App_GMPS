/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8080', // Match your PHP server port
        pathname: '/GMPSPROJECT/**', // Allow images from your project folder
      },
      {
        protocol: 'https',
        hostname: 'utarts.in', // Allow your logo if hosted externally
      }
    ],
  },
};

export default nextConfig;