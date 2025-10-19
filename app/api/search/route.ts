import { NextRequest } from 'next/server';
import { dbHelpers, withRetrySync } from '@/lib/db';
import {
  withErrorHandler,
  createSuccessResponse,
  createErrorResponse,
  ErrorType,
} from '@/lib/error-handler';

/**
 * GET /api/search?q=关键词&limit=20
 *
 * FTS5 全文搜索 API
 * - 使用预编译语句，性能 <10ms
 * - 支持 FTS5 查询语法
 * - 自动错误处理和重试
 *
 * @example
 * GET /api/search?q=Chat
 * GET /api/search?q=Chat*&limit=10
 * GET /api/search?q=聊天 OR 绘画
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const limitParam = searchParams.get('limit');

  // ✅ 使用统一的参数验证
  if (!query || query.trim() === '') {
    return createErrorResponse(
      '缺少搜索关键词',
      ErrorType.BAD_REQUEST
    );
  }

  // 解析并验证 limit 参数
  let limit = 20;
  if (limitParam) {
    const parsedLimit = parseInt(limitParam, 10);
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      return createErrorResponse(
        '无效的 limit 参数',
        ErrorType.VALIDATION_ERROR
      );
    }
    if (parsedLimit > 100) {
      return createErrorResponse(
        'limit 不能超过 100',
        ErrorType.VALIDATION_ERROR
      );
    }
    limit = parsedLimit;
  }

  // ✅ 使用重试机制执行 FTS5 搜索
  const startTime = Date.now();
  const results = withRetrySync(() => dbHelpers.searchTools(query, limit));
  const searchTime = Date.now() - startTime;

  // ✅ 使用统一的成功响应
  const response = createSuccessResponse({
    query,
    total: results.length,
    searchTime: `${searchTime}ms`,
    results,
  });

  // 添加缓存头
  response.headers.set(
    'Cache-Control',
    'public, max-age=60, stale-while-revalidate=120'
  );

  return response;
});
