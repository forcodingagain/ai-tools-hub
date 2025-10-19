import { NextRequest } from 'next/server'
import { dbHelpers, getDatabase, withRetrySync } from '@/lib/db'
import {
  withErrorHandler,
  createSuccessResponse,
  createErrorResponse,
  ErrorType,
  validateId,
} from '@/lib/error-handler';

// PUT /api/tools/[toolId] - 更新工具（使用数据库）
export const PUT = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ toolId: string }> }
) => {
  const { toolId } = await params
  const body = await request.json()

  // ✅ 使用统一的 ID 验证
  const legacyId = validateId(toolId, 'toolId');

  // ✅ 使用重试机制获取 INTEGER id
  const id = withRetrySync(() => dbHelpers.getToolIdByLegacyId(legacyId));

  if (!id) {
    return createErrorResponse('工具不存在', ErrorType.NOT_FOUND);
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

  // ✅ 使用重试机制更新工具
  withRetrySync(() => dbHelpers.updateTool(id, updateData));

  // 获取更新后的工具信息
  const tool = withRetrySync(() => dbHelpers.getToolById(id));

  // ✅ 使用统一的成功响应
  return createSuccessResponse({ tool }, '工具更新成功');
});

// DELETE /api/tools/[toolId] - 软删除工具
export const DELETE = withErrorHandler(async (
  _request: NextRequest,
  { params }: { params: Promise<{ toolId: string }> }
) => {
  const { toolId } = await params

  // ✅ 使用统一的 ID 验证
  const legacyId = validateId(toolId, 'toolId');

  // ✅ 使用重试机制获取 INTEGER id
  const id = withRetrySync(() => dbHelpers.getToolIdByLegacyId(legacyId));

  if (!id) {
    return createErrorResponse('工具不存在', ErrorType.NOT_FOUND);
  }

  // ✅ 使用重试机制软删除工具
  withRetrySync(() => dbHelpers.softDeleteTool(id));

  // ✅ 使用统一的成功响应
  return createSuccessResponse(null, '删除成功');
});
