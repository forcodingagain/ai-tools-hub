'use client'

import { useMemo, memo } from 'react';
import ToolCard from './ToolCard';
import AddToolCard from './AddToolCard';
import './VirtualGrid.css';

// 简化版本：直接渲染所有工具，不使用虚拟滚动
const VirtualGrid = memo(({
  tools,
  categoryId
}) => {
  // 简化的布局计算
  const gridConfig = useMemo(() => {
    // 固定为4列布局
    const itemsPerRow = 4;
    const totalRows = Math.ceil((tools?.length || 0) / itemsPerRow);

    return {
      itemsPerRow,
      totalRows,
      itemHeight: 90
    };
  }, [tools?.length]);

  // 生成所有项目（简化版本）
  const allItems = useMemo(() => {
    if (!tools || tools.length === 0) return [];

    const items = [];

    // 如果有categoryId，添加"添加工具"卡片到开头
    if (categoryId) {
      items.push(
        <div key="add-tool" className="virtual-grid-item">
          <AddToolCard categoryId={categoryId} />
        </div>
      );
    }

    // 添加所有工具卡片
    tools.forEach((tool, index) => {
      items.push(
        <div key={tool.id} className="virtual-grid-item">
          <ToolCard tool={tool} index={index} />
        </div>
      );
    });

    return items;
  }, [tools, categoryId]);

  return (
    <div className="virtual-grid-container">
      <div className="virtual-grid-rows">
        {allItems}
      </div>
    </div>
  );
});

VirtualGrid.displayName = 'VirtualGrid';

export default VirtualGrid;

