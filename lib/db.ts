import Database from 'better-sqlite3';
import path from 'path';

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

// ============================================
// 错误处理工具函数
// ============================================

/**
 * 检查是否是 SQLite BUSY 错误
 */
function isSqliteBusyError(error: any): boolean {
  return error?.code === 'SQLITE_BUSY' ||
         error?.message?.includes('SQLITE_BUSY') ||
         error?.message?.includes('database is locked');
}

/**
 * SQLite 操作重试包装器
 * 自动处理 SQLITE_BUSY 错误,最多重试 5 次
 *
 * @param operation - 要执行的数据库操作
 * @param maxRetries - 最大重试次数 (默认 5)
 * @param retryDelay - 重试延迟 ms (默认 100)
 * @returns 操作结果
 */
export async function withRetry<T>(
  operation: () => T,
  maxRetries: number = 5,
  retryDelay: number = 100
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return operation();
    } catch (error: any) {
      lastError = error;

      // 只重试 BUSY 错误
      if (!isSqliteBusyError(error)) {
        throw error;
      }

      // 最后一次尝试,不再重试
      if (attempt === maxRetries) {
        console.error(`❌ SQLite BUSY 错误,已重试 ${maxRetries} 次:`, error.message);
        throw new Error(`数据库繁忙,请稍后重试 (尝试 ${maxRetries + 1} 次)`);
      }

      // 等待后重试 (指数退避)
      const delay = retryDelay * Math.pow(2, attempt);
      console.warn(`⚠️  SQLite BUSY,${delay}ms 后重试 (第 ${attempt + 1}/${maxRetries} 次)`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * 同步版本的重试包装器 (用于同步数据库操作)
 */
export function withRetrySync<T>(
  operation: () => T,
  maxRetries: number = 5,
  retryDelay: number = 100
): T {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return operation();
    } catch (error: any) {
      lastError = error;

      if (!isSqliteBusyError(error)) {
        throw error;
      }

      if (attempt === maxRetries) {
        console.error(`❌ SQLite BUSY 错误,已重试 ${maxRetries} 次:`, error.message);
        throw new Error(`数据库繁忙,请稍后重试 (尝试 ${maxRetries + 1} 次)`);
      }

      // 同步延迟 (简单的忙等待)
      const delay = retryDelay * Math.pow(2, attempt);
      console.warn(`⚠️  SQLite BUSY,${delay}ms 后重试 (第 ${attempt + 1}/${maxRetries} 次)`);
      const start = Date.now();
      while (Date.now() - start < delay) {
        // 忙等待
      }
    }
  }

  throw lastError;
}

// ============================================
// 数据库单例 - 使用 globalThis 避免 HMR 泄漏
// ============================================

const globalForDb = globalThis as unknown as {
  db: Database.Database | undefined;
};

// ============================================
// 预编译 SQL 语句 - 提升查询性能 2-3 倍
// ============================================

interface PreparedStatements {
  getActiveTools: Database.Statement | null;
  getToolTags: Database.Statement | null;
  getToolIdByLegacyId: Database.Statement | null;
  getToolById: Database.Statement | null;
  getToolByLegacyId: Database.Statement | null;
  incrementViewCount: Database.Statement | null;
  softDeleteTool: Database.Statement | null;
  getActiveCategories: Database.Statement | null;
  getSiteConfig: Database.Statement | null;
  getSiteKeywords: Database.Statement | null;
  getToolTagsById: Database.Statement | null;
  getTagByName: Database.Statement | null;
  insertTag: Database.Statement | null;
  insertToolTag: Database.Statement | null;
  deleteToolTag: Database.Statement | null;
  getAllTags: Database.Statement | null;
  searchTools: Database.Statement | null; // FTS5 搜索
}

// ✅ 在 initDatabase 之前定义，避免临时死区
let preparedStatements: PreparedStatements = {
  getActiveTools: null,
  getToolTags: null,
  getToolIdByLegacyId: null,
  getToolById: null,
  getToolByLegacyId: null,
  incrementViewCount: null,
  softDeleteTool: null,
  getActiveCategories: null,
  getSiteConfig: null,
  getSiteKeywords: null,
  getToolTagsById: null,
  getTagByName: null,
  insertTag: null,
  insertToolTag: null,
  deleteToolTag: null,
  getAllTags: null,
  searchTools: null,
};

