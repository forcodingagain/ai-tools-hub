# AI集盒 - AI工具导航门户

> 🤖 收录全球优秀 AI 工具的一站式导航平台

[![Next.js](https://img.shields.io/badge/Next.js-15.5.5-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.3.1-blue?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Ant Design](https://img.shields.io/badge/Ant%20Design-5.27.5-0170FE?logo=antdesign)](https://ant.design/)
[![SQLite](https://img.shields.io/badge/SQLite-better--sqlite3-003B57?logo=sqlite)](https://github.com/JoshuaWise/better-sqlite3)

## ✨ 特性

- 🚀 **现代化技术栈** - 基于 Next.js 15 App Router，React 18，TypeScript
- 🎨 **优雅 UI 设计** - 使用 Ant Design 组件库
- 🔍 **强大搜索功能** - 支持工具名称、描述、标签的实时搜索
- 📊 **浏览量统计** - 本地存储 + 服务器同步的浏览量追踪
- 📱 **响应式设计** - 完美适配桌面端和移动端
- 🗂️ **分类管理** - 灵活的工具分类系统
- 🏷️ **标签系统** - 多对多标签关联，支持工具的灵活标记
- 💾 **SQLite 数据库** - 高性能本地数据库，支持 WAL 模式
- 🛠️ **右键菜单** - 支持工具的快速编辑和删除
- 🎯 **SEO 优化** - 完善的元数据和语义化 HTML

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 开发环境

```bash
# 启动开发服务器 (http://localhost:3000)
npm run dev

# 启用 Turbo 模式开发 (更快)
npm run dev:turbo

# 调试模式
npm run dev:debug
```

### 生产环境

```bash
# 构建生产版本
npm run build

# 启动生产服务器 (Standalone 模式)
npm start

# 标准模式启动 (需要移除 standalone 配置)
npm run start:standard
```

## 📁 项目结构

```
ai_tools_nextjs/
├── app/                      # Next.js App Router
│   ├── api/                 # API 路由
│   │   ├── settings/        # 站点配置 API
│   │   ├── tools/          # 工具管理 API
│   │   └── search/         # 搜索 API
│   ├── components/         # React 组件
│   │   ├── Common/         # 通用组件
│   │   ├── Content/        # 内容组件
│   │   ├── Header/         # 头部组件
│   │   └── Layout/         # 布局组件
│   ├── context/           # React Context
│   ├── hooks/             # 自定义 Hooks
│   ├── globals.css        # 全局样式
│   ├── layout.tsx         # 根布局
│   └── page.tsx           # 首页
├── lib/                   # 工具库
│   └── db.js             # 数据库连接
├── public/               # 静态资源
│   └── data/            # 数据文件 (迁移中)
├── scripts/             # 数据库迁移脚本
├── docs/               # 项目文档
├── ai_tools.db        # SQLite 数据库
└── CLAUDE.md          # Claude Code 工作指导
```

## 💾 数据库系统

### 数据库架构

项目使用 SQLite 作为主要数据存储，采用高性能设计：

**核心数据表（8个）：**
- **`site_config`** - 站点配置（单例模式，id=1）
- **`site_keywords`** - SEO 关键词管理
- **`categories`** - 工具分类（支持软删除）
- **`tools`** - AI 工具信息（核心表，支持浏览量统计）
- **`tags`** - 唯一标签表
- **`tool_tags`** - 工具标签多对多关联表
- **`migration_log`** - 数据迁移历史记录
- **`db_version`** - 数据库版本管理

**优化视图（2个）：**
- **`v_active_tools`** - 活跃工具视图（包含分类名称和标签聚合）
- **`v_category_stats`** - 分类统计视图（工具数量和总浏览量）

**性能索引（14个）：**
- 分类显示排序索引（`idx_category_display_order`）
- 工具分类+浏览量复合索引（`idx_tool_category_viewcount`）
- 特色工具浏览量索引（`idx_tool_featured_viewcount`）
- 最新工具日期索引（`idx_tool_new_date`）
- 名称搜索索引（`idx_tool_name`）
- legacy_id 快速查找索引等

**自动化触发器（5个）：**
- 自动更新时间戳触发器
- 软删除同步触发器

### 完整建表脚本

所有数据库结构已整合到 [`scripts/create.sql`](scripts/create.sql) 文件中：

```bash
# 创建全新数据库
sqlite3 ai_tools.db < scripts/create.sql

# 检查数据库完整性
sqlite3 ai_tools.db "PRAGMA integrity_check"

# 查看所有表结构
sqlite3 ai_tools.db ".schema"
```

**建表脚本特性：**
- ✅ 外键约束自动启用
- ✅ WAL 模式提升并发性能
- ✅ 14个性能优化索引
- ✅ 2个实用视图
- ✅ 5个自动化触发器
- ✅ 软删除机制
- ✅ 数据完整性约束
- ✅ FTS5 全文搜索支持（可选）

### 数据库操作

```bash
# 检查数据库状态
npm run db:check

# 优化数据库
npm run db:optimize

# 直接查询数据库
sqlite3 ai_tools.db "SELECT COUNT(*) FROM tools WHERE is_deleted = 0"

# 查看活跃工具统计
sqlite3 ai_tools.db "SELECT COUNT(*) FROM v_active_tools"

# 查看分类统计
sqlite3 ai_tools.db "SELECT name, tool_count FROM v_category_stats"
```

### 数据库性能特性

- **WAL 模式** - 支持并发读取，提升性能
- **软删除机制** - 数据安全删除，可恢复
- **原子操作** - 浏览量更新无竞态条件
- **外键约束** - 数据完整性保证
- **部分索引** - 针对活跃数据优化
- **复合索引** - 多字段查询优化

## 🎨 主题系统

项目支持亮色/暗色主题切换：

- 使用 CSS 自定义属性 (`--bg-primary`, `--text-primary`)
- `ThemeContext` 管理主题状态
- Ant Design 组件通过 `ConfigProvider` 适配主题
- 主题状态持久化到 localStorage

## 🔍 搜索功能

集成了强大的搜索系统：

- **实时搜索** - 输入即搜索，无需回车
- **多字段搜索** - 支持名称、描述、标签搜索
- **高亮显示** - 搜索结果关键词高亮
- **搜索建议** - 智能搜索建议
- **分类筛选** - 按分类快速筛选

## 📊 浏览量系统

双重浏览量统计机制：

1. **客户端存储** - localStorage 实时更新
2. **服务器同步** - 手动同步到数据库

```javascript
// 更新浏览量
incrementViewCount(toolId) // 本地更新

// 同步到服务器
syncViewCountToServer()   // 批量同步
```

## 🛠️ 开发指南

### 添加新工具

1. 在工具卡片上右键
2. 选择"编辑工具"
3. 填写工具信息
4. 保存即可

### 添加新分类

通过数据库直接操作或等待后台管理功能。

### 自定义样式

全局样式变量定义在 `globals.css` 中：

```css
:root {
  --bg-primary: #ffffff;
  --text-primary: #000000;
  --accent-color: #1890ff;
}

[data-theme='dark'] {
  --bg-primary: #141414;
  --text-primary: #ffffff;
  --accent-color: #177ddc;
}
```

### API 开发

所有 API 路由位于 `app/api/` 目录：

- **GET** `/api/settings` - 获取站点配置
- **GET** `/api/tools` - 获取工具列表
- **PUT** `/api/tools/[toolId]` - 更新工具
- **DELETE** `/api/tools/[toolId]` - 删除工具
- **POST** `/api/tools/sync-viewcount` - 同步浏览量

## 📦 构建部署

### Standalone 模式

项目配置了 `output: 'standalone'`，生成独立的 Node.js 应用：

```bash
npm run build
# 生成 .next/standalone/server.js
npm start  # 运行独立服务器
```

### Docker 部署

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔧 配置说明

### Next.js 配置

- **Standalone 模式** - 优化生产环境部署
- **图片优化** - 支持 AVIF/WebP 格式
- **实验性功能** - 启用多项性能优化
- **安全头** - 配置了完善的安全 HTTP 头

### 环境变量

当前项目无需额外环境变量，所有配置都内置在代码中。

## 🚨 注意事项

### 数据库迁移

项目正在从 JSON 文件迁移到 SQLite：

- **当前状态** - 使用 JSON + localStorage
- **目标状态** - 完全基于 SQLite
- **迁移脚本** - 位于 `scripts/` 目录

### 性能优化

- **索引优化** - 数据库包含 14 个优化索引
- **WAL 模式** - 支持并发读取
- **软删除** - 数据安全删除机制
- **原子操作** - 浏览量更新无竞态条件

### 已知限制

1. **SQLite 单写入者** - 高并发写入可能受限
2. **浏览量同步** - 当前为手动同步
3. **React 类型** - 已降级到 18.x 避免版本冲突

## 📚 相关文档

- [数据库迁移方案](docs/database-migration-plan.md)
- [优化记录](docs/optimization-summary.md)
- [开发指南](CLAUDE.md)

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 ISC 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [Next.js](https://nextjs.org/) - React 框架
- [Ant Design](https://ant.design/) - UI 组件库
- [better-sqlite3](https://github.com/JoshuaWise/better-sqlite3) - SQLite 库
- [ahooks](https://ahooks.js.org/) - React Hooks 工具库

---

<p align="center">
  Made with ❤️ by AI集盒团队
</p>
