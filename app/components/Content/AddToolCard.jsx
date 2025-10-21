'use client'

import { useState, useCallback, memo } from 'react';
import { Modal, Form, Input, Switch, App, Tag, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useSettingsContext } from '../../context/SettingsContext';
import './AddToolCard.css';

/**
 * AddToolCard 只依赖 categoryId,只在 categoryId 变化时重渲染
 */
const arePropsEqual = (prevProps, nextProps) => {
  return prevProps.categoryId === nextProps.categoryId;
};

const AddToolCard = memo(({ categoryId, style: propStyle = {} }) => {
  const { addTool } = useSettingsContext();
  const { message } = App.useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [tags, setTags] = useState([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [tagInputVisible, setTagInputVisible] = useState(false);

  // 打开添加工具模态框（使用 useCallback）
  const handleClick = useCallback(() => {
    setModalVisible(true);
    setTags([]);
    form.resetFields();
  }, [form]);

  // 保存新工具
  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      // 调用 API 创建工具
      const response = await fetch('/api/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          categoryId,
          tags: tags.map(tag => tag.name),
        }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        // 验证工具数据的有效性
        const newTool = data.data;
        if (!newTool || !newTool.id || !newTool.name || newTool.categoryId === undefined) {
          console.error('⚠️ API 返回了无效的工具数据:', newTool);
          message.error('服务器返回了无效的工具数据');
          return;
        }

        // 更新全局状态 - 确保传递有效的工具数据
        if (addTool) {
          addTool(newTool);
        }
        message.success('工具添加成功');
        setModalVisible(false);
        form.resetFields();
        setTags([]);
      } else {
        message.error(data.error || '添加工具失败');
      }
    } catch (error) {
      console.error('添加工具失败:', error);
      message.error('添加工具失败');
    }
  };

  // 添加标签
  const handleAddTag = () => {
    const tagName = newTagInput.trim();
    if (!tagName) {
      message.warning('标签名称不能为空');
      return;
    }

    if (tagName.length > 50) {
      message.warning('标签名称不能超过50个字符');
      return;
    }

    // 检查是否已存在
    if (tags.some(tag => tag.name === tagName)) {
      message.warning('标签已存在');
      return;
    }

    setTags([...tags, { id: `temp-${Date.now()}`, name: tagName }]);
    setNewTagInput('');
    setTagInputVisible(false);
  };

  // 删除标签
  const handleRemoveTag = (tagId) => {
    setTags(tags.filter(tag => tag.id !== tagId));
  };

  return (
    <>
      <div
        className="add-tool-card"
        style={{ height: '90px', width: '100%', ...propStyle }}
        onClick={handleClick}
      >
        <PlusOutlined className="add-tool-icon" />
        <span className="add-tool-text">添加工具</span>
      </div>

      {/* 添加工具模态框 */}
      <Modal
        title="添加工具"
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        okText="保存"
        cancelText="取消"
        width={600}
        forceRender
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 20 }}
        >
          <Form.Item
            label="工具名称"
            name="name"
            rules={[{ required: true, message: '请输入工具名称' }]}
          >
            <Input placeholder="请输入工具名称" />
          </Form.Item>

          <Form.Item
            label="工具描述"
            name="description"
            rules={[{ required: true, message: '请输入工具描述' }]}
          >
            <Input.TextArea
              placeholder="请输入工具描述"
              rows={4}
            />
          </Form.Item>

          <Form.Item
            label="工具链接"
            name="url"
            rules={[
              { required: true, message: '请输入工具链接' },
              { type: 'url', message: '请输入有效的URL' }
            ]}
          >
            <Input placeholder="https://..." />
          </Form.Item>

          <Form.Item
            label="Logo URL"
            name="logo"
          >
            <Input placeholder="https://..." />
          </Form.Item>

          <Form.Item
            label="是否推荐"
            name="isFeatured"
            valuePropName="checked"
            initialValue={false}
          >
            <Switch />
          </Form.Item>

          <Form.Item
            label="是否新品"
            name="isNew"
            valuePropName="checked"
            initialValue={false}
          >
            <Switch />
          </Form.Item>

          {/* 标签管理 */}
          <Form.Item label="标签">
            <Space size={[8, 8]} wrap>
              {tags.map((tag) => (
                <Tag
                  key={tag.id}
                  closable
                  onClose={(e) => {
                    e.preventDefault();
                    handleRemoveTag(tag.id);
                  }}
                  color="blue"
                >
                  {tag.name}
                </Tag>
              ))}

              {tagInputVisible ? (
                <Input
                  type="text"
                  size="small"
                  style={{ width: 120 }}
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onBlur={() => {
                    if (newTagInput.trim()) {
                      handleAddTag();
                    } else {
                      setTagInputVisible(false);
                    }
                  }}
                  onPressEnter={handleAddTag}
                  placeholder="输入标签名称"
                  autoFocus
                />
              ) : (
                <Tag
                  onClick={() => setTagInputVisible(true)}
                  style={{
                    background: '#fff',
                    borderStyle: 'dashed',
                    cursor: 'pointer'
                  }}
                >
                  <PlusOutlined /> 新增标签
                </Tag>
              )}
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}, arePropsEqual); // ✅ 使用自定义比较函数

// 添加 displayName 便于调试
AddToolCard.displayName = 'AddToolCard';

export default AddToolCard;
