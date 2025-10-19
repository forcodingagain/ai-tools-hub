import { useMemo, memo } from 'react';
import { useSettingsContext } from '../../context/SettingsContext';
import ToolGrid from './ToolGrid';
import { getIcon } from '../../utils/iconMap';
import './CategorySection.css';

const CategorySection = memo(({ category }) => {
  const settings = useSettingsContext();

  // 使用 useMemo 缓存过滤和排序结果，避免每次渲染都重新计算
  const categoryTools = useMemo(
    () =>
      settings.tools
        .filter(tool => tool.categoryId === category.id)
        .sort((a, b) => b.viewCount - a.viewCount),
    [settings.tools, category.id]
  );

  // 使用 useMemo 缓存图标组件（只导入需要的图标）
  const IconComponent = useMemo(
    () => getIcon(category.icon),
    [category.icon]
  );

  return (
    <section id={`category-${category.id}`} className="category-section">
      <div className="category-header">
        <IconComponent className="category-icon" />
        <h2 className="category-title">{category.name}</h2>
        <span className="category-count">({categoryTools.length})</span>
      </div>
      <ToolGrid tools={categoryTools} categoryId={category.id} />
    </section>
  );
});

// 添加 displayName 便于调试
CategorySection.displayName = 'CategorySection';

export default CategorySection;
