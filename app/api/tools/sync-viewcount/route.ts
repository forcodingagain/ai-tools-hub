import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const settingsPath = path.join(process.cwd(), 'public/data/settings.json')

// 读取settings
function readSettings() {
  const data = fs.readFileSync(settingsPath, 'utf-8')
  return JSON.parse(data)
}

// 写入settings
function writeSettings(settings: any) {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8')
}

// POST /api/tools/sync-viewcount - 批量更新viewCount
export async function POST(request: NextRequest) {
  try {
    // 接收格式: { "tool-001": 10, "tool-002": 5, ... }
    const viewCounts: Record<string, number> = await request.json()
    const settings = readSettings()

    let updatedCount = 0

    // 更新每个工具的viewCount
    settings.tools = settings.tools.map((tool: any) => {
      if (viewCounts[tool.id] !== undefined) {
        updatedCount++
        return {
          ...tool,
          viewCount: viewCounts[tool.id]
        }
      }
      return tool
    })

    // 保存到文件
    writeSettings(settings)

    return NextResponse.json({
      success: true,
      message: `成功更新 ${updatedCount} 个工具的浏览次数`,
      updatedCount
    })
  } catch (error) {
    console.error('同步viewCount失败:', error)
    return NextResponse.json({ error: '同步失败' }, { status: 500 })
  }
}
