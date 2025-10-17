'use client'

import { useState } from 'react';
import { Card, Tooltip, Dropdown, Modal, Form, Input, Select, App } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useSettingsContext } from '../../context/SettingsContext';
import './ToolCard.css';

const { TextArea } = Input;

const ToolCard = ({ tool }) => {
  const { message, modal } = App.useApp();
  const { incrementViewCount, updateTool, deleteTool, categories } = useSettingsContext();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [form] = Form.useForm();

  // 左键点击打开链接
  const handleClick = (e) => {
    // 增加浏览次数
    if (incrementViewCount) {
      incrementViewCount(tool.id);
    }
    // 打开链接
    window.open(tool.url, '_blank');
  };

  // 右键菜单点击
  const handleMenuClick = (e) => {
    e.domEvent.preventDefault();
    e.domEvent.stopPropagation();

    if (e.key === 'edit') {
      // 打开编辑Modal
      form.setFieldsValue({
        name: tool.name,
        description: tool.description,
        url: tool.url,
        logo: tool.logo,
        categoryId: tool.categoryId,
      });
      setIsEditModalOpen(true);
    } else if (e.key === 'delete') {
      // 删除确认
      modal.confirm({
        title: '确认删除',
        content: `确定要删除工具"${tool.name}"吗？此操作不可恢复。`,
        okText: '确定',
        okType: 'danger',
        cancelText: '取消',
        onOk: async () => {
          try {
            await deleteTool(tool.id);
            message.success('删除成功');
          } catch (error) {
            message.error('删除失败');
          }
        },
      });
    }
  };

  // 提交编辑
  const handleEditSubmit = async () => {
    try {
      const values = await form.validateFields();
      await updateTool(tool.id, values);
      message.success('更新成功');
      setIsEditModalOpen(false);
    } catch (error) {
      if (error.errorFields) {
        // 表单验证错误
        return;
      }
      message.error('更新失败');
    }
  };

  // 截断描述文本，保留6个字符
  const truncateDescription = (text) => {
    if (!text) return '';
    return text.length > 6 ? text.substring(0, 6) + '...' : text;
  };

  const menuItems = [
    {
      key: 'edit',
      label: '编辑',
      icon: <EditOutlined />,
    },
    {
      key: 'delete',
      label: '删除',
      icon: <DeleteOutlined />,
      danger: true,
    },
  ];

  return (
    <>
      <Dropdown
        menu={{
          items: menuItems,
          onClick: handleMenuClick,
        }}
        trigger={['contextMenu']}
      >
        <Tooltip title={tool.description}>
          <Card
            hoverable
            className="tool-card"
            onClick={handleClick}
            onContextMenu={(e) => e.preventDefault()}
          >
            <div className="tool-card-content">
              <img
                src={tool.logo}
                alt={tool.name}
                className="tool-logo"
              />
              <div className="tool-info">
                <h4 className="tool-name">{tool.name}</h4>
                <p className="tool-description">{truncateDescription(tool.description)}</p>
              </div>
            </div>
          </Card>
        </Tooltip>
      </Dropdown>

      <Modal
        title="编辑工具"
        open={isEditModalOpen}
        onOk={handleEditSubmit}
        onCancel={() => setIsEditModalOpen(false)}
        okText="确定"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 20 }}
        >
          <Form.Item
            name="name"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入工具标题" />
          </Form.Item>

          <Form.Item
            name="description"
            label="简介"
          >
            <TextArea rows={3} placeholder="请输入工具简介" />
          </Form.Item>

          <Form.Item
            name="url"
            label="跳转链接"
            rules={[
              { type: 'url', message: '请输入有效的URL' }
            ]}
          >
            <Input placeholder="https://example.com" />
          </Form.Item>

          <Form.Item
            name="logo"
            label="Logo链接"
            rules={[
              { type: 'url', message: '请输入有效的Logo URL' }
            ]}
          >
            <Input placeholder="https://example.com/logo.png" />
          </Form.Item>

          <Form.Item
            name="categoryId"
            label="分类"
          >
            <Select placeholder="请选择分类">
              {categories && categories.map(cat => (
                <Select.Option key={cat.id} value={cat.id}>
                  {cat.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default ToolCard;
