/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'misaka-networks-open-source.oss-cn-shanghai.aliyuncs.com',
      },
    ]
  },
  output: 'standalone',
}

module.exports = nextConfig