let statementsInitialized = false;

// 添加调试日志
console.log('🔧 数据库模块初始化中...');

/**
 * 初始化数据库连接
 * 使用 globalThis 存储单例，避免 Next.js HMR 导致的内存泄漏
 */
function initDatabase(): Database.Database {
  console.log('🔧 开始初始化数据库连接...');
  const dbPath = path.join(process.cwd(), 'ai_tools.db');
  const database = new Database(dbPath);

  console.log('📁 数据库文件路径:', dbPath);
  console.log('🔗 数据库连接已创建');

  // 启用外键约束（必须！）
  database.pragma('foreign_keys = ON');

  // 启用 WAL 模式（提升并发性能）
  database.pragma('journal_mode = WAL');

  // 优化数据库性能
  database.pragma('synchronous = NORMAL'); // 平衡性能和安全性
  database.pragma('cache_size = 10000'); // 增大缓存
  database.pragma('temp_store = MEMORY'); // 临时表存储在内存
  database.pragma('mmap_size = 268435456'); // 256MB 内存映射

  console.log('⚙️ 数据库配置已设置');

  // ✅ 初始化预编译语句（必须在返回前调用）
  console.log('🚀 开始初始化预编译语句...');
  initPreparedStatements(database);
  console.log('✅ 预编译语句初始化完成');

  console.log('✅ 数据库连接已建立:', dbPath);

  return database;
}

// 延迟初始化数据库连接（避免临时死区问题）
function getOrInitDatabase(): Database.Database {
  if (!globalForDb.db) {
    globalForDb.db = initDatabase();
  }
  return globalForDb.db;
}

// 获取或创建数据库连接
export const db = getOrInitDatabase();

// 开发环境下存储到 globalThis，避免 HMR 重复初始化
if (process.env.NODE_ENV !== 'production') {
  globalForDb.db = db;
}

/**
 * 获取数据库连接单例（兼容旧代码）
 * @returns SQLite 数据库实例
 * @deprecated 推荐直接使用 db 导出变量
 */
export function getDatabase(): Database.Database {
  return db;
}

/**
 * 优雅关闭数据库连接
 */
export function closeDatabase(): void {
  if (globalForDb.db) {
    try {
      globalForDb.db.close();
      globalForDb.db = undefined;
      console.log('✅ 数据库连接已关闭');
    } catch (error) {
      console.error('❌ 关闭数据库连接失败:', error);
    }
  }
}

// 进程退出时优雅关闭数据库
if (typeof process !== 'undefined') {
  process.on('beforeExit', () => {
    closeDatabase();
  });

  process.on('SIGINT', () => {
    closeDatabase();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    closeDatabase();
    process.exit(0);
  });
}

/**
 * 初始化预编译语句
 */
