import { useMemo, memo } from 'react';
import { useSettingsContext } from '../../context/SettingsContext';
import VirtualGrid from './VirtualGrid';
import * as Icons from '@ant-design/icons';
import './CategorySection.css';

/**
 * CategorySection 自定义比较函数
 * 只在 category 的关键属性变化时重渲染
 */
const arePropsEqual = (prevProps, nextProps) => {
  const prev = prevProps.category;
  const next = nextProps.category;

  return (
    prev.id === next.id &&
    prev.name === next.name &&
    prev.icon === next.icon
  );
};

const CategorySection = memo(({ category }) => {
  const settings = useSettingsContext();

  // 使用 useMemo 缓存过滤和排序结果，避免每次渲染都重新计算
  const categoryTools = useMemo(
    () => {
      if (!settings?.tools || !Array.isArray(settings.tools)) {
        console.warn('⚠️ settings.tools 不存在或不是数组:', settings);
        return [];
      }

      // 首先过滤掉所有的 undefined 和 null
      const validTools = settings.tools.filter(tool => tool && typeof tool === 'object');

      return validTools
        .filter(tool => {
          // 检查工具的基本属性
          if (!tool.id || !tool.name) {
            console.warn('⚠️ 发现缺少基本属性的工具:', tool);
            return false;
          }

          // 检查 categoryId
          if (tool.categoryId === undefined || tool.categoryId === null) {
            console.warn('⚠️ 发现无效 categoryId 的工具:', tool);
            return false;
          }

          return tool.categoryId === category.id;
        })
        .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
    },
    [settings.tools, category.id]
  );

  // 使用 useMemo 缓存图标组件（与侧边栏保持一致）
  const IconComponent = useMemo(
    () => {
      const iconKey = category.headerIcon || category.icon;
      return Icons[iconKey] || Icons.FolderOutlined;
    },
    [category.headerIcon, category.icon]
  );

  return (
    <section id={`category-${category.id}`} className="category-section">
      <div className="category-header">
        <div className="category-icon">
          <IconComponent style={{ fontSize: '28px' }} />
        </div>
        <h2 className="category-title">{category.name}</h2>
        <span className="category-count">({categoryTools.length})</span>
      </div>
      <VirtualGrid
        tools={categoryTools}
        categoryId={category.id}
      />
    </section>
  );
}, arePropsEqual); // ✅ 使用自定义比较函数

// 添加 displayName 便于调试
CategorySection.displayName = 'CategorySection';

export default CategorySection;
