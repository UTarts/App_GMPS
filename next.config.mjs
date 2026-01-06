/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
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
      // THIS IS THE CRITICAL PART FOR YOUR LIVE IMAGES
      {
        protocol: 'https',
        hostname: 'govindmadhav.com', 
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;