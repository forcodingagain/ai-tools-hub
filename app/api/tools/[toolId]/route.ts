import { NextRequest, NextResponse } from 'next/server'
import { dbHelpers, getDatabase } from '@/lib/db'

// PUT /api/tools/[toolId] - 更新工具（使用数据库）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ toolId: string }> }
) {
  try {
    const { toolId } = await params
    const body = await request.json()

    // 将 toolId 转为数字
    const legacyId = parseInt(toolId, 10)

    // 根据 legacy_id 获取 INTEGER id
    const id = dbHelpers.getToolIdByLegacyId(legacyId)

    if (!id) {
      return NextResponse.json({ error: '工具不存在' }, { status: 404 })
    }

    // 准备更新数据
    const updateData: any = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.logo !== undefined) updateData.logo = body.logo
    if (body.url !== undefined) updateData.url = body.url
    if (body.isFeatured !== undefined) updateData.is_featured = body.isFeatured ? 1 : 0
    if (body.isNew !== undefined) updateData.is_new = body.isNew ? 1 : 0

    // 如果更新 categoryId，需要转换为 category_id
    if (body.categoryId !== undefined) {
      const db = getDatabase()
      const categoryLegacyId = parseInt(body.categoryId, 10)
      const stmt = db.prepare('SELECT id FROM categories WHERE legacy_id = ? AND is_deleted = 0')
      const category = stmt.get(categoryLegacyId) as { id: number } | undefined
      if (category) {
        updateData.category_id = category.id
      }
    }

    // 更新工具
    dbHelpers.updateTool(id, updateData)

    // 获取更新后的工具信息
    const tool = dbHelpers.getToolById(id)

    return NextResponse.json({
      success: true,
      tool
    })
  } catch (error) {
    console.error('更新工具失败:', error)
    return NextResponse.json({ error: '更新失败' }, { status: 500 })
  }
}

// DELETE /api/tools/[toolId] - 软删除工具
export async function DELETE(
  request: NextRequest,
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

    // 软删除工具
    dbHelpers.softDeleteTool(id)

    return NextResponse.json({
      success: true,
      message: '删除成功'
    })
  } catch (error) {
    console.error('删除工具失败:', error)
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }
}
