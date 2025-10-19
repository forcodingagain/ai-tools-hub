import { createContext, useContext, useMemo } from 'react';
import { useSettings } from '../hooks/useSettings';

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const { settings, loading, error, incrementViewCount, updateTool, deleteTool, updateToolTags, addTool, updateCategoryOrder } = useSettings();

  // ✅ 使用 useMemo 稳定化 context value，避免不必要的重渲染
  const value = useMemo(() => {
    if (!settings) return null;

    return {
      ...settings,
      incrementViewCount,
      updateTool,
      deleteTool,
      updateToolTags,
      addTool,
      updateCategoryOrder
    };
  }, [settings, incrementViewCount, updateTool, deleteTool, updateToolTags, addTool, updateCategoryOrder]);

  // 数据加载中，不显示任何内容（依赖 layout.tsx 的全局加载动画）
  if (loading) {
    return null;
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column'
      }}>
        <h2>加载失败</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettingsContext = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettingsContext must be used within SettingsProvider');
  }
  return context;
};
