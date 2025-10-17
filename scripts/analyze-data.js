const fs = require('fs');
const path = require('path');

console.log('📊 开始分析 settings.json 数据...\n');

const jsonPath = path.join(__dirname, '../public/data/settings.json');

// 检查文件是否存在
if (!fs.existsSync(jsonPath)) {
    console.error('❌ 错误：找不到 settings.json 文件');
    console.error('   路径：', jsonPath);
    process.exit(1);
}

try {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

    console.log('✅ 文件加载成功\n');
    console.log('=' .repeat(60));
    console.log('数据统计：');
    console.log('=' .repeat(60));
    console.log('- 分类数量：', data.categories.length);
    console.log('- 工具数量：', data.tools.length);
    console.log('- 关键词数量：', data.siteConfig.keywords.length);

    // 统计唯一标签
    const tags = new Set();
    data.tools.forEach(tool => {
        if (tool.tags && Array.isArray(tool.tags)) {
            tool.tags.forEach(tag => tags.add(tag));
        }
    });
    console.log('- 唯一标签数量：', tags.size);
    console.log('- 标签列表：', Array.from(tags).join(', '));

    // 统计工具特征
    const featuredCount = data.tools.filter(t => t.isFeatured).length;
    const newCount = data.tools.filter(t => t.isNew).length;
    console.log('\n工具特征统计：');
    console.log('- 常用工具：', featuredCount);
    console.log('- 最新工具：', newCount);

    // 统计每个分类的工具数量
    console.log('\n分类工具分布：');
    const categoryMap = new Map();
    data.categories.forEach(cat => {
        categoryMap.set(cat.id, { name: cat.name, count: 0 });
    });
    data.tools.forEach(tool => {
        if (categoryMap.has(tool.categoryId)) {
            categoryMap.get(tool.categoryId).count++;
        }
    });
    categoryMap.forEach((info, id) => {
        console.log(`  - ${info.name}: ${info.count} 个工具`);
    });

    // 检查数据完整性
    console.log('\n' + '='.repeat(60));
    console.log('数据完整性检查：');
    console.log('='.repeat(60));

    const categoryIds = new Set(data.categories.map(c => c.id));
    const orphanTools = data.tools.filter(t => !categoryIds.has(t.categoryId));

    if (orphanTools.length > 0) {
        console.error('❌ 发现孤儿工具（引用不存在的分类）：', orphanTools.length);
        orphanTools.forEach(tool => {
            console.error(`   - ${tool.id} (${tool.name}) -> 分类ID: ${tool.categoryId}`);
        });
        console.error('\n⚠️  警告：迁移前必须修复这些问题！');
        process.exit(1);
    } else {
        console.log('✅ 所有工具的分类ID都有效');
    }

    // 检查重复ID
    const toolIds = data.tools.map(t => t.id);
    const duplicateToolIds = toolIds.filter((id, index) => toolIds.indexOf(id) !== index);
    if (duplicateToolIds.length > 0) {
        console.error('❌ 发现重复的工具ID：', duplicateToolIds);
        process.exit(1);
    } else {
        console.log('✅ 工具ID无重复');
    }

    const catIds = data.categories.map(c => c.id);
    const duplicateCatIds = catIds.filter((id, index) => catIds.indexOf(id) !== index);
    if (duplicateCatIds.length > 0) {
        console.error('❌ 发现重复的分类ID：', duplicateCatIds);
        process.exit(1);
    } else {
        console.log('✅ 分类ID无重复');
    }

    // 检查必填字段
    console.log('\n字段完整性检查：');
    let hasError = false;

    data.tools.forEach((tool, index) => {
        if (!tool.id) {
            console.error(`❌ 工具 #${index} 缺少 id 字段`);
            hasError = true;
        }
        if (!tool.name) {
            console.error(`❌ 工具 ${tool.id} 缺少 name 字段`);
            hasError = true;
        }
        if (!tool.categoryId) {
            console.error(`❌ 工具 ${tool.id} 缺少 categoryId 字段`);
            hasError = true;
        }
    });

    data.categories.forEach((cat, index) => {
        if (!cat.id) {
            console.error(`❌ 分类 #${index} 缺少 id 字段`);
            hasError = true;
        }
        if (!cat.name) {
            console.error(`❌ 分类 ${cat.id} 缺少 name 字段`);
            hasError = true;
        }
        if (!cat.icon) {
            console.error(`❌ 分类 ${cat.id} 缺少 icon 字段`);
            hasError = true;
        }
    });

    if (hasError) {
        console.error('\n⚠️  发现字段缺失问题！');
        process.exit(1);
    } else {
        console.log('✅ 所有必填字段完整');
    }

    // 估算迁移后的数据库大小
    console.log('\n' + '='.repeat(60));
    console.log('预估迁移结果：');
    console.log('='.repeat(60));
    const totalRecords = data.categories.length + data.tools.length + tags.size + data.siteConfig.keywords.length;
    console.log(`总记录数：约 ${totalRecords} 条`);
    console.log(`预估数据库大小：约 ${Math.ceil(totalRecords * 1.5 / 1024)} MB`);

    console.log('\n✅ 数据分析完成！所有检查通过，可以开始迁移。\n');

} catch (error) {
    console.error('❌ 错误：', error.message);
    console.error(error.stack);
    process.exit(1);
}
