import Database from 'better-sqlite3';
import path from 'path';

// 数据库单例实例
let db: Database.Database | null = null;

/**
 * 从 ID 字符串中提取数字部分
 * @param idString - 如 "tool-001" 或 "category-6"
 * @returns 提取的数字，如 1 或 6
 */
export function extractLegacyId(idString: string): number {
  const match = idString.match(/-(\d+)$/);
  if (!match) {
    throw new Error(`无法从 ID 提取数字: ${idString}`);
  }
  return parseInt(match[1], 10);
}

/**
 * 获取数据库连接单例
 * @returns SQLite 数据库实例
 */
export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = path.join(process.cwd(), 'ai_tools.db');

    db = new Database(dbPath);

    // 启用外键约束（必须！）
    db.pragma('foreign_keys = ON');

    // 启用 WAL 模式（提升并发性能）
    db.pragma('journal_mode = WAL');

    // 优化数据库性能
    db.pragma('synchronous = NORMAL'); // 平衡性能和安全性
    db.pragma('cache_size = 10000'); // 增大缓存
    db.pragma('temp_store = MEMORY'); // 临时表存储在内存
    db.pragma('mmap_size = 268435456'); // 256MB 内存映射

    console.log('✅ 数据库连接已建立:', dbPath);
  }

  return db;
}

/**
 * 关闭数据库连接
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('✅ 数据库连接已关闭');
  }
}

/**
 * 数据库查询辅助函数
 */
