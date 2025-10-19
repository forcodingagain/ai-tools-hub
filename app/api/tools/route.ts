import { dbHelpers, withRetrySync } from '@/lib/db';
import {
  withErrorHandler,
  createSuccessResponse,
  createErrorResponse,
  ErrorType,
  validateParams,
} from '@/lib/error-handler';

// POST /api/tools - 创建新工具
export const POST = withErrorHandler(async (request: Request) => {
  const body = await request.json();
  const { name, description, logo, url, categoryId, isFeatured, isNew, tags } = body;

  // ✅ 使用统一的参数验证
  validateParams({ name, categoryId }, ['name', 'categoryId']);

  if (!name.trim()) {
    return createErrorResponse('工具名称不能为空', ErrorType.VALIDATION_ERROR);
  }

  // ✅ 使用重试机制创建工具
  const result = withRetrySync(() => dbHelpers.createTool({
    name: name.trim(),
    description: description?.trim(),
    logo: logo?.trim(),
    url: url?.trim(),
    categoryLegacyId: categoryId,
    is_featured: isFeatured ? 1 : 0,
    is_new: isNew ? 1 : 0,
    tags: tags || [],
  }));

  // 获取创建的工具详情
  const newTool = withRetrySync(() => dbHelpers.getToolById(result.id)) as any;

  if (!newTool) {
    return createErrorResponse('创建工具失败', ErrorType.INTERNAL_ERROR);
  }

  // 转换为前端格式
  const toolData = {
    id: newTool.legacy_id,
    name: newTool.name,
    description: newTool.description,
    logo: newTool.logo,
    url: newTool.url,
    categoryId: categoryId,
    categoryName: newTool.category_name,
    isFeatured: newTool.is_featured === 1,
    isNew: newTool.is_new === 1,
    viewCount: newTool.view_count || 0,
    addedDate: newTool.added_date,
    tags: newTool.tags ? newTool.tags.split(',') : [],
  };

  // ✅ 使用统一的成功响应
  return createSuccessResponse(toolData, '工具创建成功');
});
