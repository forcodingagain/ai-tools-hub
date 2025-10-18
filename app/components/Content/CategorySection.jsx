import { useSettingsContext } from '../../context/SettingsContext';
import ToolGrid from './ToolGrid';
import * as Icons from '@ant-design/icons';
import './CategorySection.css';

const CategorySection = ({ category }) => {
  const settings = useSettingsContext();

  // 筛选该分类下的工具，并按 viewCount 从大到小排序
  const categoryTools = settings.tools
    .filter(tool => tool.categoryId === category.id)
    .sort((a, b) => b.viewCount - a.viewCount);

  const IconComponent = Icons[category.icon] || Icons.AppstoreOutlined;

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
};

export default CategorySection;
