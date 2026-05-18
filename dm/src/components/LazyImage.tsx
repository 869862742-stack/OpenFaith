/**
 * 懒加载图片组件
 * 支持 loading="lazy" 原生懒加载 + Intersection Observer 降级
 */

import React, { useState, useEffect, useRef, memo } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  fallback?: string;
  onLoad?: () => void;
  onError?: () => void;
}

const LazyImage = memo(function LazyImage({
  src,
  alt,
  className = '',
  style,
  placeholder,
  fallback,
  onLoad,
  onError,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(placeholder || '');
  const imgRef = useRef<HTMLDivElement>(null);
  const actualSrc = fallback || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23f0f0f0" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999"%3E%3C/text%3E%3C/svg%3E';

  // 使用 Intersection Observer 检测元素是否进入视口
  useEffect(() => {
    // 如果浏览器支持原生 lazy loading，先用原生的
    if ('loading' in HTMLImageElement.prototype) {
      setIsInView(true);
      setCurrentSrc(src);
      return;
    }

    // 否则使用 Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '100px', // 提前 100px 开始加载
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [src]);

  // 当进入视口时，加载实际图片
  useEffect(() => {
    if (!isInView || !src) return;

    const img = new Image();
    img.src = src;
    
    img.onload = () => {
      setCurrentSrc(src);
      setIsLoaded(true);
      onLoad?.();
    };
    
    img.onerror = () => {
      setCurrentSrc(fallback || actualSrc);
      onError?.();
    };
  }, [isInView, src, fallback, actualSrc, onLoad, onError]);

  return (
    <div 
      ref={imgRef} 
      className={`lazy-image-container ${className}`}
      style={{
        ...style,
        backgroundColor: '#f0f0f0',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 骨架屏/占位图 */}
      {!isLoaded && placeholder && (
        <img 
          src={placeholder} 
          alt="" 
          className="absolute inset-0 w-full h-full object-cover"
          aria-hidden="true"
        />
      )}
      
      {/* 实际图片 */}
      {currentSrc && (
        <img
          src={currentSrc}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
        />
      )}
    </div>
  );
});

export default LazyImage;

/**
 * 简单的懒加载 HOC
 * 用于给现有图片组件添加懒加载能力
 */
export function withLazyLoad<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  defaultProps?: Partial<P>
) {
  const WithLazyLoadComponent = memo(function WithLazyLoadComponent(props: P) {
    const [isLoaded, setIsLoaded] = useState(false);
    
    const handleLoad = () => setIsLoaded(true);
    
    return (
      <div className="relative bg-base-200 animate-pulse">
        {!isLoaded && (
          <div className="absolute inset-0" />
        )}
        <WrappedComponent 
          {...defaultProps} 
          {...props} 
          onLoad={handleLoad}
          className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>
    );
  });

  return WithLazyLoadComponent;
}
