import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import './SearchBar.css';

const { Search } = Input;

const SearchBar = ({ onSearch, placeholder = '站内AI工具搜索' }) => {
  return (
    <div className="search-bar-container">
      <Search
        placeholder={placeholder}
        allowClear
        enterButton={<SearchOutlined />}
        size="large"
        onSearch={onSearch}
        onChange={(e) => onSearch(e.target.value)}
        style={{ maxWidth: 600 }}
      />
    </div>
  );
};

export default SearchBar;
