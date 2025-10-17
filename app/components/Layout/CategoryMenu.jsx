import { Menu } from 'antd';
import * as Icons from '@ant-design/icons';
import { useSettingsContext } from '../../context/SettingsContext';

const CategoryMenu = ({ onMenuClick, collapsed, currentCategory }) => {
  const settings = useSettingsContext();

  const scrollToSection = (categoryId) => {
    const element = document.getElementById(`category-${categoryId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    // 移动端点击后关闭抽屉
    if (onMenuClick) {
      onMenuClick();
    }
  };

  const menuItems = settings.categories.map(category => {
    // 统一使用header_icon，保持与顶部菜单栏一致的图标风格
    const iconKey = category.headerIcon || category.icon; // 优先使用header_icon，回退到icon
    const IconComponent = Icons[iconKey] || Icons.AppstoreOutlined;

    return {
      key: category.id,
      icon: <IconComponent />,
      label: category.name,
      onClick: () => scrollToSection(category.id),
    };
  });

  // 根据当前分类名称找到对应的分类ID
  const selectedKey = currentCategory
    ? settings.categories.find(cat => cat.name === currentCategory)?.id
    : null;

  return (
    <Menu
      mode="inline"
      theme="light"
      items={menuItems}
      inlineCollapsed={collapsed}
      selectedKeys={selectedKey ? [selectedKey] : []}
      style={{
        borderRight: 0,
        background: 'transparent',
      }}
    />
  );
};

export default CategoryMenu;
