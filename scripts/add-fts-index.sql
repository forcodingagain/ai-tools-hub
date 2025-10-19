-- ============================================
-- P1-3: FTS5 全文搜索索引
-- 创建日期: 2025-10-19
-- 目标: 将搜索性能从 50-100ms 降低到 <10ms
-- ============================================

-- 1. 创建 FTS5 虚拟表（支持中文分词）
-- 注意：使用 contentless 模式，不依赖 tools 表结构
-- 这样可以索引派生字段（tags, category_name）
CREATE VIRTUAL TABLE IF NOT EXISTS tools_fts USING fts5(
  name,                    -- 工具名称
  description,             -- 工具描述
  tags,                    -- 标签（空格分隔）
  category_name,           -- 分类名称
  tokenize='unicode61 remove_diacritics 2'  -- Unicode 分词器，支持中文
);

-- 2. 初始化数据（从现有工具同步）
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
  ) as tags,
  COALESCE(c.name, '')
FROM tools t
LEFT JOIN categories c ON t.category_id = c.id
WHERE t.is_deleted = 0;

-- 3. 创建触发器：新增工具时自动更新 FTS 索引
CREATE TRIGGER IF NOT EXISTS tools_fts_insert
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

-- 4. 创建触发器：更新工具时自动更新 FTS 索引
CREATE TRIGGER IF NOT EXISTS tools_fts_update
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

-- 5. 创建触发器：软删除工具时从 FTS 索引移除
CREATE TRIGGER IF NOT EXISTS tools_fts_delete
AFTER UPDATE ON tools
WHEN NEW.is_deleted = 1
BEGIN
  DELETE FROM tools_fts WHERE rowid = OLD.id;
END;

-- 6. 创建触发器：标签变化时更新 FTS 索引
CREATE TRIGGER IF NOT EXISTS tools_fts_tag_insert
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

-- 7. 创建触发器：删除标签关联时更新 FTS 索引
CREATE TRIGGER IF NOT EXISTS tools_fts_tag_delete
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

-- ============================================
-- 使用示例
-- ============================================

/*
-- 1. 基础搜索（在所有字段中搜索）
SELECT t.*
FROM tools_fts fts
JOIN v_active_tools t ON fts.rowid = t.id
WHERE tools_fts MATCH '聊天'
ORDER BY rank;

-- 2. 指定字段搜索（只在名称中搜索）
SELECT t.*
FROM tools_fts fts
JOIN v_active_tools t ON fts.rowid = t.id
WHERE tools_fts MATCH 'name: ChatGPT'
ORDER BY rank;

-- 3. 多关键词搜索（AND 逻辑）
SELECT t.*
FROM tools_fts fts
JOIN v_active_tools t ON fts.rowid = t.id
WHERE tools_fts MATCH '聊天 AI'
ORDER BY rank;

-- 4. 多关键词搜索（OR 逻辑）
SELECT t.*
FROM tools_fts fts
JOIN v_active_tools t ON fts.rowid = t.id
WHERE tools_fts MATCH '聊天 OR 绘画'
ORDER BY rank;

-- 5. 前缀搜索（查找以 "Chat" 开头的工具）
SELECT t.*
FROM tools_fts fts
JOIN v_active_tools t ON fts.rowid = t.id
WHERE tools_fts MATCH 'Chat*'
ORDER BY rank;

-- 6. 带高亮的搜索结果
SELECT
  t.*,
  snippet(tools_fts, 0, '<mark>', '</mark>', '...', 32) as highlighted_name,
  snippet(tools_fts, 1, '<mark>', '</mark>', '...', 64) as highlighted_description
FROM tools_fts fts
JOIN v_active_tools t ON fts.rowid = t.id
WHERE tools_fts MATCH '聊天'
ORDER BY rank;
*/

-- ============================================
-- 性能基准测试
-- ============================================

/*
-- 测试 1: FTS5 搜索性能
.timer on
SELECT COUNT(*) FROM tools_fts WHERE tools_fts MATCH '聊天';
-- 预期: < 10ms

-- 测试 2: 传统 LIKE 搜索性能（用于对比）
SELECT COUNT(*) FROM tools
WHERE name LIKE '%聊天%' OR description LIKE '%聊天%';
-- 预期: 50-100ms

-- 测试 3: 复杂查询性能
SELECT t.*
FROM tools_fts fts
JOIN v_active_tools t ON fts.rowid = t.id
WHERE tools_fts MATCH '聊天 OR 绘画 OR 写作'
ORDER BY rank
LIMIT 20;
-- 预期: < 15ms
*/

-- ============================================
-- 维护命令
-- ============================================

/*
-- 重建 FTS 索引（数据不一致时使用）
DELETE FROM tools_fts;
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
WHERE t.is_deleted = 0;

-- 优化 FTS 索引（定期执行，压缩索引）
INSERT INTO tools_fts(tools_fts) VALUES('optimize');

-- 检查 FTS 索引完整性
INSERT INTO tools_fts(tools_fts) VALUES('integrity-check');
*/
