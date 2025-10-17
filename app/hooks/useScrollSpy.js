import { useState, useEffect } from 'react';

export const useScrollSpy = (categories) => {
  const [currentCategory, setCurrentCategory] = useState(null);

  useEffect(() => {
    const handleScroll = () => {
      // 获取当前滚动位置
      const scrollPosition = window.scrollY + 100; // 偏移100px

      // 查找当前可见的分类
      for (let i = categories.length - 1; i >= 0; i--) {
        const category = categories[i];
        const element = document.getElementById(`category-${category.id}`);

        if (element) {
          const { offsetTop } = element;

          if (scrollPosition >= offsetTop) {
            setCurrentCategory(category.name);
            return;
          }
        }
      }

      // 如果滚动到顶部，清空分类
      if (scrollPosition < 200) {
        setCurrentCategory(null);
      }
    };

    // 初始化
    handleScroll();

    // 添加滚动监听（使用节流优化性能）
    let timeoutId;
    const throttledScroll = () => {
      if (timeoutId) {
        return;
      }
      timeoutId = setTimeout(() => {
        handleScroll();
        timeoutId = null;
      }, 100);
    };

    window.addEventListener('scroll', throttledScroll);

    return () => {
      window.removeEventListener('scroll', throttledScroll);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [categories]);

  return currentCategory;
};
