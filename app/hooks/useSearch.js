import { useState, useMemo } from 'react';
import { debounce } from 'lodash';

export const useSearch = (tools) => {
  const [keyword, setKeyword] = useState('');

  const filteredTools = useMemo(() => {
    if (!keyword.trim()) return tools;

    const lowerKeyword = keyword.toLowerCase();
    return tools.filter(tool =>
      tool.name.toLowerCase().includes(lowerKeyword) ||
      tool.description.toLowerCase().includes(lowerKeyword) ||
      tool.tags.some(tag => tag.toLowerCase().includes(lowerKeyword))
    );
  }, [tools, keyword]);

  const debouncedSearch = useMemo(
    () => debounce((value) => {
      setKeyword(value);
    }, 300),
    []
  );

  return {
    keyword,
    filteredTools,
    handleSearch: debouncedSearch,
    setKeyword
  };
};
