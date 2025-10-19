// 图标映射 - 只导入需要的图标，避免导入整个图标库
import {
  AppstoreOutlined,
  MessageOutlined,
  FileTextOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  ApiOutlined,
  ToolOutlined,
  SoundOutlined,
  DesktopOutlined,
  RobotOutlined,
  CodeOutlined,
  SearchOutlined,
  SafetyOutlined,
  TeamOutlined,
  DatabaseOutlined,
  CloudOutlined,
  ExperimentOutlined,
} from '@ant-design/icons';

// 图标名称到组件的映射
export const iconMap = {
  AppstoreOutlined,
  MessageOutlined,
  FileTextOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  ApiOutlined,
  ToolOutlined,
  SoundOutlined,
  DesktopOutlined,
  RobotOutlined,
  CodeOutlined,
  SearchOutlined,
  SafetyOutlined,
  TeamOutlined,
  DatabaseOutlined,
  CloudOutlined,
  ExperimentOutlined,
};

// 获取图标组件的辅助函数
export const getIcon = (iconName) => {
  return iconMap[iconName] || AppstoreOutlined;
};
