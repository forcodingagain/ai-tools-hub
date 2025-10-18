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
    cssChunking: 'strict',
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
    formats: ['image/webp'],
    deviceSizes: [640, 828, 1200, 1920],
    imageSizes: [32, 64, 96, 128],
  },

  // ============================================
  // 生产环境优化
  // ============================================
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  generateEtags: false,
};

module.exports = nextConfig;
