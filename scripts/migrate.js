const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
    jsonPath: path.join(__dirname, '../public/data/settings.json'),
    dbPath: path.join(__dirname, '../ai_tools.db'),
    schemaPath: path.join(__dirname, 'schema.sql'),
    batchSize: 100  // 批量插入大小
};

class DatabaseMigration {
    constructor() {
        this.db = null;
        this.data = null;
        this.stats = {
            categories: 0,
            tools: 0,
            tags: 0,
            toolTags: 0
        };
    }

    // 从 ID 字符串中提取数字（如 "tool-001" -> 1, "category-6" -> 6）
    extractLegacyId(idString) {
        const match = idString.match(/-(\d+)$/);
        if (!match) {
            throw new Error(`无法从 ID 提取数字: ${idString}`);
        }
        return parseInt(match[1], 10);
    }

    // 1. 初始化数据库
    async initDatabase() {
        console.log('🔧 初始化数据库...');

        // 如果数据库已存在，删除它
        if (fs.existsSync(CONFIG.dbPath)) {
            console.log('⚠️  数据库文件已存在，将被删除');
            fs.unlinkSync(CONFIG.dbPath);
        }

        this.db = new Database(CONFIG.dbPath);

        // 启用外键约束
        this.db.pragma('foreign_keys = ON');

        // 启用WAL模式
        this.db.pragma('journal_mode = WAL');

        // 执行建表SQL
        const schema = fs.readFileSync(CONFIG.schemaPath, 'utf-8');
        this.db.exec(schema);

        console.log('✅ 数据库初始化完成');
        console.log('   - 外键约束：ON');
        console.log('   - 日志模式：WAL');
    }

    // 2. 加载JSON数据
    async loadJsonData() {
        console.log('\n📂 加载JSON数据...');

        const jsonContent = fs.readFileSync(CONFIG.jsonPath, 'utf-8');
        this.data = JSON.parse(jsonContent);

        console.log(`✅ 加载完成：${this.data.tools.length} 个工具，${this.data.categories.length} 个分类`);
    }

    // 3. 迁移站点配置
    async migrateSiteConfig() {
        console.log('\n🔄 迁移站点配置...');

        const logStmt = this.db.prepare(
            'INSERT INTO migration_log (batch_name, status) VALUES (?, ?)'
        );
        const logId = logStmt.run('site_config', 'running').lastInsertRowid;

        try {
            // 更新站点配置
            const stmt = this.db.prepare(`
                UPDATE site_config
                SET site_name = ?, description = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = 1
            `);
            stmt.run(this.data.siteConfig.siteName, this.data.siteConfig.description);

            // 插入关键词
            const kwStmt = this.db.prepare('INSERT OR IGNORE INTO site_keywords (keyword) VALUES (?)');
            const insertKeywords = this.db.transaction((keywords) => {
                keywords.forEach(kw => kwStmt.run(kw));
            });
            insertKeywords(this.data.siteConfig.keywords);

            // 更新日志
            this.db.prepare('UPDATE migration_log SET status = ?, completed_at = CURRENT_TIMESTAMP, records_migrated = ? WHERE id = ?')
                .run('completed', this.data.siteConfig.keywords.length, logId);

            console.log(`✅ 站点配置迁移完成（${this.data.siteConfig.keywords.length} 个关键词）`);
        } catch (error) {
            this.db.prepare('UPDATE migration_log SET status = ?, error_message = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?')
                .run('failed', error.message, logId);
            throw error;
        }
    }

