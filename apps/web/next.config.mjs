/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@resolve-ai/contracts'],
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://resolve-ai-api-ybmj.onrender.com'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;