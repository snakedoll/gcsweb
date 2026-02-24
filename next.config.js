/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', pathname: '/uploads/**' },
      { protocol: 'https', hostname: 'www.gcsweb.kr', pathname: '/uploads/**' },
    ],
  },
  // Railway 배포 시 ESLint warning이 있어도 빌드 계속 진행
  eslint: {
    ignoreDuringBuilds: true,
  },
  // TypeScript 오류가 있어도 빌드 계속 진행 (필요시 주석 해제)
  // typescript: {
  //   ignoreBuildErrors: true,
  // },
}

module.exports = nextConfig