    // 4. 迁移分类
    async migrateCategories() {
        console.log('\n🔄 迁移分类数据...');

        const logStmt = this.db.prepare(
            'INSERT INTO migration_log (batch_name, status) VALUES (?, ?)'
        );
        const logId = logStmt.run('categories', 'running').lastInsertRowid;

        try {
            const stmt = this.db.prepare(`
                INSERT INTO categories (legacy_id, name, icon, display_order)
                VALUES (?, ?, ?, ?)
            `);

            const insertCategories = this.db.transaction((categories) => {
                categories.forEach((cat, index) => {
                    const legacyId = this.extractLegacyId(cat.id);
                    stmt.run(legacyId, cat.name, cat.icon, index);
                    this.stats.categories++;
                });
            });

            insertCategories(this.data.categories);

            // 更新日志
            this.db.prepare('UPDATE migration_log SET status = ?, completed_at = CURRENT_TIMESTAMP, records_migrated = ? WHERE id = ?')
                .run('completed', this.stats.categories, logId);

            console.log(`✅ 分类迁移完成：${this.stats.categories} 条`);
        } catch (error) {
            this.db.prepare('UPDATE migration_log SET status = ?, error_message = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?')
                .run('failed', error.message, logId);
            throw error;
        }
    }

    // 5. 迁移工具和标签
    async migrateToolsAndTags() {
        console.log('\n🔄 迁移工具和标签数据...');

        const logStmt = this.db.prepare(
            'INSERT INTO migration_log (batch_name, status) VALUES (?, ?)'
        );
        const logId = logStmt.run('tools_and_tags', 'running').lastInsertRowid;

        try {
            // 准备语句
            const toolStmt = this.db.prepare(`
                INSERT INTO tools
                (legacy_id, name, description, logo, url, category_id, is_featured, is_new, view_count, added_date)
                VALUES (?, ?, ?, ?, ?, (SELECT id FROM categories WHERE legacy_id = ?), ?, ?, ?, ?)
            `);

            const tagStmt = this.db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
            const toolTagStmt = this.db.prepare(`
                INSERT INTO tool_tags (tool_id, tag_id)
                VALUES ((SELECT id FROM tools WHERE legacy_id = ?), (SELECT id FROM tags WHERE name = ?))
            `);

            // 使用事务批量插入
            const migrate = this.db.transaction((tools) => {
                tools.forEach(tool => {
                    // 提取 legacy_id 数字
                    const toolLegacyId = this.extractLegacyId(tool.id);
                    const categoryLegacyId = this.extractLegacyId(tool.categoryId);

                    // 插入工具
                    toolStmt.run(
                        toolLegacyId,
                        tool.name,
                        tool.description || null,
                        tool.logo || null,
                        tool.url || null,
                        categoryLegacyId,
                        tool.isFeatured ? 1 : 0,
                        tool.isNew ? 1 : 0,
                        tool.viewCount || 0,
                        tool.addedDate || null
                    );
                    this.stats.tools++;

                    // 插入标签
                    if (tool.tags && tool.tags.length > 0) {
                        tool.tags.forEach(tag => {
                            const result = tagStmt.run(tag);
                            if (result.changes > 0) {
                                this.stats.tags++;
                            }

                            // 关联工具和标签
                            toolTagStmt.run(toolLegacyId, tag);
                            this.stats.toolTags++;
                        });
                    }
                });
            });

            // 分批处理（每100条一批）
            for (let i = 0; i < this.data.tools.length; i += CONFIG.batchSize) {
                const batch = this.data.tools.slice(i, i + CONFIG.batchSize);
                migrate(batch);
                const progress = Math.min(i + CONFIG.batchSize, this.data.tools.length);
                console.log(`  进度：${progress}/${this.data.tools.length} (${Math.round(progress / this.data.tools.length * 100)}%)`);
            }

            // 更新日志
            this.db.prepare('UPDATE migration_log SET status = ?, completed_at = CURRENT_TIMESTAMP, records_migrated = ? WHERE id = ?')
                .run('completed', this.stats.tools, logId);

            console.log(`✅ 工具迁移完成：${this.stats.tools} 条`);
            console.log(`✅ 标签创建完成：${this.stats.tags} 条`);
            console.log(`✅ 工具-标签关联完成：${this.stats.toolTags} 条`);
        } catch (error) {
            this.db.prepare('UPDATE migration_log SET status = ?, error_message = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?')
                .run('failed', error.message, logId);
            throw error;
        }
    }

