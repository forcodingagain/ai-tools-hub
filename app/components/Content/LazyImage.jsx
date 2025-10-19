'use client'

import { useState, useRef, useEffect, memo } from 'react';
import './LazyImage.css';

// 并发请求控制器
class ImageLoadManager {
  constructor(maxConcurrent = 3) {
    this.maxConcurrent = maxConcurrent;
    this.loadingCount = 0;
    this.queue = [];
  }

  async loadImage(src, priority = false) {
    return new Promise((resolve, reject) => {
      const loadTask = { src, priority, resolve, reject };

      if (this.loadingCount < this.maxConcurrent && !priority) {
        this._startLoad(loadTask);
      } else {
        this.queue.push(loadTask);
        // 高优先级任务插队到队列前面
        if (priority) {
          this.queue.unshift(...this.queue.splice(this.queue.indexOf(loadTask), 1));
        }
      }
    });
  }

  _startLoad({ src, resolve, reject }) {
    this.loadingCount++;

    const img = new Image();

    img.onload = () => {
      this.loadingCount--;
      this._processQueue();
      resolve(src);
    };

    img.onerror = () => {
      this.loadingCount--;
      this._processQueue();
      reject(new Error(`Failed to load image: ${src}`));
    };

    img.src = src;
  }

  _processQueue() {
    if (this.queue.length > 0 && this.loadingCount < this.maxConcurrent) {
      const nextTask = this.queue.shift();
      this._startLoad(nextTask);
    }
  }
}

// 图片缓存管理器
class ImageCache {
  constructor() {
    this.cache = new Map();
    this.loadingPromises = new Map();
    this.failedImages = new Set();
  }

  async getImage(src, maxRetries = 2) {
    // 如果图片加载失败过，直接返回失败
    if (this.failedImages.has(src)) {
      throw new Error(`Image previously failed to load: ${src}`);
    }

    // 如果正在加载中，返回现有Promise
    if (this.loadingPromises.has(src)) {
      return this.loadingPromises.get(src);
    }

    // 如果已缓存，直接返回
    if (this.cache.has(src)) {
      return this.cache.get(src);
    }

    // 创建新的加载Promise
    const loadPromise = this._loadImageWithRetry(src, maxRetries);
    this.loadingPromises.set(src, loadPromise);

    try {
      const result = await loadPromise;
      this.cache.set(src, result);
      return result;
    } catch (error) {
      this.failedImages.add(src);
      throw error;
    } finally {
      this.loadingPromises.delete(src);
    }
  }

  async _loadImageWithRetry(src, maxRetries, currentRetry = 0) {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => resolve(src);
      img.onerror = () => {
        if (currentRetry < maxRetries) {
          console.warn(`图片加载失败，重试 ${currentRetry + 1}/${maxRetries}:`, src);
          setTimeout(() => {
            this._loadImageWithRetry(src, maxRetries, currentRetry + 1)
              .then(resolve)
              .catch(reject);
          }, 1000 * (currentRetry + 1)); // 递增延时
        } else {
          reject(new Error(`Failed to load image after ${maxRetries} retries: ${src}`));
        }
      };

      img.src = src;
    });
  }

  clear() {
    this.cache.clear();
    this.loadingPromises.clear();
    this.failedImages.clear();
  }
}

// 全局图片缓存管理器实例
const imageCache = new ImageCache();

// 全局图片加载管理器实例
const imageLoadManager = new ImageLoadManager(3);

const LazyImage = memo(({
  src,
  alt,
  className = '',
  placeholder = '/placeholder.svg',
  priority = false,
  onLoad,
  onError
}) => {
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(placeholder);
  const imgRef = useRef();

  // 视口检测
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px' // 提前50px开始加载
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
    observer.disconnect();
    // 组件卸载时清理资源
    if (imgRef.current) {
      imgRef.current = null;
    }
  };
  }, []);

  // 图片加载逻辑
  useEffect(() => {
    if (!isInView || !src) return;

    const loadImage = async () => {
      try {
        setHasError(false);
        // 使用缓存管理器加载图片（包含重试机制）
        await imageCache.getImage(src, priority ? 3 : 2);
        setCurrentSrc(src);
        setIsLoaded(true);
        onLoad?.();
      } catch (error) {
        console.warn('图片加载失败:', error.message);
        setHasError(true);
        onError?.(error);
      }
    };

    loadImage();
  }, [isInView, src, priority, onLoad, onError]);

  return (
    <div ref={imgRef} className={`lazy-image-container ${className}`}>
      <img
        src={currentSrc}
        alt={alt}
        className={`lazy-image ${isLoaded ? 'loaded' : ''} ${hasError ? 'error' : ''}`}
        loading="lazy"
        decoding="async"
      />
      {!isLoaded && !hasError && (
        <div className="lazy-image-placeholder">
          <div className="loading-spinner" />
        </div>
      )}
      {hasError && (
        <div className="lazy-image-error">
          <span>⚠</span>
        </div>
      )}
    </div>
  );
});

LazyImage.displayName = 'LazyImage';

export default LazyImage;
