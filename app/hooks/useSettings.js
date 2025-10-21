import { useState, useEffect, useCallback } from 'react';

export const useSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 优化的数据加载函数
  const loadSettings = useCallback(async (forceRefresh = false) => {
    try {
      console.log('🔄 从API获取数据');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch('/api/settings', {
        signal: controller.signal,
        headers: {
          'Cache-Control': forceRefresh
            ? 'no-cache'
            : 'max-age=300, stale-while-revalidate=600'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // 防御性检查：确保 tools 数组存在且有效
      if (data && data.tools && !Array.isArray(data.tools)) {
        console.warn('⚠️ API 返回的 tools 不是数组，正在修复...');
        data.tools = [];
      } else if (data && data.tools) {
        // 过滤掉无效的工具数据
        data.tools = data.tools.filter(tool => {
          if (!tool || typeof tool !== 'object') {
            console.warn('⚠️ 过滤掉无效工具（非对象）:', tool);
            return false;
          }
          if (!tool.id || !tool.name) {
            console.warn('⚠️ 过滤掉缺少基本属性的工具:', tool);
            return false;
          }
          if (tool.categoryId === undefined || tool.categoryId === null) {
            console.warn('⚠️ 过滤掉无效 categoryId 的工具:', tool);
            return false;
          }
          return true;
        });
      }

      setSettings(data);
      setError(null);
    } catch (err) {
      console.error('加载配置失败:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // 清除缓存并重新加载的函数
  const clearCacheAndReload = useCallback(async () => {
    try {
      await fetch('/api/settings', { method: 'POST' });
    } catch (e) {
      console.warn('清除服务器缓存失败:', e);
    }

    setLoading(true);
    await loadSettings(true);
  }, [loadSettings]);

  // 增加工具浏览次数
  const incrementViewCount = useCallback(async (toolId) => {
    if (!settings || !settings.tools) return;

    const currentTool = settings.tools.find(t => t && t.id === toolId);
    const previousViewCount = currentTool?.viewCount || 0;

    // 乐观更新 - 确保不会产生 undefined
    setSettings(prevSettings => ({
      ...prevSettings,
      tools: (prevSettings.tools || []).map(tool =>
        (tool && tool.id === toolId)
          ? { ...tool, viewCount: (tool.viewCount || 0) + 1 }
          : tool
      ).filter(Boolean) // 过滤掉可能的 undefined
    }));

    try {
      const response = await fetch(`/api/tools/${toolId}/view`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('更新浏览量失败');
      }

      const result = await response.json();

      // 用服务器返回的真实值更新
      setSettings(prevSettings => ({
        ...prevSettings,
        tools: (prevSettings.tools || []).map(tool =>
          (tool && tool.id === toolId)
            ? { ...tool, viewCount: result.viewCount }
            : tool
        ).filter(Boolean)
      }));
    } catch (err) {
      console.error('❌ 更新浏览次数失败:', err);

      // 回滚到之前的值
      setSettings(prevSettings => ({
        ...prevSettings,
        tools: (prevSettings.tools || []).map(tool =>
          (tool && tool.id === toolId)
            ? { ...tool, viewCount: previousViewCount }
            : tool
        ).filter(Boolean)
      }));
    }
  }, [settings]);

  // 更新工具信息
  const updateTool = useCallback(async (toolId, updatedData) => {
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

      await response.json();
      await clearCacheAndReload();

      return true;
    } catch (err) {
      console.error('更新工具失败:', err);
      throw err;
    }
  }, [clearCacheAndReload]);

  // 删除工具
  const deleteTool = useCallback(async (toolId) => {
    try {
      const response = await fetch(`/api/tools/${toolId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('删除工具失败');
      }

      await response.json();
      await clearCacheAndReload();

      return true;
    } catch (err) {
      console.error('删除工具失败:', err);
      throw err;
    }
  }, [clearCacheAndReload]);

  // 更新工具标签（本地状态更新）
  const updateToolTags = useCallback((toolId, newTags) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      tools: (prevSettings.tools || []).map(tool =>
        (tool && tool.id === toolId)
          ? { ...tool, tags: newTags }
          : tool
      ).filter(Boolean)
    }));
  }, []);

  // 添加新工具
  const addTool = useCallback(async (newTool) => {
    // 确保新工具数据有效
    if (!newTool || !newTool.id || !newTool.name || newTool.categoryId === undefined) {
      console.error('⚠️ 尝试添加无效的工具:', newTool);
      throw new Error('无效的工具数据');
    }

    // 先乐观更新本地状态
    setSettings(prevSettings => ({
      ...prevSettings,
      tools: [...(prevSettings.tools || []), newTool].filter(Boolean)
    }));

    try {
      await clearCacheAndReload();
    } catch (err) {
      console.error('添加工具失败:', err);
      // 回滚乐观更新
      setSettings(prevSettings => ({
        ...prevSettings,
        tools: (prevSettings.tools || []).filter(tool =>
          tool && tool.id !== newTool.id
        )
      }));
      throw err;
    }
  }, [clearCacheAndReload]);

  // 更新分类顺序
  const updateCategoryOrder = useCallback(async (categories) => {
    try {
      console.log('🔄 更新分类顺序:', categories);

      const response = await fetch('/api/categories/order', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ categories }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '更新分类顺序失败');
      }

      await response.json();
      await clearCacheAndReload();

      return true;
    } catch (err) {
      console.error('❌ 更新分类顺序失败:', err);
      throw err;
    }
  }, [clearCacheAndReload]);

  return {
    settings,
    loading,
    error,
    incrementViewCount,
    updateTool,
    deleteTool,
    updateToolTags,
    addTool,
    updateCategoryOrder,
    loadSettings
  };
};
