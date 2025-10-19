import React from 'react';

export const BrandLogo = ({ size = 24, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
  >
    <defs>
      <linearGradient id="brandLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#40a9ff"/>
        <stop offset="50%" stopColor="#1890ff"/>
        <stop offset="100%" stopColor="#096dd9"/>
      </linearGradient>
    </defs>
    <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" fill="url(#brandLogoGradient)" opacity="0.9"/>
    <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="18" cy="6" r="3" fill="#ff4d4f" opacity="0.8"/>
  </svg>
);

export const HotToolsIcon = ({ size = 20, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
  >
    <defs>
      <linearGradient id="hotToolsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#40a9ff"/>
        <stop offset="50%" stopColor="#1890ff"/>
        <stop offset="100%" stopColor="#096dd9"/>
      </linearGradient>
    </defs>
    {/* 星星主体 - 代表常用/收藏 */}
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="url(#hotToolsGradient)" opacity="0.9"/>
    {/* 中心圆形 - 代表工具集合 */}
    <circle cx="12" cy="12" r="3" fill="white" opacity="0.9"/>
    {/* 时钟刻度 - 代表频繁使用 */}
    <path d="M12 8v4l2 2" stroke="#1890ff" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
  </svg>
);

export const ToolboxIcon = ({ size = 20, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
  >
    <defs>
      <linearGradient id="toolboxGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#73d13d"/>
        <stop offset="50%" stopColor="#52c41a"/>
        <stop offset="100%" stopColor="#389e0d"/>
      </linearGradient>
    </defs>
    <path d="M22 9h-6V7a2 2 0 00-2-2h-4a2 2 0 00-2 2v2H2v2h2v8a2 2 0 002 2h12a2 2 0 002-2v-8h2V9zM4 11h2v6H4v-6zm4-4h4v2H8V7zm2 4h6v6h-6v-6zm10 6h-2v-6h2v6z" fill="url(#toolboxGradient)" opacity="0.9"/>
    <circle cx="12" cy="16" r="1.5" fill="white" opacity="0.9"/>
  </svg>
);