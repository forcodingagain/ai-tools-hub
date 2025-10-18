/** @type {import('postcss-load-config').Config} */
module.exports = {
  plugins: [
    // 修复 Flexbox 浏览器 bug
    'postcss-flexbugs-fixes',
    [
      // PostCSS Preset Env：提供现代 CSS 特性 polyfill
      'postcss-preset-env',
      {
        // Autoprefixer 配置
        autoprefixer: {
          flexbox: 'no-2009',  // 不使用旧的 2009 flexbox 规范
        },
        stage: 3,  // 使用 Stage 3 的 CSS 特性
        features: {
          'custom-properties': false,  // 禁用 CSS 自定义属性转换（现代浏览器都支持）
        },
      },
    ],
  ],
};
