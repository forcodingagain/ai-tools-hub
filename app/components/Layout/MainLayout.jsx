import { Layout, Button } from 'antd';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { MenuOutlined } from '@ant-design/icons';
import { useSettingsContext } from '../../context/SettingsContext';
import { useSearch } from '../../hooks/useSearch';
import { useScrollSpy } from '../../hooks/useScrollSpy';
import './MainLayout.css';

// 直接导入首屏关键组件（避免白屏）
import Sidebar from './Sidebar';
import Header from '../Header/Header';
import SearchBar from '../Header/SearchBar';
import TabWidget from '../Content/TabWidget';
import CategorySection from '../Content/CategorySection';
import ToolGrid from '../Content/ToolGrid';

// 仅对非关键组件使用懒加载
const FloatToolbar = dynamic(() => import('./FloatToolbar'), { ssr: false });

const { Content } = Layout;

const MainLayout = () => {
  const settings = useSettingsContext();
  const { handleSearch, keyword, filteredTools } = useSearch(settings.tools);

  // 监听当前浏览的分类
  const currentCategory = useScrollSpy(settings.categories);

  // 侧边栏状态管理
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // 滚动懒加载：首屏只显示第一个分类（常用工具）
  const [visibleCategoryCount, setVisibleCategoryCount] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // 滚动到指定分类
  const scrollToCategory = (categoryId) => {
    // 找到目标分类的索引
    const targetIndex = settings.categories.findIndex(cat => cat.id === categoryId);

    if (targetIndex === -1) return;

    // 如果目标分类还没有被加载，先加载到目标分类
    if (targetIndex >= visibleCategoryCount) {
      setVisibleCategoryCount(targetIndex + 1);
      // 等待 DOM 更新后再滚动
      setTimeout(() => {
        const element = document.getElementById(`category-${categoryId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 200);
    } else {
      // 目标分类已加载，直接滚动
      const element = document.getElementById(`category-${categoryId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 隐藏全局加载动画（当内容渲染完成后）
  useEffect(() => {
    const loading = document.getElementById('global-loading');
    if (loading) {
      // 添加隐藏类触发淡出动画
      loading.classList.add('hidden');
      // 300ms 后完全移除元素
      setTimeout(() => {
        loading.remove();
      }, 300);
    }
  }, []);

  // 如果有搜索关键词，显示搜索结果
  const isSearching = keyword && keyword.trim().length > 0;

  // Intersection Observer：监听滚动加载更多分类
  useEffect(() => {
    // 如果是搜索模式或已加载所有分类，不需要监听
    if (isSearching || visibleCategoryCount >= settings.categories.length) {
      return;
    }

    // 创建一个哨兵元素用于检测滚动到底部
    const sentinel = document.getElementById('load-more-sentinel');
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        // 当哨兵元素进入视口且没有正在加载时，加载下一个分类
        if (entry.isIntersecting && !isLoadingMore && visibleCategoryCount < settings.categories.length) {
          setIsLoadingMore(true);
          // 模拟加载延迟，避免加载过快
          setTimeout(() => {
            setVisibleCategoryCount(prev => Math.min(prev + 1, settings.categories.length));
            setIsLoadingMore(false);
          }, 100);
        }
      },
      {
        root: null,
        rootMargin: '400px', // 提前 400px 开始加载（预加载）
        threshold: 0.1
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [isSearching, visibleCategoryCount, settings.categories.length, isLoadingMore]);

  // 计算主内容区的transform，避免频繁的DOM操作和布局变化带来的性能问题

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar
        collapsed={collapsed}
        onCollapse={setCollapsed}
        drawerOpen={drawerOpen}
        onDrawerClose={() => setDrawerOpen(false)}
        currentCategory={currentCategory}
      />
      <Layout style={{ marginLeft: isMobile ? 0 : (collapsed ? 80 : 220) }}>
        <Header
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          currentCategory={currentCategory}
          isMobile={isMobile}
          categories={settings.categories}
          onCategoryClick={scrollToCategory}
        />
        <Content style={{ padding: '0', overflow: 'hidden' }}>
          <div className="main-content">
            {isMobile && (
              <Button
                icon={<MenuOutlined />}
                onClick={() => setDrawerOpen(true)}
                className="mobile-menu-button"
                style={{
                  position: 'fixed',
                  top: 16,
                  left: 16,
                  zIndex: 999,
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(24, 144, 255, 0.1)',
                  border: '1px solid rgba(24, 144, 255, 0.3)',
                  borderRadius: '8px',
                  color: '#1890ff',
                }}
              />
            )}
            <h1 style={{ textAlign: 'center', marginBottom: '32px' }}>
              {settings.siteConfig.siteName}
            </h1>

            <SearchBar onSearch={handleSearch} />

            {!isSearching && <TabWidget />}

            {isSearching ? (
              <div className="search-results">
                <h2 style={{ marginBottom: 24 }}>搜索结果 ({filteredTools.length})</h2>
                <ToolGrid tools={filteredTools} />
              </div>
            ) : (
              <>
                {/* 只渲染可见的分类 */}
                {settings.categories.slice(0, visibleCategoryCount).map(category => (
                  <CategorySection key={category.id} category={category} />
                ))}

                {/* 哨兵元素：用于触发加载更多 */}
                {visibleCategoryCount < settings.categories.length && (
                  <div
                    id="load-more-sentinel"
                    style={{
                      height: '1px',
                      margin: '20px 0',
                      visibility: 'hidden'
                    }}
                  />
                )}

                {/* 加载提示 */}
                {isLoadingMore && visibleCategoryCount < settings.categories.length && (
                  <div style={{
                    textAlign: 'center',
                    padding: '30px',
                    color: '#999',
                    fontSize: '14px'
                  }}>
                    <div style={{
                      display: 'inline-block',
                      width: '20px',
                      height: '20px',
                      border: '2px solid #f3f3f3',
                      borderTop: '2px solid #1890ff',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      marginRight: '10px',
                      verticalAlign: 'middle'
                    }} />
                    正在加载更多分类...
                  </div>
                )}
              </>
            )}
          </div>
        </Content>
      </Layout>
      <FloatToolbar />
    </Layout>
  );
};

export default MainLayout;
