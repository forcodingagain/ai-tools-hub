'use client'

import { ConfigProvider, App } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import MainLayout from './components/Layout/MainLayout'
import { SettingsProvider } from './context/SettingsContext'
import { ThemeProvider } from './context/ThemeContext'

export default function Home() {
  // 不再在这里隐藏全局加载动画，让 MainLayout 完成后再隐藏

  return (
    <ConfigProvider locale={zhCN}>
      <App>
        <ThemeProvider>
          <SettingsProvider>
            <MainLayout />
          </SettingsProvider>
        </ThemeProvider>
      </App>
    </ConfigProvider>
  )
}
