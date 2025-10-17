import { Button, FloatButton } from 'antd';
import { BulbOutlined, BulbFilled } from '@ant-design/icons';
import { useTheme } from '../../context/ThemeContext';

const ThemeSwitch = ({ type = 'float' }) => {
  const { isDark, toggleTheme } = useTheme();

  if (type === 'float') {
    return (
      <FloatButton
        icon={isDark ? <BulbFilled /> : <BulbOutlined />}
        tooltip={isDark ? '切换到亮色模式' : '切换到暗色模式'}
        onClick={toggleTheme}
        style={{ bottom: 80 }}
      />
    );
  }

  return (
    <Button
      type="text"
      icon={isDark ? <BulbFilled /> : <BulbOutlined />}
      onClick={toggleTheme}
    >
      {isDark ? '亮色' : '暗色'}
    </Button>
  );
};

export default ThemeSwitch;
