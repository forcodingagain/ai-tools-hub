import { memo } from 'react';
import ToolCard from './ToolCard';
import AddToolCard from './AddToolCard';
import './ToolGrid.css';

/**
 * ToolGrid 自定义比较函数
 * 只在 tools 数组或 categoryId 变化时重渲染
 */
const arePropsEqual = (prevProps, nextProps) => {
  // categoryId 比较
  if (prevProps.categoryId !== nextProps.categoryId) {
    return false;
  }

  // tools 数组长度比较
  if (prevProps.tools?.length !== nextProps.tools?.length) {
    return false;
  }

  // tools 数组引用比较（如果引用相同，说明数据未变）
  if (prevProps.tools === nextProps.tools) {
    return true;
  }

  // 如果引用不同，比较 ID 列表
  const prevIds = prevProps.tools?.map(t => t.id).join(',') || '';
  const nextIds = nextProps.tools?.map(t => t.id).join(',') || '';

  return prevIds === nextIds;
};

const ToolGrid = memo(({ tools, categoryId }) => {
  return (
    <div className="tool-grid">
      {/* 添加工具卡片 - 只在有 categoryId 时显示 */}
      {categoryId && (
        <div className="tool-grid-item">
          <AddToolCard categoryId={categoryId} />
        </div>
      )}

      {/* 工具列表 */}
      {tools && tools.length > 0 ? (
        tools.map(tool => (
          <div key={tool.id} className="tool-grid-item">
            <ToolCard tool={tool} />
          </div>
        ))
      ) : null}
    </div>
  );
}, arePropsEqual);

ToolGrid.displayName = 'ToolGrid';

export default ToolGrid;
