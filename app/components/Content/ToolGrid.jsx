import ToolCard from './ToolCard';
import AddToolCard from './AddToolCard';
import './ToolGrid.css';

const ToolGrid = ({ tools, categoryId }) => {
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
};

export default ToolGrid;
