import ToolCard from './ToolCard';
import './ToolGrid.css';

const ToolGrid = ({ tools }) => {
  if (!tools || tools.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
        暂无工具
      </div>
    );
  }

  return (
    <div className="tool-grid">
      {tools.map(tool => (
        <div key={tool.id} className="tool-grid-item">
          <ToolCard tool={tool} />
        </div>
      ))}
    </div>
  );
};

export default ToolGrid;
