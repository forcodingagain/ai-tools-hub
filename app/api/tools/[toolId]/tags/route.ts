import { NextRequest, NextResponse } from 'next/server';
import { dbHelpers } from '@/lib/db';

// GET /api/tools/[toolId]/tags - 获取工具的标签
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ toolId: string }> }
) {
  try {
    const { toolId } = await params;
    const legacyId = parseInt(toolId, 10);

    // 根据 legacy_id 获取 INTEGER id
    const id = dbHelpers.getToolIdByLegacyId(legacyId);

    if (!id) {
      return NextResponse.json({ error: '工具不存在' }, { status: 404 });
    }

    const tags = dbHelpers.getToolTags(id);

    return NextResponse.json({
      success: true,
      tags
    });
  } catch (error: any) {
    console.error('获取标签失败:', error);
    return NextResponse.json(
      { error: '获取标签失败', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/tools/[toolId]/tags - 添加标签
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ toolId: string }> }
) {
  try {
    const { toolId } = await params;
    const { tagName } = await request.json();

    if (!tagName || tagName.trim().length === 0) {
      return NextResponse.json({ error: '标签名称不能为空' }, { status: 400 });
    }

    if (tagName.length > 50) {
      return NextResponse.json({ error: '标签名称不能超过50个字符' }, { status: 400 });
    }

    const legacyId = parseInt(toolId, 10);
    const id = dbHelpers.getToolIdByLegacyId(legacyId);

    if (!id) {
      return NextResponse.json({ error: '工具不存在' }, { status: 404 });
    }

    // 添加标签
    dbHelpers.addTagToTool(id, tagName.trim());

    // 获取更新后的标签列表
    const tags = dbHelpers.getToolTags(id);

    return NextResponse.json({
      success: true,
      message: '标签添加成功',
      tags
    });
  } catch (error: any) {
    console.error('添加标签失败:', error);
    return NextResponse.json(
      { error: '添加标签失败', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/tools/[toolId]/tags - 删除标签
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ toolId: string }> }
) {
  try {
    const { toolId } = await params;
    const { tagId } = await request.json();

    if (!tagId) {
      return NextResponse.json({ error: '标签ID不能为空' }, { status: 400 });
    }

    const legacyId = parseInt(toolId, 10);
    const id = dbHelpers.getToolIdByLegacyId(legacyId);

    if (!id) {
      return NextResponse.json({ error: '工具不存在' }, { status: 404 });
    }

    // 删除标签关联
    dbHelpers.removeTagFromTool(id, tagId);

    // 获取更新后的标签列表
    const tags = dbHelpers.getToolTags(id);

    return NextResponse.json({
      success: true,
      message: '标签删除成功',
      tags
    });
  } catch (error: any) {
    console.error('删除标签失败:', error);
    return NextResponse.json(
      { error: '删除标签失败', details: error.message },
      { status: 500 }
    );
  }
}
