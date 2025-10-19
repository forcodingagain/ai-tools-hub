'use client'

import { useState, memo, useCallback } from 'react';
import { App } from 'antd';
import * as Icons from '@ant-design/icons';
import { useSettingsContext } from '../../context/SettingsContext';
import './CategoryMenu.css';

const CategoryMenu = memo(({ onMenuClick, collapsed, currentCategory }) => {
  const settings = useSettingsContext();
  const { updateCategoryOrder } = useSettingsContext();
  const { message } = App.useApp();
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const scrollToSection = useCallback((categoryId) => {
    const element = document.getElementById(`category-${categoryId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    // 移动端点击后关闭抽屉
    if (onMenuClick) {
      onMenuClick();
    }
  }, [onMenuClick]);

  // 拖拽开始
  const handleDragStart = useCallback((e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget);
  }, []);

  // 拖拽结束
  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  // 拖拽经过
  const handleDragOver = useCallback((e, index) => {
    e.preventDefault();
    if (draggedIndex === index) return;
    setDragOverIndex(index);
  }, [draggedIndex]);

  // 放置
  const handleDrop = useCallback(async (e, dropIndex) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDragOverIndex(null);
      return;
    }

    try {
      // 创建新的分类数组
      const newCategories = [...settings.categories];
      const draggedCategory = newCategories[draggedIndex];

      console.log('🎯 拖拽前顺序:', newCategories.map((c, i) => `${i + 1}. ${c.name}`));
      console.log(`📌 从位置 ${draggedIndex + 1} 拖到位置 ${dropIndex + 1}`);

      // 移除拖拽的项
      newCategories.splice(draggedIndex, 1);
      // 插入到新位置
      newCategories.splice(dropIndex, 0, draggedCategory);

      console.log('🎯 拖拽后顺序:', newCategories.map((c, i) => `${i + 1}. ${c.name}`));

      // 更新 display_order
      const updatedCategories = newCategories.map((cat, idx) => ({
        id: cat.id,
        displayOrder: idx + 1
      }));

      console.log('📡 将发送给API的数据:', updatedCategories);

      // 调用 API 更新顺序
      await updateCategoryOrder(updatedCategories);
      message.success('分类顺序已更新');
    } catch (error) {
      console.error('更新分类顺序失败:', error);
      message.error('更新分类顺序失败');
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex, settings.categories, updateCategoryOrder, message]);

  return (
    <div className="category-menu">
      {settings.categories.map((category, index) => {
        const iconKey = category.headerIcon || category.icon;
        const IconComponent = Icons[iconKey] || Icons.AppstoreOutlined;
        const isActive = currentCategory === category.name;
        const isDragging = draggedIndex === index;
        const isDragOver = dragOverIndex === index && draggedIndex !== index;

        return (
          <div
            key={category.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onClick={() => scrollToSection(category.id)}
            className={`category-menu-item ${isActive ? 'active' : ''} ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''} ${collapsed ? 'collapsed' : ''}`}
          >
            <IconComponent className="category-icon" />
            {!collapsed && <span className="category-name">{category.name}</span>}
          </div>
        );
      })}
    </div>
  );
});

export default CategoryMenu;

