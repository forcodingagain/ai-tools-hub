import { Layout, Drawer } from "antd";
import { useState, useEffect } from "react";
import CategoryMenu from "./CategoryMenu";
import "./Sidebar.css";

const { Sider } = Layout;

const Sidebar = ({
    collapsed,
    onCollapse,
    drawerOpen,
    onDrawerClose,
    currentCategory,
}) => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // 侧边栏内容
    const sidebarContent = (
        <>
            <div className="sidebar-header">
                <h2 className="logo">
                    <div className="logo-icon">AI</div>
                    {!collapsed && <span>AI导航门户</span>}
                </h2>
            </div>
            <CategoryMenu
                onMenuClick={isMobile ? onDrawerClose : null}
                collapsed={collapsed}
                currentCategory={currentCategory}
            />
        </>
    );

    // 移动端使用 Drawer
    if (isMobile) {
        return (
            <Drawer
                placement="left"
                onClose={onDrawerClose}
                open={drawerOpen}
                width={220}
                styles={{
                    body: { padding: 0, background: "#F0F2F4" },
                    header: { background: "#F0F2F4" },
                }}
            >
                {sidebarContent}
            </Drawer>
        );
    }

    // PC端使用 Sider
    return (
        <Sider
            collapsible
            collapsed={collapsed}
            onCollapse={onCollapse}
            width={220}
            collapsedWidth={80}
            trigger={null}
            theme="light"
            style={{
                overflow: "auto",
                height: "100vh",
                position: "fixed",
                left: 0,
                top: 0,
                bottom: 0,
                background: "var(--bg-sidebar)",
            }}
        >
            {sidebarContent}
        </Sider>
    );
};

export default Sidebar;
