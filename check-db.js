const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'ai_tools.db');
const db = new Database(dbPath);

// 检查表是否存在
console.log('检查数据库表结构...');

// 检查 site_config 表
try {
  const siteConfigResult = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='site_config'").get();
  console.log('site_config 表:', siteConfigResult ? '存在' : '不存在');
} catch (e) {
  console.log('检查 site_config 表失败:', e.message);
}

// 检查 site_keywords 表
try {
  const siteKeywordsResult = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='site_keywords'").get();
  console.log('site_keywords 表:', siteKeywordsResult ? '存在' : '不存在');
} catch (e) {
  console.log('检查 site_keywords 表失败:', e.message);
}

// 检查是否有数据
try {
  const configData = db.prepare("SELECT * FROM site_config").get();
  console.log('site_config 数据:', configData || '无数据');
} catch (e) {
  console.log('检查 site_config 数据失败:', e.message);
}

try {
  const keywordsData = db.prepare("SELECT * FROM site_keywords LIMIT 5").all();
  console.log('site_keywords 数据:', keywordsData.length > 0 ? keywordsData : '无数据');
} catch (e) {
  console.log('检查 site_keywords 数据失败:', e.message);
}

db.close();
