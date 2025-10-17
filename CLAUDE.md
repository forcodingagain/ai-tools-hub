# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此代码库中工作时提供指导。

## 项目概览

AI工具导航门户 - 基于 Next.js 的 AI 工具目录网站，使用 Ant Design UI，提供分类工具列表、搜索功能和浏览量统计。

**技术栈：**
- Next.js 15.5.5 (App Router)
- React 18.3.1
- Ant Design 5.27.5
- TypeScript 5.9.3
- SQLite (better-sqlite3) - 已从 JSON 存储迁移
- ahooks React hooks 工具库

## 开发命令

```bash
# 开发服务器 (运行在 http://localhost:3000)
npm run dev

# 生产环境构建
npm run build

# 启动生产服务器
npm start

# 代码检查
npm run lint
```

## 数据库迁移系统

**⚠️ 重要：** 本项目已从 JSON (`public/data/settings.json`) 迁移到 SQLite (`ai_tools.db`)。迁移脚本位于 `scripts/` 目录。

### 迁移命令

```bash
# 迁移前分析数据
node scripts/analyze-data.js

# 执行完整迁移
node scripts/migrate.js

# 将数据库导出回 JSON（回滚）
node scripts/export-to-json.js
```

### 数据库架构

**数据库文件：** `ai_tools.db` (SQLite，已启用 WAL 模式)

**核心表：**
- `site_config` - 站点配置（单例模式，id=1）
- `site_keywords` - SEO 关键词
- `categories` - 工具分类，包含 `legacy_id` 用于 JSON 兼容
- `tools` - 主工具表，包含 `legacy_id` 用于 JSON 兼容
- `tags` - 唯一标签
- `tool_tags` - 工具和标签的多对多关系
- `migration_log` - 迁移历史记录

**重要视图：**
- `v_active_tools` - 活跃工具及其分类名称和标签（用于列表展示）
- `v_category_stats` - 分类统计及工具数量

**必读文档：** 完整数据库架构和迁移方案详见 `docs/database-migration-plan.md`

### 数据库关键规则

1. **始终启用外键约束：**
   ```javascript
   db.pragma('foreign_keys = ON');
   ```

2. **使用 INTEGER 主键，而非 legacy_id：**
   ```javascript
   // ✅ 正确
   db.prepare('SELECT * FROM tools WHERE id = ?').get(toolId);

   // ❌ 错误（更慢）
   db.prepare('SELECT * FROM tools WHERE legacy_id = ?').get('tool-001');
   ```

3. **已启用软删除：** 查询时必须使用 `WHERE is_deleted = 0`

4. **浏览量更新必须是原子操作：**
   ```javascript
   // ✅ 正确
   db.prepare('UPDATE tools SET view_count = view_count + 1 WHERE id = ?').run(id);

   // ❌ 错误（存在竞态条件）
   const tool = db.prepare('SELECT view_count FROM tools WHERE id = ?').get(id);
   db.prepare('UPDATE tools SET view_count = ? WHERE id = ?').run(tool.view_count + 1, id);
   ```

## 应用架构

### 目录结构

```
app/
├── api/                    # Next.js API 路由
│   ├── settings/          # GET 获取设置数据
│   ├── tools/[toolId]/    # PUT/DELETE 工具操作
│   └── tools/sync-viewcount/  # POST 同步 localStorage 浏览量到服务器
├── components/
│   ├── Common/            # 可复用组件（ThemeSwitch）
│   ├── Content/           # 内容区域（CategorySection, ToolCard, ToolGrid, TabWidget）
│   ├── Header/            # 头部和搜索栏
│   └── Layout/            # 布局组件（MainLayout, Sidebar, CategoryMenu, FloatToolbar）
├── context/
│   ├── SettingsContext.jsx  # 全局设置状态（工具、分类）
│   └── ThemeContext.jsx     # 主题切换状态
├── hooks/
│   ├── useSettings.js     # 从 /data/settings.json 获取和管理设置
│   ├── useSearch.js       # 搜索功能
│   └── useScrollSpy.js    # 滚动位置追踪
├── globals.css            # 全局样式及 CSS 变量
├── layout.tsx             # 根布局及 AntdRegistry
└── page.tsx               # 首页入口
```

### 数据流

1. **设置加载：**
   - `useSettings` hook 获取 `/data/settings.json`（当前使用 JSON，将来迁移到数据库 API）
   - 合并 localStorage 中的浏览量与服务器数据
   - 通过 `SettingsContext` 提供给整个应用

