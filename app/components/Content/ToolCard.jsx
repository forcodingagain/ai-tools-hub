'use client'

import { useState, useMemo, useCallback, memo } from 'react';
import { Badge, Dropdown, Modal, Form, Input, Switch, App, Tag, Space, Tooltip, Select } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useSettingsContext } from '../../context/SettingsContext';
import './ToolCard.css';

const ToolCard = memo(({ tool }) => {
  const { incrementViewCount, updateTool, deleteTool, updateToolTags, categories } = useSettingsContext();
  const { modal, message } = App.useApp();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [form] = Form.useForm();
  // 用于编辑模态框的标签（包含 id）
  const [editTags, setEditTags] = useState([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [tagInputVisible, setTagInputVisible] = useState(false);

  // 使用 useMemo 缓存计算结果，避免每次渲染都重新计算
  const showBadge = useMemo(() => tool.isNew || tool.isFeatured, [tool.isNew, tool.isFeatured]);

  // 显示用的标签（从 tool.tags 直接获取，无需请求）
  const displayTags = useMemo(() =>
    (tool.tags || []).map((tagName, index) => ({
      id: `display-${index}`, // 临时 id，仅用于 React key
      name: tagName
    }))
  , [tool.tags]);

  // 加载完整标签对象（包含真实 id，用于编辑/删除）
  const loadEditTags = async () => {
    try {
      const response = await fetch(`/api/tools/${tool.id}/tags`);
      const data = await response.json();
      if (data.success) {
        setEditTags(data.tags);
      }
    } catch (error) {
      console.error('加载标签失败:', error);
    }
  };

  // 左键点击 - 打开链接并增加浏览量（使用 useCallback 避免重复创建）
  const handleClick = useCallback((e) => {
    e.stopPropagation();
    if (incrementViewCount) {
      incrementViewCount(tool.id);
    }
    window.open(tool.url, '_blank');
  }, [incrementViewCount, tool.id, tool.url]);

  // 编辑工具（使用 useCallback）
  const handleEdit = useCallback(async () => {
    form.setFieldsValue({
      name: tool.name,
      description: tool.description,
      url: tool.url,
      logo: tool.logo,
      isFeatured: tool.isFeatured,
      isNew: tool.isNew,
      categoryId: tool.categoryId, // 添加分类字段
    });
    await loadEditTags(); // 只在编辑时加载完整标签对象
    setEditModalVisible(true);
  }, [form, tool.name, tool.description, tool.url, tool.logo, tool.isFeatured, tool.isNew, tool.categoryId]);

  // 保存编辑
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const categoryChanged = values.categoryId !== tool.categoryId;

      await updateTool(tool.id, values);
      message.success('更新成功');
      setEditModalVisible(false);

      // 如果分类改变了，刷新页面以显示工具在新分类中
      if (categoryChanged) {
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    } catch (error) {
      console.error('更新失败:', error);
      message.error('更新失败');
    }
  };

  // 添加标签
  const handleAddTag = async () => {
    const tagName = newTagInput.trim();
    if (!tagName) {
      message.warning('标签名称不能为空');
      return;
    }

    if (tagName.length > 50) {
      message.warning('标签名称不能超过50个字符');
      return;
    }

    try {
      const response = await fetch(`/api/tools/${tool.id}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagName }),
      });

      const data = await response.json();
      if (data.success) {
        setEditTags(data.tags);
        // 立即更新全局状态，让卡片显示最新标签
        updateToolTags(tool.id, data.tags.map(tag => tag.name));
        setNewTagInput('');
        setTagInputVisible(false);
        message.success('标签添加成功');
      } else {
        message.error(data.error || '添加标签失败');
      }
    } catch (error) {
      console.error('添加标签失败:', error);
      message.error('添加标签失败');
    }
  };

  // 删除标签
  const handleRemoveTag = async (tagId) => {
    try {
      const response = await fetch(`/api/tools/${tool.id}/tags`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId }),
      });

      const data = await response.json();
      if (data.success) {
        setEditTags(data.tags);
        // 立即更新全局状态，让卡片显示最新标签
        updateToolTags(tool.id, data.tags.map(tag => tag.name));
        message.success('标签删除成功');
      } else {
        message.error(data.error || '删除标签失败');
      }
    } catch (error) {
      console.error('删除标签失败:', error);
      message.error('删除标签失败');
    }
  };

  // 删除工具
  const handleDelete = () => {
    modal.confirm({
      title: '确认删除',
      content: `确定要删除「${tool.name}」吗？此操作不可恢复。`,
      okText: '确定',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          await deleteTool(tool.id);
          message.success('删除成功');
        } catch (error) {
          console.error('删除失败:', error);
          message.error('删除失败');
        }
      },
    });
  };

  // 右键菜单项
  const menuItems = [
    {
      key: 'edit',
      label: '编辑工具',
      onClick: handleEdit,
    },
    {
      key: 'delete',
      label: '删除工具',
      danger: true,
      onClick: handleDelete,
    },
  ];

  // 卡片内容
  const cardContent = (
    <Tooltip title={tool.description} placement="top" mouseEnterDelay={0.3}>
      <div className="tool-card" onClick={handleClick}>
        <div className="tool-logo">
          {tool.logo && (
            <img
              src={tool.logo}
              alt={tool.name}
              loading="lazy"
              decoding="async"
            />
          )}
        </div>
        <div className="tool-info">
          <div className="tool-header">
            <h3 className="tool-name">{tool.name}</h3>
            <span className="tool-viewcount">浏览: {tool.viewCount || 0}</span>
          </div>
          {displayTags.length > 0 && (
            <div className="tool-tags">
              {displayTags.map((tag) => (
                <Tag key={tag.id} color="blue" style={{ fontSize: '12px' }}>
                  {tag.name}
                </Tag>
              ))}
            </div>
          )}
        </div>
      </div>
    </Tooltip>
  );

  // 包装后的卡片（带或不带 Badge）
  const wrappedCard = showBadge ? (
    <Badge.Ribbon
      text={tool.isNew ? "NEW" : "推荐"}
      color={tool.isNew ? "cyan" : "volcano"}
    >
      {cardContent}
    </Badge.Ribbon>
  ) : (
    cardContent
  );

  return (
    <>
      <Dropdown
        menu={{ items: menuItems }}
        trigger={['contextMenu']}
      >
        <div className="tool-card-wrapper">
          {wrappedCard}
        </div>
      </Dropdown>

      {/* 编辑模态框 */}
      <Modal
        title="编辑工具"
        open={editModalVisible}
        onOk={handleSave}
        onCancel={() => setEditModalVisible(false)}
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
            label="工具分类"
            name="categoryId"
            rules={[{ required: true, message: '请选择工具分类' }]}
          >
            <Select
              placeholder="请选择工具分类"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={categories?.map(cat => ({
                value: cat.id,
                label: cat.name
              })) || []}
            />
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
          >
            <Switch />
          </Form.Item>

          <Form.Item
            label="是否新品"
            name="isNew"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          {/* 标签管理 */}
          <Form.Item label="标签">
            <Space size={[8, 8]} wrap>
              {editTags.map((tag) => (
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
});

// 添加 displayName 便于调试
ToolCard.displayName = 'ToolCard';

export default ToolCard;
