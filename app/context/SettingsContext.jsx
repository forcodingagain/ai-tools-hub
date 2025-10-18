import { createContext, useContext } from 'react';
import { useSettings } from '../hooks/useSettings';
import { Spin } from 'antd';

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const { settings, loading, error, incrementViewCount, updateTool, deleteTool, updateToolTags, addTool } = useSettings();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <Spin size="large" />
      </div>
    );
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
    <SettingsContext.Provider value={{ ...settings, incrementViewCount, updateTool, deleteTool, updateToolTags, addTool }}>
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
