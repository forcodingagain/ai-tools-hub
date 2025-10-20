-- ============================================
-- AI工具导航数据库 - 完整建表脚本
-- 版本：v2.0
-- 创建日期：2025-10-20
-- 说明：包含所有数据表、索引、视图、触发器的创建语句
-- ============================================

-- 启用外键约束（必须！）
PRAGMA foreign_keys = ON;

-- 启用WAL模式（提升并发性能）
PRAGMA journal_mode = WAL;

-- 设置缓存大小（10MB）
PRAGMA cache_size = -10000;

-- ============================================
-- 1. 站点配置表（单例模式）
-- ============================================
CREATE TABLE site_config (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    site_name TEXT NOT NULL CHECK(LENGTH(site_name) > 0 AND LENGTH(site_name) <= 100),
    description TEXT CHECK(description IS NULL OR LENGTH(description) <= 500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. 站点关键词表
-- ============================================
CREATE TABLE site_keywords (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT NOT NULL UNIQUE COLLATE NOCASE CHECK(LENGTH(keyword) > 0 AND LENGTH(keyword) <= 50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. 分类表
-- ============================================
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    legacy_id INTEGER UNIQUE NOT NULL,
    name TEXT NOT NULL COLLATE NOCASE CHECK(LENGTH(name) > 0 AND LENGTH(name) <= 100),
    icon TEXT NOT NULL CHECK(LENGTH(icon) > 0 AND LENGTH(icon) <= 100),
    display_order INTEGER DEFAULT 0 CHECK(display_order >= 0),
    is_deleted INTEGER DEFAULT 0 CHECK(is_deleted IN (0, 1)),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME
);

-- ============================================
-- 4. 工具表（核心表）
-- ============================================
CREATE TABLE tools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    legacy_id INTEGER UNIQUE NOT NULL,
    name TEXT NOT NULL CHECK(LENGTH(name) > 0 AND LENGTH(name) <= 200),
    description TEXT CHECK(description IS NULL OR LENGTH(description) <= 1000),
    logo TEXT CHECK(logo IS NULL OR logo LIKE 'http%'),
    url TEXT CHECK(url IS NULL OR url LIKE 'http%'),
    category_id INTEGER NOT NULL,
    is_featured INTEGER DEFAULT 0 CHECK(is_featured IN (0, 1)),
    is_new INTEGER DEFAULT 0 CHECK(is_new IN (0, 1)),
    view_count INTEGER DEFAULT 0 CHECK(view_count >= 0),
    added_date DATETIME,
    is_deleted INTEGER DEFAULT 0 CHECK(is_deleted IN (0, 1)),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);

-- ============================================
-- 5. 标签表
-- ============================================
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE CHECK(LENGTH(name) > 0 AND LENGTH(name) <= 50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 6. 工具-标签关联表
-- ============================================
CREATE TABLE tool_tags (
    tool_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tool_id, tag_id),
    FOREIGN KEY (tool_id) REFERENCES tools(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- ============================================
-- 7. 迁移日志表
-- ============================================
CREATE TABLE migration_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_name TEXT NOT NULL CHECK(LENGTH(batch_name) > 0),
    status TEXT NOT NULL CHECK(status IN ('running', 'completed', 'failed', 'rollback')),
    records_migrated INTEGER DEFAULT 0 CHECK(records_migrated >= 0),
    error_message TEXT,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

-- ============================================
-- 8. 数据库版本表
-- ============================================
CREATE TABLE db_version (
    version TEXT PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 索引创建
-- ============================================

-- 分类表索引
-- 索引：显示排序（仅未删除）
CREATE INDEX idx_category_display_order ON categories(display_order)
WHERE is_deleted = 0;

-- 索引：legacy_id快速查找
CREATE INDEX idx_category_legacy_id ON categories(legacy_id);

-- 工具表索引
-- 索引：复合索引（分类+浏览量，仅未删除）
CREATE INDEX idx_tool_category_viewcount
ON tools(category_id, view_count DESC)
WHERE is_deleted = 0;

-- 索引：复合索引（常用工具+浏览量，仅未删除）
CREATE INDEX idx_tool_featured_viewcount
ON tools(is_featured, view_count DESC)
WHERE is_deleted = 0 AND is_featured = 1;

-- 索引：复合索引（最新工具+添加日期，仅未删除）
CREATE INDEX idx_tool_new_date
ON tools(is_new, added_date DESC)
WHERE is_deleted = 0 AND is_new = 1;

-- 索引：legacy_id快速查找
CREATE INDEX idx_tool_legacy_id ON tools(legacy_id);

-- 索引：名称搜索（未来可改为FTS5）
CREATE INDEX idx_tool_name ON tools(name COLLATE NOCASE)
WHERE is_deleted = 0;

-- 标签关联表索引
-- 索引：标签反查工具
CREATE INDEX idx_tool_tags_tag ON tool_tags(tag_id);

-- ============================================
-- 视图创建
-- ============================================

-- 视图：活跃工具（未删除）
CREATE VIEW v_active_tools AS
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
    t.created_at,
    GROUP_CONCAT(tg.name, ',') as tags
FROM tools t
LEFT JOIN categories c ON t.category_id = c.id
LEFT JOIN tool_tags tt ON t.id = tt.tool_id
LEFT JOIN tags tg ON tt.tag_id = tg.id
WHERE t.is_deleted = 0 AND c.is_deleted = 0
GROUP BY t.id;

-- 视图：分类统计
CREATE VIEW v_category_stats AS
SELECT
    c.id,
    c.legacy_id,
    c.name,
    c.icon,
    c.display_order,
    COUNT(t.id) as tool_count,
    SUM(t.view_count) as total_views
FROM categories c
LEFT JOIN tools t ON c.id = t.category_id AND t.is_deleted = 0
WHERE c.is_deleted = 0
GROUP BY c.id;

-- ============================================
-- 触发器创建
-- ============================================

-- 触发器：自动更新 updated_at
-- 触发器：site_config
CREATE TRIGGER update_site_config_timestamp
AFTER UPDATE ON site_config
FOR EACH ROW
BEGIN
    UPDATE site_config SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 触发器：categories
CREATE TRIGGER update_categories_timestamp
AFTER UPDATE ON categories
FOR EACH ROW
BEGIN
    UPDATE categories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 触发器：tools
CREATE TRIGGER update_tools_timestamp
AFTER UPDATE ON tools
FOR EACH ROW
BEGIN
    UPDATE tools SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 触发器：软删除分类时同步删除时间
CREATE TRIGGER soft_delete_category
AFTER UPDATE OF is_deleted ON categories
FOR EACH ROW
WHEN NEW.is_deleted = 1 AND OLD.is_deleted = 0
BEGIN
    UPDATE categories SET deleted_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 触发器：软删除工具时同步删除时间
CREATE TRIGGER soft_delete_tool
AFTER UPDATE OF is_deleted ON tools
FOR EACH ROW
WHEN NEW.is_deleted = 1 AND OLD.is_deleted = 0
BEGIN
    UPDATE tools SET deleted_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ============================================
-- FTS5 全文搜索（可选功能）
-- ============================================

-- 创建 FTS5 虚拟表（支持中文分词）
-- 注意：使用 contentless 模式，不依赖 tools 表结构
-- 这样可以索引派生字段（tags, category_name）
-- 取消注释下面的语句来启用全文搜索功能
/*
CREATE VIRTUAL TABLE tools_fts USING fts5(
  name,                    -- 工具名称
  description,             -- 工具描述
  tags,                    -- 标签（空格分隔）
  category_name,           -- 分类名称
  tokenize='unicode61 remove_diacritics 2'  -- Unicode 分词器，支持中文
);
*/

-- FTS5 相关触发器（需要配合上面的虚拟表一起使用）
/*
-- 创建触发器：新增工具时自动更新 FTS 索引
CREATE TRIGGER tools_fts_insert
AFTER INSERT ON tools
WHEN NEW.is_deleted = 0
BEGIN
  INSERT INTO tools_fts(rowid, name, description, tags, category_name)
  SELECT
    NEW.id,
    NEW.name,
    COALESCE(NEW.description, ''),
    COALESCE(
      (SELECT GROUP_CONCAT(tg.name, ' ')
       FROM tool_tags tt
       JOIN tags tg ON tt.tag_id = tg.id
       WHERE tt.tool_id = NEW.id),
      ''
    ),
    COALESCE(
      (SELECT name FROM categories WHERE id = NEW.category_id),
      ''
    );
END;

-- 创建触发器：更新工具时自动更新 FTS 索引
CREATE TRIGGER tools_fts_update
AFTER UPDATE ON tools
WHEN NEW.is_deleted = 0
BEGIN
  -- 先删除旧数据
  DELETE FROM tools_fts WHERE rowid = OLD.id;

  -- 插入新数据
  INSERT INTO tools_fts(rowid, name, description, tags, category_name)
  SELECT
    NEW.id,
    NEW.name,
    COALESCE(NEW.description, ''),
    COALESCE(
      (SELECT GROUP_CONCAT(tg.name, ' ')
       FROM tool_tags tt
       JOIN tags tg ON tt.tag_id = tg.id
       WHERE tt.tool_id = NEW.id),
      ''
    ),
    COALESCE(
      (SELECT name FROM categories WHERE id = NEW.category_id),
      ''
    );
END;

-- 创建触发器：软删除工具时从 FTS 索引移除
CREATE TRIGGER tools_fts_delete
AFTER UPDATE ON tools
WHEN NEW.is_deleted = 1
BEGIN
  DELETE FROM tools_fts WHERE rowid = OLD.id;
END;

-- 创建触发器：标签变化时更新 FTS 索引
CREATE TRIGGER tools_fts_tag_insert
AFTER INSERT ON tool_tags
BEGIN
  -- 更新对应工具的 FTS 索引
  DELETE FROM tools_fts WHERE rowid = NEW.tool_id;

  INSERT INTO tools_fts(rowid, name, description, tags, category_name)
  SELECT
    t.id,
    t.name,
    COALESCE(t.description, ''),
    COALESCE(
      (SELECT GROUP_CONCAT(tg.name, ' ')
       FROM tool_tags tt
       JOIN tags tg ON tt.tag_id = tg.id
       WHERE tt.tool_id = t.id),
      ''
    ),
    COALESCE(c.name, '')
  FROM tools t
  LEFT JOIN categories c ON t.category_id = c.id
  WHERE t.id = NEW.tool_id AND t.is_deleted = 0;
END;

-- 创建触发器：删除标签关联时更新 FTS 索引
CREATE TRIGGER tools_fts_tag_delete
AFTER DELETE ON tool_tags
BEGIN
  -- 更新对应工具的 FTS 索引
  DELETE FROM tools_fts WHERE rowid = OLD.tool_id;

  INSERT INTO tools_fts(rowid, name, description, tags, category_name)
  SELECT
    t.id,
    t.name,
    COALESCE(t.description, ''),
    COALESCE(
      (SELECT GROUP_CONCAT(tg.name, ' ')
       FROM tool_tags tt
       JOIN tags tg ON tt.tag_id = tg.id
       WHERE tt.tool_id = t.id),
      ''
    ),
    COALESCE(c.name, '')
  FROM tools t
  LEFT JOIN categories c ON t.category_id = c.id
  WHERE t.id = OLD.tool_id AND t.is_deleted = 0;
END;
*/

-- ============================================
-- 初始化数据
-- ============================================

-- 插入站点配置（占位，迁移时会覆盖）
INSERT INTO site_config (id, site_name, description)
VALUES (1, 'AI站点', '收录全球优秀 AI 工具');

-- 插入数据库版本信息
INSERT INTO db_version (version) VALUES ('2.0.0');

-- ============================================
-- 创建完成
-- ============================================

-- 验证脚本执行成功
-- 检查所有表是否创建成功
SELECT
    name as table_name,
    type as object_type
FROM sqlite_master
WHERE type IN ('table', 'view', 'trigger', 'index')
    AND name NOT LIKE 'sqlite_%'
ORDER BY type, name;

-- 显示数据库统计信息
SELECT
    'site_config' as table_name,
    COUNT(*) as record_count
FROM site_config
UNION ALL
SELECT
    'categories' as table_name,
    COUNT(*) as record_count
FROM categories
UNION ALL
SELECT
    'tools' as table_name,
    COUNT(*) as record_count
FROM tools
UNION ALL
SELECT
    'tags' as table_name,
    COUNT(*) as record_count
FROM tags
UNION ALL
SELECT
    'tool_tags' as table_name,
    COUNT(*) as record_count
FROM tool_tags
UNION ALL
SELECT
    'site_keywords' as table_name,
    COUNT(*) as record_count
FROM site_keywords
UNION ALL
SELECT
    'migration_log' as table_name,
    COUNT(*) as record_count
FROM migration_log;