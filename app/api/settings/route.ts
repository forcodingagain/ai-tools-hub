import { NextResponse } from 'next/server';
import { dbHelpers, withRetrySync } from '@/lib/db';
import { withErrorHandler, createSuccessResponse } from '@/lib/error-handler';

// 全局缓存 - 缩短缓存时间，与客户端 SWR 策略协调
let cache: any = null;
let cacheTime = 0;
const CACHE_DURATION = 30 * 1000; // ✅ 30秒缓存（从5分钟降低）

// 将数据库蛇形命名转换为前端驼峰命名
function transformTool(tool: any, categoryIdMap: Map<number, number>) {
  // 将数据库的 category_id 转换为 legacy_id
  const categoryLegacyId = categoryIdMap.get(tool.category_id) || tool.category_id;

  return {
    id: tool.legacy_id || tool.id,  // 前端使用 legacy_id
    name: tool.name,
    description: tool.description,
    logo: tool.logo,
    url: tool.url,
    categoryId: categoryLegacyId,  // 🔑 使用 legacy_id 保持一致
    categoryName: tool.category_name,
    isFeatured: tool.is_featured === 1,
    isNew: tool.is_new === 1,
    viewCount: tool.view_count || 0,
    addedDate: tool.added_date,
    tags: tool.tags ? tool.tags.split(',') : [],
  };
}

function transformCategory(category: any) {
  return {
    id: category.legacy_id || category.id,  // 使用 legacy_id
    name: category.name,
    icon: category.icon,
    headerIcon: category.header_icon,
    displayOrder: category.display_order,
    toolCount: category.tool_count,
  };
}

// GET /api/settings - 优化版获取设置
export const GET = withErrorHandler(async () => {
  const now = Date.now();

  // 检查缓存
  if (cache && (now - cacheTime) < CACHE_DURATION) {
    console.log('📦 使用缓存数据');
    return NextResponse.json(cache);
  }

  console.log('🔄 从数据库获取数据');
  const dbStartTime = performance.now();

  // ✅ 使用重试机制并行获取所有数据
  const [siteConfig, categories, tools] = await Promise.all([
    Promise.resolve(withRetrySync(() => dbHelpers.getSiteConfig())),
    Promise.resolve(withRetrySync(() => dbHelpers.getActiveCategories())),
    Promise.resolve(withRetrySync(() => dbHelpers.getActiveTools()))
  ]);

  const dbEndTime = performance.now();
  console.log(`📊 数据库查询耗时: ${(dbEndTime - dbStartTime).toFixed(2)}ms`);

  const transformStartTime = performance.now();

  // 建立 category id -> legacy_id 的映射
  const categoryIdMap = new Map<number, number>();
  categories.forEach((cat: any) => {
    categoryIdMap.set(cat.id, cat.legacy_id || cat.id);
  });

  // 转换字段命名
  const result = {
    siteConfig,
    categories: categories.map(transformCategory),
    tools: tools.map((tool: any) => transformTool(tool, categoryIdMap)),
  };

  const transformEndTime = performance.now();
  console.log(`🔄 数据转换耗时: ${(transformEndTime - transformStartTime).toFixed(2)}ms`);
  console.log(`⏱️  API总耗时: ${(transformEndTime - dbStartTime).toFixed(2)}ms`);

  // 更新缓存
  cache = result;
  cacheTime = now;

  return NextResponse.json(result);
});

// 清除缓存的端点
export const POST = withErrorHandler(async () => {
  cache = null;
  cacheTime = 0;
  return createSuccessResponse(null, '缓存已清除');
});
