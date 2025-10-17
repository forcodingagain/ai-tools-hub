'use client'

import { ConfigProvider, App } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import MainLayout from './components/Layout/MainLayout'
import { SettingsProvider } from './context/SettingsContext'
import { ThemeProvider } from './context/ThemeContext'

export default function Home() {
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
