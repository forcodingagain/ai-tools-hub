import { useState, useEffect, useCallback, useMemo } from 'react';

// 简单的内存缓存
let settingsCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 1000; // 60秒缓存（与API缓存协调）

export const useSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 优化的数据加载函数
  const loadSettings = useCallback(async (forceRefresh = false) => {
    const now = Date.now();

    // 检查缓存
    if (!forceRefresh && settingsCache && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('📦 使用缓存的数据');
      setSettings(settingsCache);
      setLoading(false);
      return;
    }

    try {
      console.log('🔄 从API获取数据');

      // 使用 AbortController 支持请求取消
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8秒超时

      const response = await fetch('/api/settings', {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'max-age=300', // 5分钟浏览器缓存
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // 更新缓存
      settingsCache = data;
      cacheTimestamp = now;

      setSettings(data);
      setError(null);
    } catch (err) {
      console.error('加载配置失败:', err);

      // 如果有缓存数据，即使在出错时也返回缓存
      if (settingsCache) {
        console.log('📦 降级使用缓存数据');
        setSettings(settingsCache);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initializeSettings = async () => {
      if (isMounted) {
        await loadSettings();
      }
    };

    initializeSettings();

    return () => {
      isMounted = false;
    };
  }, [loadSettings]);

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

  // 更新工具标签（本地状态更新）
  const updateToolTags = (toolId, newTags) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      tools: prevSettings.tools.map(tool =>
        tool.id === toolId
          ? { ...tool, tags: newTags }
          : tool
      )
    }));
  };

  // 添加新工具（本地状态更新）
  const addTool = (newTool) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      tools: [...prevSettings.tools, newTool]
    }));

    // 清除缓存，强制下次重新获取
    settingsCache = null;
  };

  // 更新分类顺序
  const updateCategoryOrder = async (categories) => {
    try {
      console.log('🔄 更新分类顺序:', categories);

      const response = await fetch('/api/categories/order', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ categories }),
      });

      console.log('📡 API 响应状态:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API 错误:', errorData);
        throw new Error(errorData.error || '更新分类顺序失败');
      }

      const result = await response.json();
      console.log('✅ 更新成功:', result);

      // 先清除服务器端缓存
      try {
        await fetch('/api/settings', { method: 'POST' });
      } catch (e) {
        console.warn('清除服务器缓存失败:', e);
      }

      // 清除客户端缓存并重新加载数据
      settingsCache = null;
      await loadSettings(true);

      return result;
    } catch (err) {
      console.error('❌ 更新分类顺序失败:', err);
      throw err;
    }
  };

  return { settings, loading, error, incrementViewCount, updateTool, deleteTool, updateToolTags, addTool, updateCategoryOrder };
};
