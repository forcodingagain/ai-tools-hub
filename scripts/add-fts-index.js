/**
 * P1-3: 添加 FTS5 全文搜索索引
 *
 * 执行方式:
 *   node scripts/add-fts-index.js
 *
 * 功能:
 *   1. 创建 FTS5 虚拟表
 *   2. 同步现有工具数据
 *   3. 创建自动同步触发器
 *   4. 运行性能基准测试
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', 'ai_tools.db');
const sqlPath = path.join(__dirname, 'add-fts-index.sql');

console.log('🚀 开始添加 FTS5 全文搜索索引...\n');

// 检查数据库文件是否存在
if (!fs.existsSync(dbPath)) {
  console.error('❌ 错误: 数据库文件不存在:', dbPath);
  process.exit(1);
}

// 检查 SQL 文件是否存在
if (!fs.existsSync(sqlPath)) {
  console.error('❌ 错误: SQL 文件不存在:', sqlPath);
  process.exit(1);
}

// 打开数据库连接
const db = new Database(dbPath);

// 启用外键约束
db.pragma('foreign_keys = ON');

console.log('✅ 数据库连接已建立\n');

try {
  // 读取 SQL 文件
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('📝 准备执行 SQL 语句...\n');

  // 直接使用 db.exec() 执行整个 SQL 文件（SQLite 会自动处理多条语句）
  // 但是需要移除注释块
  const cleanedSql = sql
    .replace(/\/\*[\s\S]*?\*\//g, '')  // 移除 /* ... */ 注释块
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))  // 移除 -- 注释行
    .join('\n');

  // 分步执行主要操作，便于显示进度
  try {
    // 1. 创建 FTS5 虚拟表（使用 contentless，不依赖 tools 表结构）
    console.log('📌 步骤 1: 创建 FTS5 虚拟表...');
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS tools_fts USING fts5(
        name,
        description,
        tags,
        category_name,
        tokenize='unicode61 remove_diacritics 2'
      );
    `);
    console.log('✅ FTS5 虚拟表已创建（contentless 模式）\n');
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log('⚠️  FTS5 虚拟表已存在，跳过创建\n');
    } else {
      throw err;
    }
  }

  // 2. 初始化数据
  console.log('📌 步骤 2: 同步现有工具数据...');
  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO tools_fts(rowid, name, description, tags, category_name)
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
    WHERE t.is_deleted = 0
  `);
  insertStmt.run();
  const result = db.prepare('SELECT COUNT(*) as count FROM tools_fts').get();
  console.log(`✅ 已同步 ${result.count} 个工具到 FTS 索引\n`);

  // 3. 创建触发器
  console.log('📌 步骤 3: 创建自动同步触发器...');

  const triggers = [
    {
      name: 'tools_fts_insert',
      sql: `
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
      `
    },
    {
      name: 'tools_fts_update',
      sql: `
        CREATE TRIGGER IF NOT EXISTS tools_fts_update
        AFTER UPDATE ON tools
        WHEN NEW.is_deleted = 0
        BEGIN
          DELETE FROM tools_fts WHERE rowid = OLD.id;
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
      `
    },
    {
      name: 'tools_fts_delete',
      sql: `
        CREATE TRIGGER IF NOT EXISTS tools_fts_delete
        AFTER UPDATE ON tools
        WHEN NEW.is_deleted = 1
        BEGIN
          DELETE FROM tools_fts WHERE rowid = OLD.id;
        END;
      `
    },
    {
      name: 'tools_fts_tag_insert',
      sql: `
        CREATE TRIGGER IF NOT EXISTS tools_fts_tag_insert
        AFTER INSERT ON tool_tags
        BEGIN
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
      `
    },
    {
      name: 'tools_fts_tag_delete',
      sql: `
        CREATE TRIGGER IF NOT EXISTS tools_fts_tag_delete
        AFTER DELETE ON tool_tags
        BEGIN
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
      `
    }
  ];

  let triggerCount = 0;
  for (const trigger of triggers) {
    try {
      db.exec(trigger.sql);
      console.log(`   ✅ ${trigger.name}`);
      triggerCount++;
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log(`   ⚠️  ${trigger.name} 已存在`);
      } else {
        throw err;
      }
    }
  }
  console.log(`\n✅ 成功创建 ${triggerCount} 个触发器\n`);

  // 验证 FTS 索引
  console.log('📊 验证 FTS 索引...\n');

  const toolsCount = db.prepare('SELECT COUNT(*) as count FROM tools WHERE is_deleted = 0').get();
  const ftsCount = db.prepare('SELECT COUNT(*) as count FROM tools_fts').get();

  console.log(`📌 活跃工具数: ${toolsCount.count}`);
  console.log(`📌 FTS 索引数: ${ftsCount.count}`);

  if (toolsCount.count === ftsCount.count) {
    console.log('✅ 数据同步验证通过\n');
  } else {
    console.warn(`⚠️  警告: 工具数 (${toolsCount.count}) 与 FTS 索引数 (${ftsCount.count}) 不一致\n`);
  }

  // 运行性能基准测试
  console.log('🏃 运行性能基准测试...\n');

  // 测试 1: FTS5 搜索
  const ftsStart = Date.now();
  const ftsResults = db.prepare(`
    SELECT COUNT(*) as count
    FROM tools_fts
    WHERE tools_fts MATCH ?
  `).get('AI');
  const ftsTime = Date.now() - ftsStart;

  console.log(`📊 FTS5 搜索 "AI": ${ftsResults.count} 个结果, 耗时 ${ftsTime}ms`);

  // 测试 2: 传统 LIKE 搜索（用于对比）
  const likeStart = Date.now();
  const likeResults = db.prepare(`
    SELECT COUNT(*) as count
    FROM tools
    WHERE (name LIKE ? OR description LIKE ?) AND is_deleted = 0
  `).get('%AI%', '%AI%');
  const likeTime = Date.now() - likeStart;

  console.log(`📊 LIKE 搜索 "AI": ${likeResults.count} 个结果, 耗时 ${likeTime}ms`);

  const speedup = (likeTime / ftsTime).toFixed(2);
  console.log(`\n🚀 FTS5 速度提升: ${speedup}x (${likeTime}ms → ${ftsTime}ms)\n`);

  // 测试 3: 复杂查询
  const complexStart = Date.now();
  const complexResults = db.prepare(`
    SELECT t.id, t.name
    FROM tools_fts fts
    JOIN v_active_tools t ON fts.rowid = t.id
    WHERE tools_fts MATCH ?
    ORDER BY rank
    LIMIT 10
  `).all('聊天 OR 绘画');
  const complexTime = Date.now() - complexStart;

  console.log(`📊 复杂查询 "聊天 OR 绘画": ${complexResults.length} 个结果, 耗时 ${complexTime}ms`);

  if (complexResults.length > 0) {
    console.log('   示例结果:');
    complexResults.slice(0, 3).forEach((tool, i) => {
      console.log(`   ${i + 1}. ${tool.name}`);
    });
  }

  console.log('\n✅ FTS5 全文搜索索引添加完成！\n');

  // 显示使用建议
  console.log('📖 使用建议:\n');
  console.log('1. API 路由示例:');
  console.log('   GET /api/search?q=聊天\n');
  console.log('2. 查询示例:');
  console.log('   db.prepare(`');
  console.log('     SELECT t.*');
  console.log('     FROM tools_fts fts');
  console.log('     JOIN v_active_tools t ON fts.rowid = t.id');
  console.log('     WHERE tools_fts MATCH ?');
  console.log('     ORDER BY rank');
  console.log('     LIMIT 20');
  console.log('   `).all(searchQuery);\n');
  console.log('3. 维护命令:');
  console.log('   sqlite3 ai_tools.db "INSERT INTO tools_fts(tools_fts) VALUES(\'optimize\')"\n');

  // 记录迁移日志
  try {
    db.prepare(`
      INSERT INTO migration_log (script_name, description, status)
      VALUES (?, ?, ?)
    `).run(
      'P1-3_add_fts5_index',
      `添加 FTS5 全文搜索索引，性能提升 ${speedup}x`,
      'success'
    );
  } catch (logErr) {
    console.warn('⚠️  无法记录迁移日志:', logErr.message);
  }

} catch (err) {
  console.error('\n❌ 执行失败:', err.message);
  console.error(err.stack);

  // 记录失败日志
  try {
    db.prepare(`
      INSERT INTO migration_log (script_name, description, status, error_message)
      VALUES (?, ?, ?, ?)
    `).run(
      'P1-3_add_fts5_index',
      '添加 FTS5 全文搜索索引',
      'failed',
      err.message
    );
  } catch (logErr) {
    console.error('❌ 无法记录失败日志:', logErr.message);
  }

  process.exit(1);
} finally {
  // 关闭数据库连接
  db.close();
  console.log('✅ 数据库连接已关闭');
}
