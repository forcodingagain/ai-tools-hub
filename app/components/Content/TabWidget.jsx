import { Card } from 'antd';
import { FireOutlined } from '@ant-design/icons';
import { useSettingsContext } from '../../context/SettingsContext';
import ToolCard from './ToolCard';
import './TabWidget.css';

const TabWidget = () => {
  const settings = useSettingsContext();

  // 筛选常用工具：按 viewCount 排序，取前20个
  const featuredTools = [...settings.tools]
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, 20);

  return (
    <Card className="tab-widget-card">
      <div className="tab-widget-header">
        <FireOutlined style={{ marginRight: '8px', color: '#ff4d4f' }} />
        <span className="tab-widget-title">常用工具</span>
      </div>
      <div className="tab-tools-grid">
        {featuredTools.map(tool => (
          <div key={tool.id} className="tab-tool-item">
            <ToolCard tool={tool} />
          </div>
        ))}
      </div>
    </Card>
  );
};

export default TabWidget;
