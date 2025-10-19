/** @type {import('next').NextConfig} */
const nextConfig = {
  // ============================================
  // 基础配置
  // ============================================
  reactStrictMode: true,

  // SQLite 数据库支持
  serverExternalPackages: ['better-sqlite3'],

  // ============================================
  // 实验性功能配置
  // ============================================
  experimental: {
    // 优化包导入（减少打包体积）
    optimizePackageImports: [
      'antd',
      '@ant-design/icons',
      'lodash',
    ],

    // 启用客户端导航缓存
    staleTimes: {
      '/api/settings': 60,
      '/_next/static/chunks': 365 * 24 * 60 * 60,
    },

    // 启用 Web 构建 Worker（加速构建）
    webpackBuildWorker: true,

    // 启用并行服务器编译
    parallelServerCompiles: true,

    // CSS 代码分割策略
    cssChunking: false, // 禁用CSS代码分割，避免样式分离问题

    // Webpack 内存优化（减少构建内存使用）
    webpackMemoryOptimizations: true,
  },

  // ============================================
  // 输出和部署配置
  // ============================================
  output: 'standalone',
  compress: true,

  // ============================================
  // 图片优化
  // ============================================
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 828, 1200, 1920],
    imageSizes: [32, 64, 96, 128],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // 允许外部图片域名（请根据实际情况添加）
    domains: [
      'avatars.githubusercontent.com',
      'cdn.jsdelivr.net',
      'raw.githubusercontent.com',
      'picsum.photos',
      'via.placeholder.com',
      'images.unsplash.com',
      'img.shields.io',
      'badgen.net',
      // 添加更多根据你的工具图标域名
    ],
    // 允许远程图片模式（如果图标来自各种域名）
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // ============================================
  // 生产环境优化
  // ============================================
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  generateEtags: false,

  // ============================================
  // HTTP Headers 优化
  // ============================================
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=300'
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