function initPreparedStatements(database: Database.Database): void {
  console.log('🔧 开始初始化预编译语句...');
  if (statementsInitialized) {
    console.log('⚠️ 预编译语句已初始化，跳过重复初始化');
    return; // 避免重复初始化
  }
  statementsInitialized = true;
  console.log('✅ statementsInitialized 标志已设置');
  preparedStatements.getActiveTools = database.prepare(`
    SELECT
      t.id,
      t.legacy_id,
      t.name,
      t.description,
      t.logo,
      t.url,
      t.category_id,
      c.name as category_name,
      t.is_featured,
      t.is_new,
      t.view_count,
      t.added_date,
      t.created_at
    FROM tools t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.is_deleted = 0 AND c.is_deleted = 0
    ORDER BY t.view_count DESC
  `);

  preparedStatements.getToolTags = database.prepare(`
    SELECT tt.tool_id, GROUP_CONCAT(tg.name, ',') as tags
    FROM tool_tags tt
    JOIN tags tg ON tt.tag_id = tg.id
    WHERE tt.tool_id IN (SELECT id FROM tools WHERE is_deleted = 0)
    GROUP BY tt.tool_id
  `);

  preparedStatements.getToolIdByLegacyId = database.prepare(`
    SELECT id FROM tools WHERE legacy_id = ? AND is_deleted = 0
  `);

  preparedStatements.getToolById = database.prepare(`
    SELECT * FROM v_active_tools WHERE id = ?
  `);

  preparedStatements.getToolByLegacyId = database.prepare(`
    SELECT * FROM v_active_tools WHERE legacy_id = ?
  `);

  preparedStatements.incrementViewCount = database.prepare(`
    UPDATE tools SET view_count = view_count + 1 WHERE id = ? AND is_deleted = 0
  `);

  preparedStatements.softDeleteTool = database.prepare(`
    UPDATE tools SET is_deleted = 1 WHERE id = ? AND is_deleted = 0
  `);

  preparedStatements.getActiveCategories = database.prepare(`
    SELECT * FROM v_category_stats ORDER BY display_order
  `);

  preparedStatements.getSiteConfig = database.prepare(`
    SELECT * FROM site_config WHERE id = 1
  `);

  preparedStatements.getSiteKeywords = database.prepare(`
    SELECT keyword FROM site_keywords ORDER BY id
  `);

  preparedStatements.getToolTagsById = database.prepare(`
    SELECT t.id, t.name
    FROM tags t
    JOIN tool_tags tt ON t.id = tt.tag_id
    WHERE tt.tool_id = ?
    ORDER BY t.name
  `);

  preparedStatements.getTagByName = database.prepare(`
    SELECT id FROM tags WHERE name = ? COLLATE NOCASE
  `);

  preparedStatements.insertTag = database.prepare(`
    INSERT INTO tags (name) VALUES (?)
  `);

  preparedStatements.insertToolTag = database.prepare(`
    INSERT OR IGNORE INTO tool_tags (tool_id, tag_id) VALUES (?, ?)
  `);

  preparedStatements.deleteToolTag = database.prepare(`
    DELETE FROM tool_tags WHERE tool_id = ? AND tag_id = ?
  `);

  preparedStatements.getAllTags = database.prepare(`
    SELECT id, name FROM tags ORDER BY name
  `);

  preparedStatements.searchTools = database.prepare(`
    SELECT
      t.id,
      t.legacy_id,
      t.name,
      t.description,
      t.logo,
      t.url,
      t.category_id,
      t.category_name,
      t.is_featured,
      t.is_new,
      t.view_count,
      t.added_date,
      t.created_at,
      t.tags
    FROM tools_fts fts
    JOIN v_active_tools t ON fts.rowid = t.id
    WHERE tools_fts MATCH ?
    ORDER BY rank
    LIMIT ?
  `);

  // ✅ 验证预编译语句是否正确初始化
  console.log('🔍 验证预编译语句初始化...');
  for (const [key, stmt] of Object.entries(preparedStatements)) {
    if (stmt === null) {
      console.error(`❌ 预编译语句 ${key} 未初始化!`);
    } else {
      console.log(`✅ 预编译语句 ${key} 已初始化`);
    }
  }

  console.log('✅ 预编译语句已初始化完成');
}

/**
 * 数据库查询辅助函数（使用预编译语句）
 */
