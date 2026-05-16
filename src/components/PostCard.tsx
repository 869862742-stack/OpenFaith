import React, { useState } from 'react';
import { Flame, MessageCircle, Crown, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Post } from '../types';

// 默认封面图 fallback
const DEFAULT_COVER = 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=400&h=600&fit=crop';
// 默认头像 fallback
const DEFAULT_AVATAR = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed || 'user'}`;

interface PostCardProps {
  post: Post;
  isVip?: boolean;
  onClick?: (post: Post) => void;
}

// faith_tag 显示映射
const faithTagColors: { [key: string]: string } = {
  '基督教': '#4F46E5',
  '佛教': '#F59E0B', 
  '伊斯兰教': '#10B981',
  '犹太教': '#6366F1',
  '印度教': '#EC4899',
  '道教': '#8B5CF6',
  '寻求者': '#6B7280',
};

function PostCard({ post, isVip = false, onClick }: PostCardProps) {
  const navigate = useNavigate();
  // 使用 post.author.faithTag 或 post.author.faith_tag
  const faithTag = post.author?.faithTag || post.author?.faith_tag || '寻求者';
  const faithTagColor = faithTagColors[faithTag] || '#6B7280';
  const [isLiked, setIsLiked] = useState(false);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const [coverError, setCoverError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  
  // 计算热度值：热值 = (浏览×0.5) + (加热×5) + (评论×2) + (分享×3) + (收藏×2)
  const views = (post as any).views_count || 0;
  const heatCount = (post as any).heatCount || (post as any).heat_count || 0;
  const commentsCount = (post as any).comments_count || (post as any).comments || 0;
  const sharesCount = (post as any).shares_count || 0;
  const favoritesCount = (post as any).favorites_count || 0;
  const hotValue = Math.floor((views * 0.5) + (heatCount * 5) + (commentsCount * 2) + (sharesCount * 3) + (favoritesCount * 2));
  // 热度格式化（抖音风格）
  const formatHot = (num: number): string => {
    if (num < 10000) return String(num);
    const wan = num / 10000;
    if (wan < 10) return wan % 1 === 0 ? `${wan}W` : `${wan.toFixed(1)}W`;
    return `${Math.floor(wan)}W`;
  };
  
  // 处理封面图加载失败
  const handleCoverError = () => {
    setCoverError(true);
  };
  
  // 处理头像加载失败
  const handleAvatarError = () => {
    setAvatarError(true);
  };

  // 单击进详情
  const handleClick = () => {
    onClick?.(post);
  };

  return (
    <div
      className={`bg-white rounded-xl overflow-hidden cursor-pointer shadow-sm relative ${
        isVip ? 'ring-2 ring-[#E11D48]/30' : ''
      }`}
      onClick={handleClick}
    >
      {/* 图片区域 */}
      <div className="relative aspect-[3/4] overflow-hidden">
        <img
          src={coverError ? DEFAULT_COVER : (post.coverImage || DEFAULT_COVER)}
          alt={post.title}
          className="w-full h-full object-cover"
          onError={handleCoverError}
        />
        
        {/* VIP 标识 */}
        {isVip && (
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-gradient-to-r from-[#E11D48] to-[#F97316] rounded-full flex items-center gap-1">
            <Crown className="w-3 h-3 text-white" />
            <span className="text-[10px] text-white font-medium">VIP</span>
          </div>
        )}

        {/* 双击点赞动画 */}
        {showLikeAnimation && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Heart className="w-20 h-20 text-white fill-white animate-bounce" />
          </div>
        )}

        {/* 已点赞状态 */}
        {isLiked && !showLikeAnimation && (
          <div className="absolute bottom-2 right-2">
            <Heart className="w-5 h-5 text-white fill-[#E11D48]" />
          </div>
        )}
      </div>

      {/* 卡片内容 */}
      <div className="p-3">
        <h3 className="text-sm font-medium text-[#1E293B] line-clamp-2 mb-1">
          {post.title}
        </h3>

        {/* 内容摘要 */}
        {post.content && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-2">
            {post.content}
          </p>
        )}

        {post.tags && post.tags.length > 0 && (
          <div className="flex gap-1 mb-2 flex-wrap">
            {post.tags.slice(0, 2).map((tag, idx) => (
              <span
                key={idx}
                className={`px-2 py-0.5 text-[10px] rounded-full ${
                  isVip
                    ? 'bg-gradient-to-r from-[#E11D48]/10 to-[#F97316]/10 text-[#E11D48]'
                    : 'bg-[#E11D48]/10 text-[#E11D48]'
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (post.author?.id) {
                  navigate(`/profile/${post.author.id}`);
                }
              }}
              className="w-5 h-5 rounded-full object-cover overflow-hidden"
            >
              <img
                src={avatarError ? DEFAULT_AVATAR(post.author?.nickname) : (post.author?.avatar || DEFAULT_AVATAR(post.author?.nickname))}
                alt={post.author?.nickname}
                className="w-5 h-5 rounded-full object-cover"
                onError={handleAvatarError}
              />
            </button>
            <span className="text-xs text-[#64748B] truncate max-w-[50px]">
              {post.author?.nickname || '用户'}
            </span>
            {/* Faith Tag 标签 */}
            <span 
              className="text-[10px] px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: `${faithTagColor}20`, color: faithTagColor }}
            >
              {faithTag}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* 评论数 */}
            {post.comments_count > 0 && (
              <div className="flex items-center gap-0.5">
                <MessageCircle className="w-3 h-3 text-gray-400" />
                <span className="text-[10px] text-gray-500">{post.comments_count}</span>
              </div>
            )}
            {/* 热度值 */}
            <div className="flex items-center gap-0.5">
              <Flame className="w-3 h-3 text-orange-500" />
              <span className="text-[10px] text-orange-500">{formatHot(hotValue)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PostCard;
