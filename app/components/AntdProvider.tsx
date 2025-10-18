'use client';

import { useEffect } from 'react';

export default function AntdProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 抑制 Ant Design 的 React 版本警告（同时处理 warn 和 error）
    const originalWarn = console.warn;
    const originalError = console.error;

    console.warn = (...args: any[]) => {
      if (
        typeof args[0] === 'string' &&
        args[0].includes('antd v5 support React is 16 ~ 18')
      ) {
        return; // 忽略这个特定警告
      }
      originalWarn(...args);
    };

    console.error = (...args: any[]) => {
      if (
        typeof args[0] === 'string' &&
        (args[0].includes('antd v5 support React is 16 ~ 18') ||
         args[0].includes('[antd: compatible]'))
      ) {
        return; // 忽略这个特定错误
      }
      originalError(...args);
    };

    return () => {
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  return <>{children}</>;
}
