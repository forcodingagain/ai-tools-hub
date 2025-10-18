import { Layout, Button, Spin } from 'antd';
import { useState, useEffect, lazy, Suspense } from 'react';
import { MenuOutlined } from '@ant-design/icons';
import { useSettingsContext } from '../../context/SettingsContext';
import { useSearch } from '../../hooks/useSearch';
import { useScrollSpy } from '../../hooks/useScrollSpy';
import './MainLayout.css';

// 简单的加载组件
const LoadingFallback = () => (
  <div style={{ padding: '50px', textAlign: 'center' }}>
    <Spin size="large" />
  </div>
);

// 懒加载重型组件
const Sidebar = lazy(() => import('./Sidebar'));
const Header = lazy(() => import('../Header/Header'));
const FloatToolbar = lazy(() => import('./FloatToolbar'));
const SearchBar = lazy(() => import('../Header/SearchBar'));
const TabWidget = lazy(() => import('../Content/TabWidget'));
const CategorySection = lazy(() => import('../Content/CategorySection'));
const ToolGrid = lazy(() => import('../Content/ToolGrid'));

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

  // 滚动到指定分类
  const scrollToCategory = (categoryId) => {
    const element = document.getElementById(`category-${categoryId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  // 如果有搜索关键词，显示搜索结果
  const isSearching = keyword && keyword.trim().length > 0;

  // 计算主内容区的marginLeft
  const contentMarginLeft = isMobile ? 0 : (collapsed ? 80 : 220);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Suspense fallback={<div style={{ width: isMobile ? '100%' : (collapsed ? 80 : 220), height: '100vh', background: '#f5f5f5' }} />}>
        <Sidebar
          collapsed={collapsed}
          onCollapse={setCollapsed}
          drawerOpen={drawerOpen}
          onDrawerClose={() => setDrawerOpen(false)}
          currentCategory={currentCategory}
        />
      </Suspense>
      <Layout style={{ marginLeft: contentMarginLeft, transition: 'margin-left 0.3s' }}>
        <Suspense fallback={<div style={{ height: 64, background: '#fff', borderBottom: '1px solid #f0f0f0' }} />}>
          <Header
            collapsed={collapsed}
            onToggle={() => setCollapsed(!collapsed)}
            currentCategory={currentCategory}
            isMobile={isMobile}
            categories={settings.categories}
            onCategoryClick={scrollToCategory}
          />
        </Suspense>
        <Content style={{ padding: '24px', overflow: 'auto' }}>
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

            <Suspense fallback={<LoadingFallback />}>
              <SearchBar onSearch={handleSearch} />
            </Suspense>

            {!isSearching && (
              <Suspense fallback={<LoadingFallback />}>
                <TabWidget />
              </Suspense>
            )}

            {isSearching ? (
              <div className="search-results">
                <h2 style={{ marginBottom: 24 }}>搜索结果 ({filteredTools.length})</h2>
                <Suspense fallback={<LoadingFallback />}>
                  <ToolGrid tools={filteredTools} />
                </Suspense>
              </div>
            ) : (
              settings.categories.map(category => (
                <Suspense key={category.id} fallback={<LoadingFallback />}>
                  <CategorySection category={category} />
                </Suspense>
              ))
            )}
          </div>
        </Content>
      </Layout>
      <Suspense fallback={null}>
        <FloatToolbar />
      </Suspense>
    </Layout>
  );
};

export default MainLayout;
