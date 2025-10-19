import { NextResponse } from 'next/server';
import { dbHelpers } from '@/lib/db';

// POST /api/tools - 创建新工具
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, logo, url, categoryId, isFeatured, isNew, tags } = body;

    // 验证必填字段
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: '工具名称不能为空' },
        { status: 400 }
      );
    }

    if (!categoryId) {
      return NextResponse.json(
        { success: false, error: '分类ID不能为空' },
        { status: 400 }
      );
    }

    // 创建工具
    const result = dbHelpers.createTool({
      name: name.trim(),
      description: description?.trim(),
      logo: logo?.trim(),
      url: url?.trim(),
      categoryLegacyId: categoryId,
      is_featured: isFeatured ? 1 : 0,
      is_new: isNew ? 1 : 0,
      tags: tags || [],
    });

    // 获取创建的工具详情
    const newTool = dbHelpers.getToolById(result.id) as any;

    if (!newTool) {
      return NextResponse.json(
        { success: false, error: '创建工具失败' },
        { status: 500 }
      );
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

    return NextResponse.json({
      success: true,
      tool: toolData,
      message: '工具创建成功',
    });
  } catch (error: any) {
    console.error('❌ 创建工具失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '创建工具失败' },
      { status: 500 }
    );
  }
}
