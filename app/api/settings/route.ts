import { NextResponse } from 'next/server'
import { dbHelpers } from '@/lib/db'

// GET /api/settings - 获取所有设置（从数据库）
export async function GET() {
  try {
    // 获取站点配置
    const siteConfig = dbHelpers.getSiteConfig()

    // 获取所有活跃分类
    const categories = dbHelpers.getActiveCategories()

    // 获取所有活跃工具
    const tools = dbHelpers.getActiveTools()

    // 转换为前端需要的格式（返回数字 ID）
    const formattedCategories = categories.map((cat: any) => ({
      id: cat.legacy_id,
      name: cat.name,
      icon: cat.icon,
      toolCount: cat.tool_count || 0
    }))

    const formattedTools = tools.map((tool: any) => ({
      id: tool.legacy_id,
      name: tool.name,
      description: tool.description,
      logo: tool.logo,
      url: tool.url,
      categoryId: getCategoryLegacyId(categories, tool.category_id),
      isFeatured: tool.is_featured === 1,
      isNew: tool.is_new === 1,
      viewCount: tool.view_count || 0,
      addedDate: tool.added_date,
      tags: tool.tags ? tool.tags.split(',').filter(Boolean) : []
    }))

    return NextResponse.json({
      siteConfig,
      categories: formattedCategories,
      tools: formattedTools
    })
  } catch (error) {
    console.error('读取settings失败:', error)
    return NextResponse.json({ error: '读取设置失败' }, { status: 500 })
  }
}

// 辅助函数：根据 category_id 获取 legacy_id
function getCategoryLegacyId(categories: any[], categoryId: number): number {
  const category = categories.find((c: any) => c.id === categoryId)
  return category ? category.legacy_id : 0
}
