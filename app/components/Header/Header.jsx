'use client'

import { Layout, Button, Dropdown } from "antd";
import {
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    DownOutlined,
} from "@ant-design/icons";
import * as Icons from "@ant-design/icons";
import "./Header.css";

const { Header: AntHeader } = Layout;

const Header = ({
    collapsed,
    onToggle,
    currentCategory,
    isMobile,
    categories,
    onCategoryClick,
}) => {
    // 移动端不显示Header（使用悬浮按钮）
    if (isMobile) {
        return null;
    }

    // 构建下拉菜单（使用顶部菜单专用图标）
    const menuItems = categories.map((category) => {
        const iconKey = category.headerIcon || category.icon; // 优先使用header_icon，回退到icon
        const IconComponent = Icons[iconKey] || Icons.AppstoreOutlined;
        return {
            key: category.id,
            icon: <IconComponent />,
            label: category.name,
            onClick: () => onCategoryClick(category.id),
        };
    });

    return (
        <AntHeader className="site-header" style={{ background: 'transparent' }}>
            <div className="header-left">
                <Button
                    type="text"
                    icon={
                        collapsed ? (
                            <MenuUnfoldOutlined />
                        ) : (
                            <MenuFoldOutlined />
                        )
                    }
                    onClick={onToggle}
                    className="header-trigger"
                />
                <div className="header-breadcrumb">
                    <Dropdown
                        menu={{ items: menuItems }}
                        trigger={["hover"]}
                        placement="bottomLeft"
                        overlayStyle={{ marginTop: "-8px" }}
                    >
                        <span className="site-name dropdown-trigger">
                            AI工具分类 <DownOutlined style={{ fontSize: 12 }} />
                        </span>
                    </Dropdown>
                </div>
            </div>
        </AntHeader>
    );
};

export default Header;
