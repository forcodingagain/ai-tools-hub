import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';

// PUT /api/categories/order - 批量更新分类顺序
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { categories } = body;

    if (!Array.isArray(categories) || categories.length === 0) {
      return NextResponse.json(
        { error: '无效的分类数据' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // 启用外键约束
    db.pragma('foreign_keys = ON');

    // 使用事务批量更新
    const updateStmt = db.prepare(`
      UPDATE categories
      SET display_order = ?, updated_at = datetime('now')
      WHERE legacy_id = ? AND is_deleted = 0
    `);

    const transaction = db.transaction((categoryUpdates: Array<{id: number, displayOrder: number}>) => {
      for (const cat of categoryUpdates) {
        updateStmt.run(cat.displayOrder, cat.id);
      }
    });

    transaction(categories);

    console.log('✅ 分类顺序更新成功');

    return NextResponse.json({
      success: true,
      message: '分类顺序已更新'
    });
  } catch (error: any) {
    console.error('❌ 更新分类顺序失败:', error);
    return NextResponse.json(
      { error: '更新分类顺序失败', details: error.message },
      { status: 500 }
    );
  }
}