export const dbHelpers = {
  /**
   * 获取所有活跃工具（使用预编译语句）
   */
  getActiveTools: () => {
    if (!preparedStatements.getActiveTools || !preparedStatements.getToolTags) {
      console.error('❌ getActiveTools 或 getToolTags 预编译语句未初始化!');
      throw new Error('数据库未正确初始化');
    }

    // ✅ 使用预编译语句
    const tools = preparedStatements.getActiveTools.all() as any[];
    const tagsResult = preparedStatements.getToolTags.all() as Array<{ tool_id: number; tags: string }>;

    // 构建标签映射
    const tagsMap = new Map<number, string>();
    tagsResult.forEach(row => {
      tagsMap.set(row.tool_id, row.tags);
    });

    // 在内存中合并数据
    return tools.map(tool => ({
      ...tool,
      tags: tagsMap.get(tool.id) || null
    }));
  },

  /**
   * 根据 legacy_id 获取工具的 INTEGER id（使用预编译语句）
   * @param legacyId - 数字类型的 legacy_id (如 1, 2, 3...)
   */
  getToolIdByLegacyId: (legacyId: number): number | null => {
    if (!preparedStatements.getToolIdByLegacyId) {
      console.error('❌ getToolIdByLegacyId 预编译语句未初始化!');
      throw new Error('数据库未正确初始化');
    }
    const result = preparedStatements.getToolIdByLegacyId.get(legacyId) as { id: number } | undefined;
    return result ? result.id : null;
  },

  /**
   * 根据 INTEGER id 获取工具详情（使用预编译语句）
   */
  getToolById: (id: number) => {
    return preparedStatements.getToolById!.get(id);
  },

  /**
   * 根据 legacy_id 获取工具详情（使用预编译语句）
   * @param legacyId - 数字类型的 legacy_id (如 1, 2, 3...)
   */
  getToolByLegacyId: (legacyId: number) => {
    return preparedStatements.getToolByLegacyId!.get(legacyId);
  },

  /**
   * 原子更新工具浏览量（使用预编译语句）
   */
  incrementViewCount: (id: number): void => {
    preparedStatements.incrementViewCount!.run(id);
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
   * 软删除工具（使用预编译语句）
   */
  softDeleteTool: (id: number): void => {
    preparedStatements.softDeleteTool!.run(id);
  },

  /**
   * 获取所有活跃分类（使用预编译语句）
   */
  getActiveCategories: () => {
    if (!preparedStatements.getActiveCategories) {
      console.error('❌ getActiveCategories 预编译语句未初始化!');
      throw new Error('数据库未正确初始化');
    }
    return preparedStatements.getActiveCategories.all();
  },

  /**
   * 获取站点配置（使用预编译语句）
   */
  getSiteConfig: () => {
    if (!preparedStatements.getSiteConfig) {
      console.error('❌ getSiteConfig 预编译语句未初始化!');
      throw new Error('数据库未正确初始化');
    }
    const config = preparedStatements.getSiteConfig.get() as any;

    if (!preparedStatements.getSiteKeywords) {
      console.error('❌ getSiteKeywords 预编译语句未初始化!');
      throw new Error('数据库未正确初始化');
    }
    const keywords = preparedStatements.getSiteKeywords.all() as Array<{ keyword: string }>;

    return {
      siteName: config.site_name,
      description: config.description,
      keywords: keywords.map(k => k.keyword)
    };
  },

  /**
   * 获取工具的标签（使用预编译语句）
   */
  getToolTags: (toolId: number): Array<{ id: number; name: string }> => {
    return preparedStatements.getToolTagsById!.all(toolId) as Array<{ id: number; name: string }>;
  },

  /**
   * 为工具添加标签（如果标签不存在则创建）- 使用预编译语句
   */
  addTagToTool: (toolId: number, tagName: string): void => {
    const db = getDatabase();

    const transaction = db.transaction(() => {
      // 查找或创建标签
      let tag = preparedStatements.getTagByName!.get(tagName) as { id: number } | undefined;

      if (!tag) {
        const result = preparedStatements.insertTag!.run(tagName);
        tag = { id: result.lastInsertRowid as number };
      }

      // 添加关联（如果不存在）
      preparedStatements.insertToolTag!.run(toolId, tag.id);
    });

    transaction();
  },

  /**
   * 从工具移除标签（使用预编译语句）
   */
  removeTagFromTool: (toolId: number, tagId: number): void => {
    preparedStatements.deleteToolTag!.run(toolId, tagId);
  },

  /**
   * 获取所有标签（使用预编译语句）
   */
  getAllTags: (): Array<{ id: number; name: string }> => {
    return preparedStatements.getAllTags!.all() as Array<{ id: number; name: string }>;
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
  },

  /**
   * FTS5 全文搜索（使用预编译语句）
   * @param query - 搜索查询（支持 FTS5 语法）
   * @param limit - 返回结果数量限制（默认 20）
   * @returns 搜索结果数组
   *
   * @example
   * // 基本搜索
   * dbHelpers.searchTools('Chat')
   *
   * // 前缀搜索
   * dbHelpers.searchTools('Chat*')
   *
   * // 多关键词 OR 搜索
   * dbHelpers.searchTools('聊天 OR 绘画')
   *
   * // 指定字段搜索
   * dbHelpers.searchTools('name: ChatGPT')
   */
  searchTools: (query: string, limit: number = 20): any[] => {
    if (!query || query.trim() === '') {
      return [];
    }

    try {
      // 使用预编译语句执行 FTS5 搜索
      return preparedStatements.searchTools!.all(query, limit) as any[];
    } catch (err: any) {
      // FTS5 语法错误时返回空数组
      if (err.message?.includes('fts5')) {
        console.warn('FTS5 查询语法错误:', query, err.message);
        return [];
      }
      throw err;
    }
  }
};