2. **浏览量系统：**
   - **客户端：** 存储在 localStorage，键名为 `ai-tools-viewcount`
   - **服务器同步：** 通过"同步浏览数据"按钮手动同步 → 调用 `/api/tools/sync-viewcount`
   - **未来：** 需要迁移到使用数据库

3. **主题系统：**
   - 使用 `globals.css` 中的 CSS 变量（`--bg-primary`, `--text-primary` 等）
   - `ThemeContext` 管理 body 上的 `[data-theme='dark']` 属性
   - Ant Design 组件通过 ConfigProvider 设置样式

### 组件通信

- **SettingsProvider** 包裹整个应用，提供：
  - `settings`（siteConfig、categories、tools）
  - `incrementViewCount(toolId)` - 更新 localStorage
  - `updateTool(toolId, data)` - 调用 API
  - `deleteTool(toolId)` - 调用 API
  - `syncViewCountToServer()` - 同步到服务器

- **MainLayout** 是主要容器：
  - 管理侧边栏折叠状态
  - 处理移动端/桌面端响应式行为
  - 渲染 CategoryMenu、ToolGrid、FloatToolbar

### 样式规范

- **Ant Design 组件：** 使用 ConfigProvider 设置主题
- **自定义组件：** CSS 模块（如 `Header.css`、`ToolCard.css`）
- **全局样式：** `globals.css` 使用 CSS 自定义属性
- **重要：** Header 背景已改为 `transparent` 以使用页面背景色

### 右键菜单

ToolCard 组件支持右键菜单，包括：
- 编辑工具（打开带表单的 Modal）
- 删除工具（使用 `App.useApp()` 的 `modal.confirm` 确认）

**重要：** 使用 `App.useApp()` hooks 来创建模态框/消息，不要使用静态方法：
```javascript
// ✅ 正确（支持主题）
const { modal, message } = App.useApp();
modal.confirm({ ... });

// ❌ 错误（不支持主题）
Modal.confirm({ ... });
```

## 迁移注意事项

### 当前状态（基于 JSON）

- 数据：`public/data/settings.json`
- 浏览量：仅存储在 localStorage
- API 路由：读写 JSON 文件

### 迁移后状态（基于数据库）

实现数据库 API 路由时：

1. 使用单例模式的 `better-sqlite3`
2. 启用 WAL 模式：`db.pragma('journal_mode = WAL')`
3. 始终启用外键：`db.pragma('foreign_keys = ON')`
4. 对所有查询使用预编译语句
5. 对多步骤操作使用事务
6. 查询视图（`v_active_tools`）以提升性能

### API 迁移清单

将 API 路由转换为使用数据库时：

- [ ] 导入数据库连接单例
- [ ] 在 WHERE 子句中使用 INTEGER `id`，而非 `legacy_id`
- [ ] 过滤软删除记录：`WHERE is_deleted = 0`
- [ ] 使用 `v_active_tools` 视图获取工具列表
- [ ] 实现原子浏览量更新
- [ ] 添加 SQLITE_BUSY 错误处理（重试逻辑）

## 性能说明

- **索引：** 数据库拥有 14 个优化索引，包括复合索引和部分索引
- **浏览量：** 高频更新 - 生产环境建议使用 Redis 缓冲
- **软删除：** 所有查询必须过滤 `is_deleted = 0`
- **传统兼容性：** 使用 `legacy_id` 字段在过渡期保持兼容性

## 数据库测试

```bash
# 查询工具数量
sqlite3 ai_tools.db "SELECT COUNT(*) FROM tools WHERE is_deleted = 0"

# 查看数据库架构
sqlite3 ai_tools.db ".schema tools"

# 检查数据库完整性
sqlite3 ai_tools.db "PRAGMA integrity_check"

# 查看活跃工具及标签
sqlite3 ai_tools.db "SELECT * FROM v_active_tools LIMIT 5"
```

## 已知问题和限制

1. **React 版本不匹配警告：** `@types/react` 已从 19.x 降级到 18.x 以匹配运行时 React 18.3.1
2. **SQLite 限制：** 单写入者，使用 WAL 模式支持并发读取
3. **浏览量同步：** 手动操作，生产环境建议考虑后台同步
4. **传统 ID：** `legacy_id` 字段用于迁移期间的向后兼容性
