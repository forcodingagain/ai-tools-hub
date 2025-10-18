import { NextRequest, NextResponse } from 'next/server'
import { dbHelpers, getDatabase } from '@/lib/db'

// POST /api/tools/sync-viewcount - 批量同步浏览量到数据库
export async function POST(request: NextRequest) {
  try {
    // 接收格式: { "1": 10, "2": 5, ... } 或 { "tool-001": 10, "tool-002": 5, ... }
    const viewCounts: Record<string, number> = await request.json()

    const db = getDatabase()
    let updatedCount = 0
    let failedCount = 0
    const failedIds: string[] = []

    // 使用事务确保原子性
    const updateTransaction = db.transaction(() => {
      for (const [toolId, count] of Object.entries(viewCounts)) {
        try {
          let id: number | null = null

          // 尝试解析为数字 legacy_id (如 "1", "2", "3")
          const numericId = parseInt(toolId, 10)
          if (!isNaN(numericId)) {
            id = dbHelpers.getToolIdByLegacyId(numericId)
          }

          // 如果不是数字,尝试从字符串提取 (如 "tool-001" -> 1)
          if (!id && toolId.includes('-')) {
            const match = toolId.match(/-(\d+)$/)
            if (match) {
              const legacyId = parseInt(match[1], 10)
              id = dbHelpers.getToolIdByLegacyId(legacyId)
            }
          }

          if (!id) {
            failedIds.push(toolId)
            failedCount++
            continue
          }

          // 直接设置浏览量(而非增量)
          const stmt = db.prepare(
            'UPDATE tools SET view_count = ? WHERE id = ? AND is_deleted = 0'
          )
          const result = stmt.run(count, id)

          if (result.changes > 0) {
            updatedCount++
          } else {
            failedIds.push(toolId)
            failedCount++
          }
        } catch (error) {
          console.error(`同步工具 ${toolId} 失败:`, error)
          failedIds.push(toolId)
          failedCount++
        }
      }
    })

    // 执行事务
    updateTransaction()

    return NextResponse.json({
      success: true,
      message: `成功同步 ${updatedCount} 个工具的浏览次数`,
      updatedCount,
      failedCount,
      failedIds: failedCount > 0 ? failedIds : undefined
    })
  } catch (error: any) {
    console.error('同步viewCount失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: '同步失败',
        details: error.message
      },
      { status: 500 }
    )
  }
}
