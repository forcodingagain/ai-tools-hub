import type { Metadata } from 'next'
import { AntdRegistry } from '@ant-design/nextjs-registry'
import AntdProvider from './components/AntdProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI导航门户',
  description: '收录全球优秀 AI 工具',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <head>
        <style dangerouslySetInnerHTML={{__html: `
          #global-loading {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100vh;
            background: #ffffff;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            transition: opacity 0.3s ease;
          }

          #global-loading.hidden {
            opacity: 0;
            pointer-events: none;
          }

          .loading-spinner {
            width: 50px;
            height: 50px;
            border: 4px solid #f0f0f0;
            border-top-color: #1890ff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          .loading-text {
            margin-top: 20px;
            font-size: 16px;
            color: #666;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }

          .loading-skeleton {
            margin-top: 40px;
            width: 80%;
            max-width: 1200px;
          }

          .skeleton-line {
            height: 20px;
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%;
            animation: loading 1.5s ease-in-out infinite;
            border-radius: 4px;
            margin: 10px 0;
          }

          @keyframes loading {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }

          @media (prefers-color-scheme: dark) {
            #global-loading {
              background: #141414;
            }
            .loading-text {
              color: #999;
            }
            .skeleton-line {
              background: linear-gradient(90deg, #1f1f1f 25%, #2a2a2a 50%, #1f1f1f 75%);
              background-size: 200% 100%;
            }
            .loading-spinner {
              border-color: #2a2a2a;
              border-top-color: #1890ff;
            }
          }
        `}} />
      </head>
      <body>
        {/* 纯 HTML/CSS 加载页面 - 在 React 编译前显示 */}
        <div id="global-loading">
          <div className="loading-spinner"></div>
          <div className="loading-text">正在加载 AI 工具导航...</div>
          <div className="loading-skeleton">
            <div className="skeleton-line" style={{width: '60%', margin: '0 auto'}}></div>
            <div className="skeleton-line" style={{width: '80%', margin: '20px auto'}}></div>
            <div className="skeleton-line" style={{width: '70%', margin: '10px auto'}}></div>
          </div>
        </div>

        <AntdRegistry>
          <AntdProvider>{children}</AntdProvider>
        </AntdRegistry>
      </body>
    </html>
  )
}
