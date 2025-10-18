import { NextRequest, NextResponse } from 'next/server'
import { dbHelpers } from '@/lib/db'

// POST /api/tools/[toolId]/view - 增加工具浏览量
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ toolId: string }> }
) {
  try {
    const { toolId } = await params

    // 将 toolId 转为数字
    const legacyId = parseInt(toolId, 10)

    // 根据 legacy_id 获取 INTEGER id
    const id = dbHelpers.getToolIdByLegacyId(legacyId)

    if (!id) {
      return NextResponse.json({ error: '工具不存在' }, { status: 404 })
    }

    // 原子更新浏览量
    dbHelpers.incrementViewCount(id)

    // 获取更新后的工具信息
    const tool = dbHelpers.getToolById(id)

    return NextResponse.json({
      success: true,
      viewCount: (tool as any)?.view_count || 0
    })
  } catch (error) {
    console.error('更新浏览量失败:', error)
    return NextResponse.json({ error: '更新失败' }, { status: 500 })
  }
}
