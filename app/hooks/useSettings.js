import { useState, useEffect, useCallback } from 'react';

export const useSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 优化的数据加载函数 - 移除客户端缓存，使用 SWR 策略
  const loadSettings = useCallback(async (forceRefresh = false) => {
    try {
      console.log('🔄 从API获取数据');

      // 使用 AbortController 支持请求取消
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8秒超时

      const response = await fetch('/api/settings', {
        signal: controller.signal,
        headers: {
          // ✅ 使用 SWR (Stale-While-Revalidate) 策略
          // 30秒内使用缓存，同时后台验证更新
          'Cache-Control': forceRefresh
            ? 'no-cache'
            : 'max-age=30, stale-while-revalidate=60'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      setSettings(data);
      setError(null);
    } catch (err) {
      console.error('加载配置失败:', err);

      // 如果加载失败且没有现有数据，显示错误
      if (!settings) {
        setError(err.message);
      } else {
        // 有现有数据时，继续使用旧数据，只在控制台警告
        console.warn('使用现有数据，后台更新失败');
      }
    } finally {
      setLoading(false);
    }
  }, [settings]);

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

  // ✅ 统一的缓存清除和数据刷新函数
  const clearCacheAndReload = useCallback(async () => {
    try {
      // 清除服务器端缓存
      await fetch('/api/settings', { method: 'POST' });
    } catch (e) {
      console.warn('清除服务器缓存失败:', e);
    }

    // 强制重新加载数据
    await loadSettings(true);
  }, [loadSettings]);

  // ✅ 增加工具的浏览次数（乐观更新）
  const incrementViewCount = useCallback(async (toolId) => {
    // 1. 保存当前浏览量用于回滚
    const currentTool = settings?.tools.find(t => t.id === toolId);
    const previousViewCount = currentTool?.viewCount || 0;

    // 2. 立即更新 UI（乐观更新）
    setSettings(prevSettings => ({
      ...prevSettings,
      tools: prevSettings.tools.map(tool =>
        tool.id === toolId
          ? { ...tool, viewCount: (tool.viewCount || 0) + 1 }
          : tool
      )
    }));

    // 3. 后台异步提交到服务器
    try {
      const response = await fetch(`/api/tools/${toolId}/view`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('更新浏览量失败');
      }

      const result = await response.json();

      // 4. 用服务器返回的真实值更新（处理并发情况）
      setSettings(prevSettings => ({
        ...prevSettings,
        tools: prevSettings.tools.map(tool =>
          tool.id === toolId
            ? { ...tool, viewCount: result.viewCount }
            : tool
        )
      }));
    } catch (err) {
      console.error('❌ 更新浏览次数失败:', err);

      // 5. 失败时回滚到之前的值
      setSettings(prevSettings => ({
        ...prevSettings,
        tools: prevSettings.tools.map(tool =>
          tool.id === toolId
            ? { ...tool, viewCount: previousViewCount }
            : tool
        )
      }));

      // 可选：显示错误提示（如果有 message 实例）
      // message.error('更新浏览量失败，请稍后重试');
    }
  }, [settings]);

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

      // ✅ 清除缓存并重新加载（确保数据一致性）
      await clearCacheAndReload();

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

      // ✅ 清除缓存并重新加载（确保数据一致性）
      await clearCacheAndReload();

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

  // 添加新工具
  const addTool = async (newTool) => {
    // 先乐观更新本地状态
    setSettings(prevSettings => ({
      ...prevSettings,
      tools: [...prevSettings.tools, newTool]
    }));

    // ✅ 清除缓存并重新加载（确保数据一致性）
    await clearCacheAndReload();
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

      // ✅ 使用统一的缓存清除函数
      await clearCacheAndReload();

      return result;
    } catch (err) {
      console.error('❌ 更新分类顺序失败:', err);
      throw err;
    }
  };

  return { settings, loading, error, incrementViewCount, updateTool, deleteTool, updateToolTags, addTool, updateCategoryOrder };
};
