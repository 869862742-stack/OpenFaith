/**
 * React.memo 优化的组件集合
 * 用于高频渲染的列表项组件
 */

import React, { memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useThemeContext } from '../contexts/ThemeContext';

// ============ PostCard 优化 ============
interface PostCardProps {
  post: {
    id: string;
    title: string;
    content?: string;
    coverImage?: string;
    author?: {
      id: string;
      nickname: string;
      avatar?: string;
      faithTag?: string;
    };
    likes?: number;
    comments?: number;
    tags?: string[];
    createdAt?: string;
  };
  onLike?: () => void;
}

export const PostCard = memo(function PostCard({ post, onLike }: PostCardProps) {
  const navigate = useNavigate();
  const { primaryColor } = useThemeContext();
  
  // 格式化日期
  const timeAgo = useMemo(() => {
    if (!post.createdAt) return '';
    const date = new Date(post.createdAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 30) return `${diffDays}天前`;
    return date.toLocaleDateString();
  }, [post.createdAt]);

  const handleClick = () => {
    navigate(`/post/${post.id}`);
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLike?.();
  };

  return (
    <div 
      className="bg-base-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleClick}
    >
      {/* 封面图 */}
      <div className="aspect-[4/3] bg-base-200 relative overflow-hidden">
        <img 
          src={post.coverImage || 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=400&h=300&fit=crop'} 
          alt={post.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {post.tags && post.tags.length > 0 && (
          <span 
            className="absolute top-2 left-2 px-2 py-0.5 text-xs rounded-full text-white"
            style={{ backgroundColor: `${primaryColor}CC` }}
          >
            {post.tags[0]}
          </span>
        )}
      </div>
      
      {/* 内容 */}
      <div className="p-3">
        <h3 className="font-medium text-sm line-clamp-2 mb-2">{post.title}</h3>
        
        {/* 作者信息 */}
        {post.author && (
          <div className="flex items-center gap-2 mb-2">
            <img 
              src={post.author.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author.id}`}
              alt={post.author.nickname}
              className="w-6 h-6 rounded-full"
              loading="lazy"
            />
            <span className="text-xs text-base-content/60">{post.author.nickname}</span>
          </div>
        )}
        
        {/* 互动数据 */}
        <div className="flex items-center justify-between text-xs text-base-content/50">
          <span>{timeAgo}</span>
          <div className="flex items-center gap-3">
            <button 
              className="flex items-center gap-1 hover:text-red-500 transition-colors"
              onClick={handleLike}
            >
              <span>♥</span>
              <span>{post.likes || 0}</span>
            </button>
            <span className="flex items-center gap-1">
              <span>💬</span>
              <span>{post.comments || 0}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

// ============ NoteCard 优化 ============
interface NoteCardProps {
  note: {
    id: string;
    title: string;
    content?: string;
    cover_image?: string;
    tags?: string[];
    likes_count?: number;
    created_at?: string;
  };
  onEdit?: () => void;
  onDelete?: () => void;
}

export const NoteCard = memo(function NoteCard({ note, onEdit, onDelete }: NoteCardProps) {
  const navigate = useNavigate();
  
  const timeAgo = useMemo(() => {
    if (!note.created_at) return '';
    const date = new Date(note.created_at);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffDays < 1) return '今天';
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString();
  }, [note.created_at]);

  return (
    <div className="bg-base-100 rounded-lg p-4 shadow-sm">
      <div 
        className="flex gap-4 cursor-pointer"
        onClick={() => navigate(`/note/${note.id}`)}
      >
        <div className="flex-1">
          <h4 className="font-medium mb-1">{note.title}</h4>
          <p className="text-sm text-base-content/60 line-clamp-2 mb-2">
            {note.content || '无内容'}
          </p>
          <div className="flex items-center gap-2 text-xs text-base-content/50">
            <span>{timeAgo}</span>
            {note.tags && note.tags.length > 0 && (
              <>
                <span>·</span>
                <span>{note.tags[0]}</span>
              </>
            )}
            <span>·</span>
            <span>♥ {note.likes_count || 0}</span>
          </div>
        </div>
        
        {note.cover_image && (
          <img 
            src={note.cover_image}
            alt={note.title}
            className="w-20 h-20 rounded-lg object-cover"
            loading="lazy"
          />
        )}
      </div>
      
      {/* 操作按钮 */}
      <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-base-200">
        <button 
          className="text-xs text-base-content/60 hover:text-primary"
          onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
        >
          编辑
        </button>
        <button 
          className="text-xs text-base-content/60 hover:text-error"
          onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
        >
          删除
        </button>
      </div>
    </div>
  );
});

// ============ UserAvatar 优化 ============
interface UserAvatarProps {
  src?: string;
  name?: string;
  userId?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

const sizeMap = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

export const UserAvatar = memo(function UserAvatar({
  src,
  name,
  userId,
  size = 'md',
  className = '',
  onClick,
}: UserAvatarProps) {
  // 生成默认头像 URL
  const defaultAvatar = useMemo(() => {
    const seed = userId || name || 'default';
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4`;
  }, [userId, name]);

  return (
    <img
      src={src || defaultAvatar}
      alt={name || '用户头像'}
      className={`${sizeMap[size]} rounded-full object-cover bg-base-200 ${onClick ? 'cursor-pointer hover:opacity-80' : ''} ${className}`}
      loading="lazy"
      onClick={onClick}
      onError={(e) => {
        e.currentTarget.src = defaultAvatar;
      }}
    />
  );
});

// ============ TagBadge 优化 ============
interface TagBadgeProps {
  tag: string;
  color?: string;
  size?: 'sm' | 'md';
  onRemove?: () => void;
}

export const TagBadge = memo(function TagBadge({
  tag,
  color,
  size = 'sm',
  onRemove,
}: TagBadgeProps) {
  const bgColor = color || '#3B82F6';
  const textColor = '#ffffff';
  
  return (
    <span 
      className={`inline-flex items-center gap-1 rounded-full font-medium ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
      style={{ backgroundColor: `${bgColor}1A`, color: bgColor }}
    >
      {tag}
      {onRemove && (
        <button 
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-1 hover:opacity-70"
        >
          ×
        </button>
      )}
    </span>
  );
});

// ============ EmptyState 优化 ============
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState = memo(function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && (
        <div className="mb-4 text-base-content/30">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-base-content/60 mb-4">{description}</p>
      )}
      {action && (
        <button 
          className="btn btn-primary btn-sm"
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
    </div>
  );
});