    // 6. 数据验证
    async verify() {
        console.log('\n🔍 验证数据完整性...');

        const checks = [
            {
                name: '分类数量',
                query: 'SELECT COUNT(*) as count FROM categories WHERE is_deleted = 0',
                expected: this.data.categories.length
            },
            {
                name: '工具数量',
                query: 'SELECT COUNT(*) as count FROM tools WHERE is_deleted = 0',
                expected: this.data.tools.length
            },
            {
                name: '外键完整性',
                query: 'SELECT COUNT(*) as count FROM tools WHERE category_id NOT IN (SELECT id FROM categories)',
                expected: 0
            },
            {
                name: '孤儿标签关联',
                query: 'SELECT COUNT(*) as count FROM tool_tags tt WHERE NOT EXISTS (SELECT 1 FROM tools WHERE id = tt.tool_id)',
                expected: 0
            }
        ];

        let allPassed = true;
        checks.forEach(check => {
            const result = this.db.prepare(check.query).get();
            const passed = result.count === check.expected;
            console.log(`  ${passed ? '✅' : '❌'} ${check.name}: ${result.count} (期望: ${check.expected})`);
            if (!passed) allPassed = false;
        });

        if (!allPassed) {
            throw new Error('数据验证失败！');
        }

        console.log('✅ 所有验证通过');
    }

    // 7. 生成迁移报告
    async generateReport() {
        console.log('\n📊 迁移报告');
        console.log('='.repeat(60));
        console.log(`站点名称：${this.data.siteConfig.siteName}`);
        console.log(`关键词：${this.data.siteConfig.keywords.length} 个`);
        console.log(`分类：${this.stats.categories} 条`);
        console.log(`工具：${this.stats.tools} 条`);
        console.log(`标签：${this.stats.tags} 条`);
        console.log(`工具-标签关联：${this.stats.toolTags} 条`);
        console.log('='.repeat(60));

        // 查询迁移日志
        const logs = this.db.prepare('SELECT * FROM migration_log ORDER BY started_at').all();
        console.log('\n📝 迁移日志：');
        logs.forEach(log => {
            const duration = log.completed_at
                ? Math.round((new Date(log.completed_at) - new Date(log.started_at)) / 1000)
                : '?';
            console.log(`  [${log.status.toUpperCase()}] ${log.batch_name} - ${log.records_migrated} 条记录 (${duration}秒)`);
            if (log.error_message) {
                console.log(`    错误：${log.error_message}`);
            }
        });

        // 数据库文件大小
        const stats = fs.statSync(CONFIG.dbPath);
        const sizeKB = (stats.size / 1024).toFixed(2);
        console.log(`\n💾 数据库文件大小：${sizeKB} KB`);
    }

    // 8. 关闭数据库
    async close() {
        if (this.db) {
            this.db.close();
            console.log('\n✅ 数据库连接已关闭');
        }
    }

    // 主执行流程
    async run() {
        const startTime = Date.now();

        try {
            console.log('🚀 开始数据库迁移');
            console.log('='.repeat(60));

            await this.initDatabase();
            await this.loadJsonData();
            await this.migrateSiteConfig();
            await this.migrateCategories();
            await this.migrateToolsAndTags();
            await this.verify();
            await this.generateReport();

            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`\n🎉 迁移成功完成！总耗时：${duration} 秒\n`);
            console.log('📌 下一步：');
            console.log('   1. 验证数据库：sqlite3 ai_tools.db "SELECT COUNT(*) FROM tools"');
            console.log('   2. 查看表结构：sqlite3 ai_tools.db ".schema"');
            console.log('   3. 修改应用代码，使用数据库而非JSON文件\n');
        } catch (error) {
            console.error('\n❌ 迁移失败：', error.message);
            console.error(error.stack);
            process.exit(1);
        } finally {
            await this.close();
        }
    }
}

// 执行迁移
if (require.main === module) {
    const migration = new DatabaseMigration();
    migration.run();
}

module.exports = DatabaseMigration;
