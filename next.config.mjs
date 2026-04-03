/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow server actions
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"],
  },
};

export default nextConfig;