export const dbHelpers = {
  /**
   * 获取所有活跃工具（未删除，使用优化视图）
   */
  getActiveTools: () => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM v_active_tools ORDER BY view_count DESC');
    return stmt.all();
  },

  /**
   * 根据 legacy_id 获取工具的 INTEGER id
   * @param legacyId - 数字类型的 legacy_id (如 1, 2, 3...)
   */
  getToolIdByLegacyId: (legacyId: number): number | null => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT id FROM tools WHERE legacy_id = ? AND is_deleted = 0');
    const result = stmt.get(legacyId) as { id: number } | undefined;
    return result ? result.id : null;
  },

  /**
   * 根据 INTEGER id 获取工具详情
   */
  getToolById: (id: number) => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM v_active_tools WHERE id = ?');
    return stmt.get(id);
  },

  /**
   * 根据 legacy_id 获取工具详情
   * @param legacyId - 数字类型的 legacy_id (如 1, 2, 3...)
   */
  getToolByLegacyId: (legacyId: number) => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM v_active_tools WHERE legacy_id = ?');
    return stmt.get(legacyId);
  },

  /**
   * 原子更新工具浏览量
   */
  incrementViewCount: (id: number): void => {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE tools SET view_count = view_count + 1 WHERE id = ? AND is_deleted = 0');
    stmt.run(id);
  },

  /**
   * 更新工具信息
   */
  updateTool: (id: number, data: {
    name?: string;
    description?: string;
    logo?: string;
    url?: string;
    category_id?: number;
    is_featured?: number;
    is_new?: number;
  }): void => {
    const db = getDatabase();

    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      values.push(data.description);
    }
    if (data.logo !== undefined) {
      fields.push('logo = ?');
      values.push(data.logo);
    }
    if (data.url !== undefined) {
      fields.push('url = ?');
      values.push(data.url);
    }
    if (data.category_id !== undefined) {
      fields.push('category_id = ?');
      values.push(data.category_id);
    }
    if (data.is_featured !== undefined) {
      fields.push('is_featured = ?');
      values.push(data.is_featured);
    }
    if (data.is_new !== undefined) {
      fields.push('is_new = ?');
      values.push(data.is_new);
    }

    if (fields.length === 0) {
      return; // 没有需要更新的字段
    }

    values.push(id);
    const sql = `UPDATE tools SET ${fields.join(', ')} WHERE id = ? AND is_deleted = 0`;
    const stmt = db.prepare(sql);
    stmt.run(...values);
  },

  /**
   * 软删除工具
   */
  softDeleteTool: (id: number): void => {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE tools SET is_deleted = 1 WHERE id = ? AND is_deleted = 0');
    stmt.run(id);
  },

  /**
   * 获取所有活跃分类
   */
  getActiveCategories: () => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM v_category_stats ORDER BY display_order');
    return stmt.all();
  },

  /**
   * 获取站点配置
   */
  getSiteConfig: () => {
    const db = getDatabase();
    const configStmt = db.prepare('SELECT * FROM site_config WHERE id = 1');
    const keywordsStmt = db.prepare('SELECT keyword FROM site_keywords ORDER BY id');

    const config = configStmt.get() as any;
    const keywords = keywordsStmt.all() as Array<{ keyword: string }>;

    return {
      siteName: config.site_name,
      description: config.description,
      keywords: keywords.map(k => k.keyword)
    };
  },

  /**
   * 获取工具的标签
   */
  getToolTags: (toolId: number): Array<{ id: number; name: string }> => {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT t.id, t.name
      FROM tags t
      JOIN tool_tags tt ON t.id = tt.tag_id
      WHERE tt.tool_id = ?
      ORDER BY t.name
    `);
    return stmt.all(toolId) as Array<{ id: number; name: string }>;
  },

  /**
   * 为工具添加标签（如果标签不存在则创建）
   */
  addTagToTool: (toolId: number, tagName: string): void => {
    const db = getDatabase();

    const transaction = db.transaction(() => {
      // 查找或创建标签
      let tag = db.prepare('SELECT id FROM tags WHERE name = ? COLLATE NOCASE').get(tagName) as { id: number } | undefined;

      if (!tag) {
        const insertTag = db.prepare('INSERT INTO tags (name) VALUES (?)');
        const result = insertTag.run(tagName);
        tag = { id: result.lastInsertRowid as number };
      }

      // 添加关联（如果不存在）
      const insertRelation = db.prepare(`
        INSERT OR IGNORE INTO tool_tags (tool_id, tag_id)
        VALUES (?, ?)
      `);
      insertRelation.run(toolId, tag.id);
    });

    transaction();
  },

  /**
   * 从工具移除标签
   */
  removeTagFromTool: (toolId: number, tagId: number): void => {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM tool_tags WHERE tool_id = ? AND tag_id = ?');
    stmt.run(toolId, tagId);
  },

  /**
   * 获取所有标签
   */
  getAllTags: (): Array<{ id: number; name: string }> => {
    const db = getDatabase();
    const stmt = db.prepare('SELECT id, name FROM tags ORDER BY name');
    return stmt.all() as Array<{ id: number; name: string }>;
  },

  /**
   * 创建新工具
   */
  createTool: (data: {
    name: string;
    description?: string;
    logo?: string;
    url?: string;
    categoryLegacyId: number;
    is_featured?: number;
    is_new?: number;
    tags?: string[];
  }): { id: number; legacy_id: number } => {
    const db = getDatabase();

    const transaction = db.transaction(() => {
      // 1. 获取分类的真实 id
      const categoryStmt = db.prepare('SELECT id FROM categories WHERE legacy_id = ? AND is_deleted = 0');
      const category = categoryStmt.get(data.categoryLegacyId) as { id: number } | undefined;

      if (!category) {
        throw new Error(`分类不存在: ${data.categoryLegacyId}`);
      }

      // 2. 生成新的 legacy_id
      const maxLegacyIdStmt = db.prepare('SELECT MAX(legacy_id) as maxId FROM tools');
      const maxResult = maxLegacyIdStmt.get() as { maxId: number | null };
      const newLegacyId = (maxResult.maxId || 0) + 1;

      // 3. 插入工具
      const insertStmt = db.prepare(`
        INSERT INTO tools (
          legacy_id, name, description, logo, url, category_id,
          is_featured, is_new, added_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);

      const result = insertStmt.run(
        newLegacyId,
        data.name,
        data.description || null,
        data.logo || null,
        data.url || null,
        category.id,
        data.is_featured || 0,
        data.is_new || 0
      );

      const toolId = result.lastInsertRowid as number;

      // 4. 添加标签
      if (data.tags && data.tags.length > 0) {
        for (const tagName of data.tags) {
          dbHelpers.addTagToTool(toolId, tagName);
        }
      }

      return { id: toolId, legacy_id: newLegacyId };
    });

    return transaction();
  }
};
