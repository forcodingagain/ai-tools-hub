import { useState, useEffect } from 'react';

export const useSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        // 从数据库 API 获取设置
        const response = await fetch('/api/settings');
        if (!response.ok) {
          throw new Error('加载配置失败');
        }
        const data = await response.json();

        setSettings(data);
        setLoading(false);
      } catch (err) {
        console.error('加载配置失败:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // 增加工具的浏览次数（调用数据库 API）
  const incrementViewCount = async (toolId) => {
    try {
      // 调用 API 增加浏览量
      const response = await fetch(`/api/tools/${toolId}/view`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('更新浏览量失败');
      }

      const result = await response.json();

      // 更新本地状态
      setSettings(prevSettings => ({
        ...prevSettings,
        tools: prevSettings.tools.map(tool =>
          tool.id === toolId
            ? { ...tool, viewCount: result.viewCount }
            : tool
        )
      }));
    } catch (err) {
      console.error('更新浏览次数失败:', err);
    }
  };

  // 更新工具信息
  const updateTool = async (toolId, updatedData) => {
    try {
      const response = await fetch(`/api/tools/${toolId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        throw new Error('更新工具失败');
      }

      const result = await response.json();

      // 更新本地状态
      setSettings(prevSettings => ({
        ...prevSettings,
        tools: prevSettings.tools.map(tool =>
          tool.id === toolId
            ? { ...tool, ...updatedData }
            : tool
        )
      }));

      return result;
    } catch (err) {
      console.error('更新工具失败:', err);
      throw err;
    }
  };

  // 删除工具
  const deleteTool = async (toolId) => {
    try {
      const response = await fetch(`/api/tools/${toolId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('删除工具失败');
      }

      const result = await response.json();

      // 更新本地状态，移除该工具
      setSettings(prevSettings => ({
        ...prevSettings,
        tools: prevSettings.tools.filter(tool => tool.id !== toolId)
      }));

      return result;
    } catch (err) {
      console.error('删除工具失败:', err);
      throw err;
    }
  };

  return { settings, loading, error, incrementViewCount, updateTool, deleteTool };
};
