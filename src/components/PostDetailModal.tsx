import React, { useState, useRef, useEffect } from 'react';
import { Heart, MessageCircle, Star, Share2, X, ChevronLeft, ChevronRight, Flame, Send, Image, Mic, Trash2, ChevronDown, ChevronUp, Download, Smile, ThumbsUp, Laugh, Frown, Angry, Sun, Moon, CloudRain, Wind, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useThemeContext } from '../contexts/ThemeContext';
import { useAuthStore } from '../stores/auth';
import { cachedFetch } from '../utils/apiCache';

const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';

// 等级阈值配置
const LEVEL_THRESHOLDS = [0, 1000, 5000, 25000, 125000, 250000, 500000, 1000000, 2000000, 5000000];
const VIP_MULTIPLIER = 2;
const EXP_KEY = 'of_exp_today';

// 每日上限配置
const MAX_HEAT_RECEIVED = 500; // 被加热获得经验每日上限
const MAX_HEAT_GIVEN = 10;     // 加热他人每日上限
const MAX_COMMENT_MADE = 20;    // 发表评论每日上限
const MAX_COMMENT_RECEIVED = 15; // 收到评论每日上限
const MAX_HEAT_PER_POST_PER_DAY = 3; // 问题8d：每篇笔记每天最多加热3次

// 表情列表（简笔画风格，使用 lucide 图标 + 主题色）
// 每个元素为 { icon: React.ReactNode, emoji: string }
const EMOJI_ICONS = [
  { icon: <Smile className="w-5 h-5" />, emoji: '😊' },
  { icon: <Laugh className="w-5 h-5" />, emoji: '😂' },
  { icon: <Frown className="w-5 h-5" />, emoji: '😢' },
  { icon: <Heart className="w-5 h-5" />, emoji: '❤️' },
  { icon: <ThumbsUp className="w-5 h-5" />, emoji: '👍' },
  { icon: <Flame className="w-5 h-5" />, emoji: '🔥' },
  { icon: <Angry className="w-5 h-5" />, emoji: '😡' },
  { icon: <Sun className="w-5 h-5" />, emoji: '☀️' },
  { icon: <Moon className="w-5 h-5" />, emoji: '🌙' },
  { icon: <CloudRain className="w-5 h-5" />, emoji: '🌧️' },
  { icon: <Wind className="w-5 h-5" />, emoji: '💨' },
  { icon: <Star className="w-5 h-5" />, emoji: '⭐' },
  { icon: <Heart className="w-5 h-5 fill-current" />, emoji: '💕' },
  { icon: <Sparkles className="w-5 h-5" />, emoji: '✨' },
  { icon: <MessageCircle className="w-5 h-5" />, emoji: '💬' },
  { icon: <CloudRain className="w-5 h-5" />, emoji: '🌧️' },
  { icon: <Sun className="w-5 h-5" />, emoji: '🌈' },
  { icon: <Flame className="w-5 h-5" />, emoji: '🎉' },
];

// 计算等级
function calculateLevel(exp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (exp >= LEVEL_THRESHOLDS[i]) {
      return i + 1;
    }
  }
  return 1;
}

// 获取/保存每日统计
function getTodayStats() {
  const today = new Date().toISOString().split('T')[0];
  const stored = localStorage.getItem(EXP_KEY);
  if (!stored) return { date: today, publish: 0, heat_given: 0, heat_received: 0, comment_made: 0, comment_received: 0, collected: 0, collected_by_others: 0, shared: 0 };
  const stats = JSON.parse(stored);
  if (stats.date !== today) return { date: today, publish: 0, heat_given: 0, heat_received: 0, comment_made: 0, comment_received: 0, collected: 0, collected_by_others: 0, shared: 0 };
  return stats;
}

function saveTodayStats(stats: any) {
  localStorage.setItem(EXP_KEY, JSON.stringify(stats));
}

interface Post {
  id: string;
  title: string;
  content?: string;
  coverImage?: string;
  images?: string[];
  user_id?: string;
  status?: string;
  likes?: number;
  likes_count?: number;
  comments?: number;
  comments_count?: number;
  heat_count?: number;
  views_count?: number;
  shares_count?: number;
  favorites_count?: number;
  created_at?: string;
  author?: {
    id?: string;
    username?: string;
    nickname?: string;
    avatar?: string;
    avatar_url?: string;
    faith_tag?: string;
  };
  tags?: string[];
  user?: {
    id?: string;
    username?: string;
    avatar_url?: string;
  };
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_id?: string | null;
  post_id: string;
  profiles?: {
    username: string;
    avatar_url: string;
  };
}

interface ReplyToInfo {
  commentId: string;
  username: string;
}

interface PostDetailModalProps {
  posts: Post[];
  initialIndex: number;
  onClose: () => void;
  onLike?: (postId: string) => void;
}

// 笔记图片全屏查看器组件 - 支持多图滑动和缩放
const PostImageViewer: React.FC<{
  images: string[];
  initialIndex: number;
  onClose: () => void;
}> = ({ images, initialIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchStartY, setTouchStartY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number }>({ time: 0, x: 0, y: 0 });

  // 切换图片时重置缩放
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex]);

  // 双指缩放
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => Math.min(Math.max(prev + delta, 0.5), 4));
  };

  // 拖拽
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - startPos.x,
        y: e.clientY - startPos.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 双击放大/缩小
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (scale === 1) {
      setScale(2);
    } else {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  };

  // 触摸开始
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const now = Date.now();
    
    // 双击检测
    if (now - lastTapRef.current.time < 300) {
      const dx = Math.abs(touch.clientX - lastTapRef.current.x);
      const dy = Math.abs(touch.clientY - lastTapRef.current.y);
      if (dx < 50 && dy < 50) {
        // 双击
        if (scale === 1) {
          setScale(2);
        } else {
          setScale(1);
          setPosition({ x: 0, y: 0 });
        }
        lastTapRef.current = { time: 0, x: 0, y: 0 };
        return;
      }
    }
    lastTapRef.current = { time: now, x: touch.clientX, y: touch.clientY };

    setTouchStartX(touch.clientX);
    setTouchStartY(touch.clientY);
    
    if (scale > 1) {
      setIsDragging(true);
      setStartPos({ x: touch.clientX - position.x, y: touch.clientY - position.y });
    }
  };

  // 触摸移动
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 1) return; // 多指缩放时忽略
    const touch = e.touches[0];
    
    if (isDragging && scale > 1) {
      e.preventDefault();
      setPosition({
        x: touch.clientX - startPos.x,
        y: touch.clientY - startPos.y,
      });
    }
  };

  // 触摸结束 - 滑动切换图片
  const handleTouchEnd = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    
    setIsDragging(false);
    
    // 只有在水平滑动幅度大于垂直滑动时才切换图片
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) && scale === 1) {
      if (deltaX > 0 && currentIndex > 0) {
        // 向右滑，切换到上一张
        setCurrentIndex(prev => prev - 1);
      } else if (deltaX < 0 && currentIndex < images.length - 1) {
        // 向左滑，切换到下一张
        setCurrentIndex(prev => prev + 1);
      }
    }
  };

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < images.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, images.length, onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center"
      onClick={onClose}
      onWheel={handleWheel}
    >
      {/* 关闭按钮 */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30"
      >
        <X className="w-6 h-6" />
      </button>

      {/* 页码指示 */}
      {images.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-3 py-1 bg-black/50 rounded-full text-white text-sm">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* 左右切换按钮 */}
      {images.length > 1 && (
        <>
          {currentIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => prev - 1); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          {currentIndex < images.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => prev + 1); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </>
      )}

      {/* 图片容器 */}
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in', touchAction: scale > 1 ? 'none' : 'pan-y' }}
      >
        <img
          key={currentIndex}
          src={images[currentIndex]}
          alt=""
          className="max-w-full max-h-full object-contain select-none transition-transform duration-150"
          style={{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
          }}
          draggable={false}
          onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/800/600'; }}
        />
      </div>

      {/* 操作提示 */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50 text-xs text-center px-4">
        {scale === 1 ? '左右滑动切换 · 点击放大' : '双指缩放 · 拖动平移'}
      </div>
    </div>
  );
};

// 评论图片查看器组件
const CommentImageViewer: React.FC<{
  src: string;
  onClose: () => void;
}> = ({ src, onClose }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // 双指缩放
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => Math.min(Math.max(prev + delta, 0.5), 4));
  };

  // 拖拽
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - startPos.x,
        y: e.clientY - startPos.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 下载图片
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = 'comment-image.jpg';
    link.click();
  };

  // 重置缩放和位置
  const handleDoubleClick = () => {
    if (scale === 1) {
      setScale(2);
    } else {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center"
      onClick={onClose}
      onWheel={handleWheel}
    >
      <div className="absolute top-4 right-4 flex gap-3 z-10">
        <button
          onClick={(e) => { e.stopPropagation(); handleDownload(); }}
          className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30"
        >
          <Download className="w-5 h-5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in' }}
      >
        <img
          src={src}
          alt=""
          className="max-w-full max-h-full object-contain select-none transition-transform duration-150"
          style={{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
          }}
          draggable={false}
        />
      </div>
      
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60 text-sm">
        双指捏合缩放 · 双击放大/缩小 · 长按下载
      </div>
    </div>
  );
};

export default function PostDetailModal({ posts, initialIndex, onClose, onLike }: PostDetailModalProps) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLiked, setIsLiked] = useState(false);
  const [isHeated, setIsHeated] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  // 回复功能状态
  const [replyTo, setReplyTo] = useState<ReplyToInfo | null>(null);
  // 回复折叠状态（存储每个顶级评论的折叠状态）
  const [collapsedReplies, setCollapsedReplies] = useState<Record<string, boolean>>({});
  // 回复列表展开状态
  const [expandedReplyUsers, setExpandedReplyUsers] = useState<Record<string, Set<string>>>({});
  // 评论图片查看器
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  // 笔记图片查看器
  const [postImageModal, setPostImageModal] = useState(false);
  const [postImageIndex, setPostImageIndex] = useState(0);
  // 非全屏图片区域的触摸滑动状态
  const [postImageTouchStart, setPostImageTouchStart] = useState(0);
  // 是否首次加载评论
  const [hasLoadedComments, setHasLoadedComments] = useState(false);
  // 本地加热数字状态（用于实时显示+1）
  const [localHeatCount, setLocalHeatCount] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const commentsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const topInputRef = useRef<HTMLInputElement>(null);
  const { theme } = useThemeContext();
  const user = useAuthStore((state) => state.userInfo);

  const currentPost = posts[currentIndex];
  const images = currentPost?.images?.length ? currentPost.images : (currentPost?.coverImage ? [currentPost.coverImage] : []);
  const author = currentPost?.author || currentPost?.user || { username: '用户', avatar_url: '' };
  const faithTag = author.faith_tag || '寻求者';
  const postUserId = currentPost?.user_id || currentPost?.author?.id;
  
  // 获取加热数 — 使用本地状态 + 数据库值（本地状态用于实时显示+1）
  const heatCount = (localHeatCount > 0 ? localHeatCount : (currentPost.heat_count || 0));
  // 获取点赞数 — 兼容 likes_count 和 likes
  const likesCount = currentPost.likes_count ?? currentPost.likes ?? 0;
  // 获取评论数 — 优先使用实际加载的评论数量，兼容 comments_count 和 comments
  const commentsCount = comments.length || (currentPost.comments_count ?? currentPost.comments ?? 0);

  // ========== 问题8c/8d：加热状态持久化 - 按每天每篇记录 ==========
  const HEAT_KEY = 'of_heated_posts';
  const HEAT_EVER_KEY = 'of_heated_posts_ever'; // 永久记录（用于颜色持久化）

  // 获取今天加热数据
  const getHeatedPostsData = (): Record<string, { count: number; date: string }> => {
    try {
      const stored = localStorage.getItem(HEAT_KEY);
      const today = new Date().toISOString().split('T')[0];
      if (!stored) return {};
      const data = JSON.parse(stored);
      // 清理旧日期的数据
      const result: Record<string, { count: number; date: string }> = {};
      for (const [postId, info] of Object.entries(data)) {
        const item = info as { count: number; date: string };
        if (item.date === today) {
          result[postId] = item;
        }
      }
      return result;
    } catch { return {}; }
  };

  // 获取曾经加热过的笔记（永久记录，用于颜色持久化）
  const getEverHeatedPosts = (): Set<string> => {
    try {
      const stored = localStorage.getItem(HEAT_EVER_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  };

  // 标记笔记为曾加热过（永久记录）
  const markPostEverHeated = (postId: string) => {
    const heatedSet = getEverHeatedPosts();
    heatedSet.add(postId);
    localStorage.setItem(HEAT_EVER_KEY, JSON.stringify([...heatedSet]));
  };

  // 检查笔记是否曾被加热过（用于颜色持久化）
  const isEverHeated = (postId: string): boolean => {
    return getEverHeatedPosts().has(postId);
  };

  const getHeatedInfo = (postId: string): { count: number; date: string } | null => {
    const data = getHeatedPostsData();
    return data[postId] || null;
  };
  const markPostHeated = (postId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const data = getHeatedPostsData();
    if (data[postId]) {
      data[postId].count += 1;
    } else {
      data[postId] = { count: 1, date: today };
    }
    localStorage.setItem(HEAT_KEY, JSON.stringify(data));
    // 同时标记为曾加热过（用于颜色持久化）
    markPostEverHeated(postId);
  };
  const isHeatedToday = (postId: string): boolean => {
    const info = getHeatedInfo(postId);
    return info !== null && info.count > 0;
  };
  // 加热状态：今天加热过 或 曾经加热过（用于颜色显示）
  const hasHeated = (postId: string): boolean => {
    return isHeatedToday(postId) || isEverHeated(postId);
  };
  const getHeatCountToday = (postId: string): number => {
    const info = getHeatedInfo(postId);
    return info?.count || 0;
  };

  // ========== 问题8c：收藏持久化（Supabase + localStorage 双写）==========
  const FAVORITES_KEY = 'of_favorites';
  const getFavorites = (): Set<string> => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  };

  // 同步写入 localStorage
  const syncFavoritesToLocal = (postIds: string[]) => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(postIds));
  };

  // 添加收藏（Supabase + localStorage 双写）
  const addFavorite = async (postId: string) => {
    const auth = useAuthStore.getState();
    const userId = auth.userInfo?.id;
    // 1. 写入 Supabase
    if (userId) {
      try {
        await fetch('/sb-api/rest/v1/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` },
          body: JSON.stringify({ user_id: userId, post_id: postId })
        });
      } catch (e) {
        console.error('[收藏] 写入Supabase失败:', e);
      }
    }
    // 2. 同步写入 localStorage（用于快速判断状态）
    const set = getFavorites();
    set.add(postId);
    syncFavoritesToLocal([...set]);
    
    // 3. 更新数据库中的收藏数
    fetch(`/sb-api/rest/v1/posts?id=eq.${postId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` },
      body: JSON.stringify({ favorites_count: (currentPost.favorites_count || 0) + 1 })
    }).catch(err => console.error('[Favorites] Failed to update favorites_count:', err));

    // 4. 收藏经验：收藏他人笔记 +1 经验（每日上限10）
    if (userId) {
      try {
        const today = new Date().toISOString().split('T')[0];
        const favExpKey = `fav_exp_${today}`;
        const favExp = JSON.parse(localStorage.getItem(favExpKey) || '{"count":0,"exp":0}');
        if (favExp.count < 10) {
          const res = await fetch(`/sb-api/rest/v1/profiles?user_id=eq.${userId}&select=experience,level,is_vip`, {
            headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` }
          });
          if (res.ok) {
            const profiles = await res.json();
            if (profiles?.[0]) {
              const p = profiles[0];
              const multiplier = p.is_vip ? 2 : 1;
              const expToAdd = 1 * multiplier;
              const newExp = (p.experience || 0) + expToAdd;
              const newLevel = Math.floor(newExp / 1000) + 1;
              console.log('[收藏经验] 开始更新, userId:', userId, 'oldExp:', p.experience, 'newExp:', newExp, 'level:', newLevel);
              const updateRes = await fetch(`/sb-api/rest/v1/profiles?user_id=eq.${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` },
                body: JSON.stringify({ experience: newExp, level: newLevel }),
              });
              if (updateRes.ok) {
                console.log('[收藏经验] 更新成功, newExp:', newExp);
                favExp.count += 1;
                favExp.exp += expToAdd;
                localStorage.setItem(favExpKey, JSON.stringify(favExp));
              } else {
                console.error('[收藏经验] PATCH失败, status:', updateRes.status);
              }
            } else {
              console.error('[收藏经验] 未找到profile, userId:', userId);
            }
          } else {
            console.error('[收藏经验] 查询profile失败, status:', res.status);
          }
        } else {
          console.log('[收藏经验] 今日已达上限10次');
        }
      } catch (e) {
        console.error('[收藏经验] 更新失败:', e);
      }
    }
  };

  // 取消收藏（Supabase + localStorage 双写）
  const removeFavorite = async (postId: string) => {
    const auth = useAuthStore.getState();
    const userId = auth.userInfo?.id;
    // 1. 从 Supabase 删除
    if (userId) {
      try {
        await fetch(`/sb-api/rest/v1/favorites?user_id=eq.${userId}&post_id=eq.${postId}`, {
          method: 'DELETE',
          headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` }
        });
      } catch (e) {
        console.error('[收藏] 从Supabase删除失败:', e);
      }
    }
    // 2. 从 localStorage 删除
    const set = getFavorites();
    set.delete(postId);
    syncFavoritesToLocal([...set]);
    
    // 3. 更新数据库中的收藏数（扣减）
    fetch(`/sb-api/rest/v1/posts?id=eq.${postId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` },
      body: JSON.stringify({ favorites_count: Math.max(0, (currentPost.favorites_count || 0) - 1) })
    }).catch(err => console.error('[Favorites] Failed to update favorites_count:', err));
  };

  // 重置点赞/加热/收藏状态
  // 【修复】依赖 currentPost?.id 确保每次打开不同帖子时正确初始化
  useEffect(() => {
    const postId = currentPost?.id;
    console.log('[状态初始化] useEffect triggered, postId:', postId, 'currentIndex:', currentIndex);
    
    setIsLiked(false);
    // 加热状态：今天加热过 或 曾经加热过（颜色持久化不受日期限制）
    const heated = postId ? hasHeated(postId) : false;
    console.log('[状态初始化] 加热状态:', heated, 'postId:', postId);
    setIsHeated(heated);
    
    // 初始化本地加热数字（如果今天加热过则+1）
    if (postId && isHeatedToday(postId)) {
      setLocalHeatCount((currentPost.heat_count || 0) + 1);
    } else {
      setLocalHeatCount(0);
    }
    
    // 【修复】收藏状态：从 Supabase 查询 + localStorage 双保险
    const initFavoriteState = async () => {
      const localFav = postId ? getFavorites().has(postId) : false;
      console.log('[状态初始化] localStorage 收藏状态:', localFav, 'postId:', postId);
      
      // 从 Supabase 查询真实状态
      const userId = useAuthStore.getState().userInfo?.id;
      if (userId && postId) {
        try {
          const res = await fetch(
            `/sb-api/rest/v1/favorites?user_id=eq.${userId}&post_id=eq.${postId}&select=id`,
            { headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` } }
          );
          if (res.ok) {
            const data = await res.json();
            const isFav = Array.isArray(data) && data.length > 0;
            console.log('[状态初始化] Supabase 收藏状态:', isFav, 'data:', data);
            setIsFavorited(isFav);
            return; // 以 Supabase 为准
          }
        } catch (e) {
          console.error('[状态初始化] 查询收藏状态失败:', e);
        }
      }
      // fallback 到 localStorage
      setIsFavorited(localFav);
    };
    initFavoriteState();
    
    setShowComments(false);
    // 重置评论状态 - 但不重置 hasLoadedComments，让它根据帖子ID判断
    setNewComment('');
    setShowEmojiPicker(false);
    setReplyTo(null);
    setCollapsedReplies({});
    setExpandedReplyUsers({});
    setFullscreenImage(null);
    setPostImageModal(false);
    setPostImageIndex(0);
    
    // ========== 浏览计数：首次打开笔记时 +1（24小时防刷）==========
    if (postId) {
      const viewedKey = `of_viewed_${postId}`;
      const lastViewed = localStorage.getItem(viewedKey);
      const now = Date.now();
      if (!lastViewed || now - parseInt(lastViewed) > 24 * 60 * 60 * 1000) {
        // 记录浏览时间
        localStorage.setItem(viewedKey, String(now));
        // 更新数据库中的浏览数
        fetch(`/sb-api/rest/v1/posts?id=eq.${postId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` },
          body: JSON.stringify({ views_count: (currentPost.views_count || 0) + 1 })
        }).catch(err => console.error('[Views] Failed to update views_count:', err));
      }
    }
  }, [currentIndex, currentPost?.id]);

  // 加载评论 - 只在首次打开时加载一次
  useEffect(() => {
    if (currentPost?.id && !hasLoadedComments) {
      loadComments();
    }
  }, [currentPost?.id]);

  // 切换帖子时重置评论数据
  useEffect(() => {
    // 每次切换帖子ID时，重置评论列表
    setComments([]);
    setHasLoadedComments(false);
  }, [currentPost?.id]);

  // 加载评论（使用缓存）- 一次关联查询获取 comments + profiles
  // 排序改为最新在前
  const loadComments = async () => {
    if (!currentPost?.id) return;
    setLoadingComments(true);
    try {
      const headers = {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      };

      // 并行请求 comments 和 profiles（解决 Supabase 无外键约束导致的 PGRST200 错误）
      // 修改：order=created_at.desc 最新在前
      const [commentsData, profilesData] = await Promise.all([
        cachedFetch(`/sb-api/rest/v1/comments?post_id=eq.${currentPost.id}&select=*&order=created_at.desc&limit=200`, { headers }, { ttl: 30000 }),
        cachedFetch('/sb-api/rest/v1/profiles?select=user_id,username,avatar_url', { headers }, { ttl: 300000 })
      ]);

      if (!Array.isArray(commentsData) || commentsData.length === 0) {
        setComments([]);
        setLoadingComments(false);
        setHasLoadedComments(true);
        return;
      }

      // 构建 profiles 映射并合并数据
      const profilesMap: Record<string, { username: string; avatar_url: string }> = {};
      if (Array.isArray(profilesData)) {
        profilesData.forEach((p: any) => { profilesMap[p.user_id] = p; });
      }

      const mergedComments = commentsData.map((comment: any) => ({
        ...comment,
        profiles: profilesMap[comment.user_id] || { username: '用户', avatar_url: '' }
      }));

      setComments(mergedComments);
      setHasLoadedComments(true);
      // 重置折叠状态
      setCollapsedReplies({});
      setExpandedReplyUsers({});
    } catch (err) {
      console.error('Failed to load comments:', err);
      setComments([]);
      setHasLoadedComments(true);
    }
    setLoadingComments(false);
  };

  // 获取顶级评论（parent_id 为 null）
  const topLevelComments = comments.filter(c => !c.parent_id);
  // 获取回复列表（parent_id 不为 null）
  const replies = comments.filter(c => c.parent_id);

  // 按 parent_id 分组回复
  const repliesByParent = replies.reduce((acc, reply) => {
    const parentId = reply.parent_id;
    if (!acc[parentId]) {
      acc[parentId] = [];
    }
    acc[parentId].push(reply);
    return acc;
  }, {} as Record<string, Comment[]>);

  // 排序回复（按时间倒序 - 最新在前）
  Object.keys(repliesByParent).forEach(parentId => {
    repliesByParent[parentId].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  });

  // 判断回复是否应该展开显示（给笔记作者的回复或笔记作者的回复全部展开）
  const shouldShowAllReplies = (parentComment: Comment): boolean => {
    // 如果回复者是笔记作者，展开
    if (parentComment.user_id === postUserId) {
      return true;
    }
    // 如果回复的目标是笔记作者，展开
    if (parentComment.profiles?.username === author.username) {
      return true;
    }
    return false;
  };

  // 判断某个回复是否需要折叠（普通用户的回复折叠显示最新3条）
  const shouldCollapseReply = (reply: Comment, parentComment: Comment): boolean => {
    // 笔记作者或回复给笔记作者的回复不折叠
    if (shouldShowAllReplies(parentComment)) {
      return false;
    }
    return true;
  };

  // 获取需要折叠显示的回复（最新3条）
  const getVisibleReplies = (parentId: string): { visible: Comment[]; hidden: number } => {
    const parentComment = comments.find(c => c.id === parentId);
    const parentReplies = repliesByParent[parentId] || [];
    
    if (!parentComment || !shouldCollapseReply(parentReplies[0], parentComment)) {
      // 不需要折叠，全部显示
      return { visible: parentReplies, hidden: 0 };
    }
    
    // 折叠显示最新3条
    if (parentReplies.length <= 3) {
      return { visible: parentReplies, hidden: 0 };
    }
    
    const isCollapsed = collapsedReplies[parentId];
    if (isCollapsed) {
      // 折叠状态：只显示最新3条
      return { visible: parentReplies.slice(0, 3), hidden: parentReplies.length - 3 };
    } else {
      // 展开状态：显示全部
      return { visible: parentReplies, hidden: 0 };
    }
  };

  // 切换回复折叠状态
  const toggleRepliesCollapse = (parentId: string) => {
    setCollapsedReplies(prev => ({
      ...prev,
      [parentId]: !prev[parentId]
    }));
  };

  // 点击回复按钮
  const handleReplyClick = (commentId: string, username: string) => {
    setReplyTo({ commentId, username });
    setNewComment(`回复 @${username}：`);
    // 聚焦到上方输入框
    setTimeout(() => {
      topInputRef.current?.focus();
      // 将光标移到冒号后面
      if (topInputRef.current) {
        const len = topInputRef.current.value.length;
        topInputRef.current.setSelectionRange(len, len);
      }
      // 滚动到输入框
      document.getElementById('top-comment-input')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  // 取消回复
  const handleCancelReply = () => {
    setReplyTo(null);
    setNewComment('');
  };

  // 删除评论
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('确定要删除这条评论吗？')) return;
    
    try {
      const response = await fetch(`/sb-api/rest/v1/comments?id=eq.${commentId}`, {
        method: 'DELETE',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        }
      });
      
      if (response.ok) {
        // 找出该评论及其所有回复的ID
        const commentsToRemove = new Set<string>([commentId]);
        
        // 找出该评论的所有回复
        comments.forEach(c => {
          if (c.parent_id === commentId) {
            commentsToRemove.add(c.id);
          }
        });
        
        // 从列表中移除
        setComments(prev => prev.filter(c => !commentsToRemove.has(c.id)));
        
        // 更新评论数
        const newCount = Math.max(0, (currentPost.comments_count || 0) - commentsToRemove.size);
        await fetch(`/sb-api/rest/v1/posts?id=eq.${currentPost.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ comments_count: newCount })
        });
        
        console.log('[Comment] Deleted comment and', commentsToRemove.size - 1, 'replies');
      }
    } catch (err) {
      console.error('[Comment] Failed to delete comment:', err);
      alert('删除失败，请重试');
    }
  };

  // 提交评论 - 实时显示，不全量重载
  const handleSubmitComment = async (content?: string) => {
    console.log('[Comment] handleSubmitComment called, content:', content, 'newComment:', newComment);
    const commentContent = content || newComment.trim();
    if (!commentContent) {
      console.log('[Comment] 内容为空，跳过');
      return;
    }
    
    // 多级 fallback 获取 userId
    const getUserId = (): string | null => {
      if (user?.id) return user.id;
      const authState = useAuthStore.getState();
      if (authState.userInfo?.id) return authState.userInfo.id;
      try {
        const savedUser = localStorage.getItem('user_info');
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          if (parsed?.id) return parsed.id;
        }
      } catch {}
      return null;
    };
    
    const userId = getUserId();
    console.log('[Comment] userId:', userId, 'postId:', currentPost?.id, 'user from state:', user);
    
    if (!userId || !currentPost?.id) {
      console.error('[Comment] 缺少用户ID或帖子ID', { userId, postId: currentPost?.id });
      alert('请先登录后再评论');
      return;
    }
    
    try {
      const requestBody: Record<string, any> = {
        post_id: currentPost.id,
        user_id: userId,
        content: commentContent,
        status: 'published',
      };
      
      // 如果是回复，带上 parent_id
      if (replyTo) {
        requestBody.parent_id = replyTo.commentId;
        console.log('[Comment] 这是回复，parent_id:', replyTo.commentId);
      }
      
      console.log('[Comment] 发送请求:', JSON.stringify(requestBody));
      
      const response = await fetch('/sb-api/rest/v1/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('[Comment] 响应状态:', response.status, response.statusText);
      
      if (response.ok) {
        const responseData = await response.json();
        console.log('[Comment] 提交成功:', responseData);
        
        // 清空输入框和回复状态
        setNewComment('');
        setReplyTo(null);
        setShowEmojiPicker(false);
        
        // ========== 关键修改：直接添加到评论列表，不调用 loadComments ==========
        // 构建新评论对象，使用当前用户信息填充 profiles
        const newCommentObj: Comment = {
          id: responseData?.[0]?.id || `temp_${Date.now()}`,
          content: commentContent,
          created_at: new Date().toISOString(),
          user_id: userId,
          parent_id: replyTo?.commentId || null,
          post_id: currentPost.id,
          profiles: {
            username: user?.username || user?.nickname || localStorage.getItem('user_username') || '我',
            avatar_url: user?.avatar_url || user?.avatar || '',
          }
        };
        
        // 将新评论 unshift 到数组前面（最新在前）
        setComments(prev => [newCommentObj, ...prev]);
        // ================================================================
        
        // 更新帖子评论数
        try {
          const newCount = (currentPost.comments_count || 0) + 1;
          await fetch(`/sb-api/rest/v1/posts?id=eq.${currentPost.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({ comments_count: newCount })
          });
        } catch (e) {
          console.error('[Comment] Failed to update comments_count:', e);
        }
        // 发表评论经验值（+2）
        await addCommentExperience(userId, 'made');
        // 给作者增加收到评论的经验值（+1）
        const postUserIdFromPost = currentPost.user_id || currentPost.author?.id;
        if (postUserIdFromPost && postUserIdFromPost !== userId) {
          await addCommentExperience(postUserIdFromPost, 'received');
        }

      } else {
        const errorText = await response.text();
        console.error('[Comment] 提交失败:', response.status, errorText);
        alert('评论失败，请重试');
      }
    } catch (err) {
      console.error('[Comment] 网络错误:', err);
      alert('网络异常，请重试');
    }
  };

  // 添加评论经验值（发表评论：+2，收到评论：+1）
  const addCommentExperience = async (userId: string, type: 'made' | 'received') => {
    try {
      const userInfo = localStorage.getItem('user_info');
      if (!userInfo) return;

      const parsed = JSON.parse(userInfo);
      const profileId = parsed.id || userId;
      const key = type === 'made' ? 'comment_made' : 'comment_received';
      const baseAmount = type === 'made' ? 2 : 1;
      const maxLimit = type === 'made' ? MAX_COMMENT_MADE : MAX_COMMENT_RECEIVED;

      // 检查每日上限
      const stats = getTodayStats();
      if ((stats[key] || 0) >= maxLimit) {
        console.log(`[Comment] 今日${key}已达上限(${stats[key]}/${maxLimit})`);
        return;
      }

      // 获取当前 profile 数据
      const response = await fetch(
        `/sb-api/rest/v1/profiles?user_id=eq.${profileId}&select=experience,level,is_vip`,
        {
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const profile = data[0];
          const multiplier = profile.is_vip ? VIP_MULTIPLIER : 1;
          const expAmount = Math.ceil(baseAmount * multiplier);
          const newExp = (profile.experience || 0) + expAmount;
          const newLevel = calculateLevel(newExp);

          console.log(`[经验] 开始更新 ${key}, userId:`, profileId, 'oldExp:', profile.experience, 'newExp:', newExp);
          const updateRes = await fetch(
            `/sb-api/rest/v1/profiles?user_id=eq.${profileId}`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
              },
              body: JSON.stringify({
                experience: newExp,
                level: newLevel,
              }),
            }
          );

          if (updateRes.ok) {
            // 更新每日统计
            stats[key] = (stats[key] || 0) + 1;
            saveTodayStats(stats);
            console.log(`[经验] ${key} 更新成功, newExp:`, newExp);
          } else {
            console.error(`[经验] ${key} PATCH失败, status:`, updateRes.status);
          }
        } else {
          console.error(`[经验] 未找到profile, userId:`, profileId);
        }
      } else {
        console.error(`[经验] 查询profile失败, status:`, response.status);
      }
    } catch (err) {
      console.error('[经验] addExperience error:', err);
    }
  };

  // 表情评论 - 插入到输入框而非直接提交
  const handleEmojiClick = (emoji: string) => {
    setNewComment(prev => prev + emoji);
  };

  // 图片评论
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        // 存储格式：[img]base64data
        const imageContent = `[img]${base64}`;
        await handleSubmitComment(imageContent);
      }
    };
    reader.readAsDataURL(file);
    
    // 清空input以便再次选择同一张图片
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 语音评论
  const handleVoiceComment = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('您的浏览器不支持语音识别功能');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'zh-CN';

    setIsRecording(true);
    
    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsRecording(false);
      if (transcript) {
        await handleSubmitComment(`🎤${transcript}`);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      if (event.error !== 'no-speech') {
        alert('语音识别出错，请重试');
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  // 处理双击点赞
  const handleDoubleClick = () => {
    if (!isLiked) {
      setIsLiked(true);
      setShowLikeAnimation(true);
      setTimeout(() => setShowLikeAnimation(false), 1000);
      onLike?.(currentPost.id);
    }
  };

  // 处理滑动切换
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    const diff = touchStart - touchEnd;
    const threshold = 100;

    if (Math.abs(diff) > threshold) {
      if (diff > 0 && currentIndex < posts.length - 1) {
        // 向左滑，下一篇
        setCurrentIndex(currentIndex + 1);
      } else if (diff < 0 && currentIndex > 0) {
        // 向右滑，上一篇
        setCurrentIndex(currentIndex - 1);
      }
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < posts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    onLike?.(currentPost.id);
  };

  // 问题五：游客登录检查辅助函数 - 使用 store.getState() 获取实时状态
  const requireLogin = () => {
    // 直接从 store 获取实时状态，避免 useAuthStore() 解构的延迟问题
    const auth = useAuthStore.getState();
    const token = auth.currentToken();
    const userId = auth.userInfo?.id;
    if (!token || !userId) {
      window.location.hash = '/login';
      return false;
    }
    return true;
  };

  const handleHeat = async () => {
    if (!requireLogin()) return;
    
    // 问题8d：检查今日该笔记已加热次数
    const todayCount = getHeatCountToday(currentPost.id);
    if (todayCount >= MAX_HEAT_PER_POST_PER_DAY) {
      alert(`今日该笔记加热次数已达上限（${MAX_HEAT_PER_POST_PER_DAY}次）`);
      return;
    }
    
    // 立即更新本地状态（颜色和数字）
    setIsHeated(true);
    setLocalHeatCount(prev => prev + 1);
    markPostHeated(currentPost.id);
    const postUserIdValue = currentPost.user_id || currentPost.author?.id;
    const stats = getTodayStats();
    
    // 问题8d：每次加热消耗1热点
    const myUserId = useAuthStore.getState().userInfo?.id;
    if (myUserId) {
      try {
        const profileRes = await fetch(
          `/sb-api/rest/v1/profiles?user_id=eq.${myUserId}&select=hot_points`,
          { headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` } }
        );
        if (profileRes.ok) {
          const profiles = await profileRes.json();
          if (profiles?.length > 0 && profiles[0].hot_points > 0) {
            await fetch(
              `/sb-api/rest/v1/profiles?user_id=eq.${myUserId}`,
              {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` },
                body: JSON.stringify({ hot_points: profiles[0].hot_points - 1 })
              }
            );
          }
        }
      } catch (err) {
        console.error('[Heat] Failed to deduct hot_points:', err);
      }
    }
    
    // 调用 API 增加加热数
    try {
      await fetch(`/sb-api/rest/v1/posts?id=eq.${currentPost.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          heat_count: (heatCount || 0) + 1,
        })
      });

      // 给笔记作者增加经验值（被加热 +3，每日上限500）
      // 注意：被加热不增加作者的热点(hot_points)，热点只来自每日登录和等级权益
      if (postUserIdValue) {
        await fetch(`/sb-api/rest/v1/profiles?user_id=eq.${postUserIdValue}&select=user_id,experience,level,is_vip`, {
          method: 'GET',
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          }
        }).then(async (res) => {
          if (res.ok) {
            const authorProfiles = await res.json();
            if (authorProfiles && authorProfiles.length > 0) {
              const authorProfile = authorProfiles[0];
              const authorStats = getTodayStats();
              if ((authorStats.heat_received || 0) < MAX_HEAT_RECEIVED) {
                const multiplier = authorProfile.is_vip ? VIP_MULTIPLIER : 1;
                const expAmount = Math.ceil(3 * multiplier);
                const newExp = (authorProfile.experience || 0) + expAmount;
                const newLevel = calculateLevel(newExp);
                
                console.log('[加热] 作者获得经验, userId:', postUserIdValue, 'oldExp:', authorProfile.experience, 'newExp:', newExp);
                const authorUpdateRes = await fetch(`/sb-api/rest/v1/profiles?user_id=eq.${postUserIdValue}`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    'apikey': SERVICE_ROLE_KEY,
                    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                  },
                  body: JSON.stringify({
                    experience: newExp,
                    level: newLevel,
                  })
                });
                
                if (authorUpdateRes.ok) {
                  // 更新作者每日统计
                  authorStats.heat_received = (authorStats.heat_received || 0) + 1;
                  saveTodayStats(authorStats);
                  console.log('[加热] 作者经验更新成功, newExp:', newExp);
                } else {
                  console.error('[加热] 作者经验PATCH失败, status:', authorUpdateRes.status);
                }
              }
            } else {
              console.error('[加热] 未找到作者profile, userId:', postUserIdValue);
            }
          } else {
            console.error('[加热] 查询作者profile失败, status:', res.status);
          }
        });
      }

      // 给操作者（自己）增加经验值（加热他人 +1，每日上限10）
      if (myUserId) {
        await fetch(`/sb-api/rest/v1/profiles?user_id=eq.${myUserId}&select=experience,level,is_vip`, {
          headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` }
        }).then(async (res) => {
          if (res.ok) {
            const myProfiles = await res.json();
            if (myProfiles?.length > 0) {
              const myProfile = myProfiles[0];
              const myStats = getTodayStats();
              if ((myStats.heat_given || 0) < MAX_HEAT_GIVEN) {
                const multiplier = myProfile.is_vip ? VIP_MULTIPLIER : 1;
                const expAmount = Math.ceil(1 * multiplier);
                const newExp = (myProfile.experience || 0) + expAmount;
                const newLevel = calculateLevel(newExp);
                
                console.log('[加热] 操作者获得经验, userId:', myUserId, 'oldExp:', myProfile.experience, 'newExp:', newExp);
                const myUpdateRes = await fetch(`/sb-api/rest/v1/profiles?user_id=eq.${myUserId}`, {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                    'apikey': SERVICE_ROLE_KEY,
                    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                  },
                  body: JSON.stringify({
                    experience: newExp,
                    level: newLevel,
                  })
                });
                
                if (myUpdateRes.ok) {
                  // 更新操作者每日统计
                  myStats.heat_given = (myStats.heat_given || 0) + 1;
                  saveTodayStats(myStats);
                  console.log('[加热] 操作者经验更新成功, newExp:', newExp);
                } else {
                  console.error('[加热] 操作者经验PATCH失败, status:', myUpdateRes.status);
                }
              }
            } else {
              console.error('[加热] 未找到操作者profile, userId:', myUserId);
            }
          } else {
            console.error('[加热] 查询操作者profile失败, status:', res.status);
          }
        });
      }
    } catch (err) {
      console.error('Failed to heat post:', err);
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/post/${currentPost.id}`;
    
    // ========== 分享计数：分享时 +1（同一用户同一笔记每天只计一次）==========
    const sharedKey = `of_shared_${currentPost.id}_${new Date().toISOString().split('T')[0]}`;
    const lastShared = localStorage.getItem(sharedKey);
    if (!lastShared) {
      localStorage.setItem(sharedKey, '1');
      // 更新数据库中的分享数
      fetch(`/sb-api/rest/v1/posts?id=eq.${currentPost.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` },
        body: JSON.stringify({ shares_count: (currentPost.shares_count || 0) + 1 })
      }).catch(err => console.error('[Shares] Failed to update shares_count:', err));
    }
    
    if (navigator.share) {
      navigator.share({
        title: currentPost.title,
        text: currentPost.content?.slice(0, 100) || '',
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('链接已复制到剪贴板');
    }
  };

  // 滚动到上方输入框
  const scrollToTopInput = () => {
    const inputEl = document.getElementById('top-comment-input');
    if (inputEl) {
      inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => {
        topInputRef.current?.focus();
      }, 300);
    }
  };

  // 渲染评论内容（支持图片，点击查看大图）
  const renderCommentContent = (content: string) => {
    if (content.startsWith('[img]')) {
      const base64 = content.slice(5);
      return (
        <div className="mt-1">
          <img 
            src={base64} 
            alt="评论图片" 
            className="max-w-[200px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              setFullscreenImage(base64);
            }}
          />
        </div>
      );
    }
    // 检查是否包含 markdown 图片语法 ![alt](url)
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    const images: { alt: string; url: string }[] = [];
    let match;
    while ((match = imageRegex.exec(content)) !== null) {
      images.push({ alt: match[1], url: match[2] });
    }
    
    if (images.length > 0) {
      // 替换图片为可点击的缩略图
      let processedContent = content;
      images.forEach((img, idx) => {
        processedContent = processedContent.replace(
          `![${img.alt}](${img.url})`,
          `<div class="inline-block mt-1"><img src="${img.url}" alt="${img.alt}" class="max-w-[200px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity" data-comment-img="${idx}" /></div>`
        );
      });
      return (
        <div 
          className="text-sm text-gray-600 mt-1 [&>img]:cursor-pointer [&>img]:hover:opacity-90"
          dangerouslySetInnerHTML={{ __html: processedContent }}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'IMG' && target.dataset.commentImg !== undefined) {
              e.stopPropagation();
              setFullscreenImage(target.src);
            }
          }}
        />
      );
    }
    
    return <p className="text-sm text-gray-600 mt-1">{content}</p>;
  };

  // 渲染单条评论（包含回复按钮和删除按钮）
  const renderCommentItem = (comment: Comment, isReply: boolean = false) => {
    const isOwner = user?.id === comment.user_id;
    const username = comment.profiles?.username || '用户';
    const avatarUrl = comment.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.user_id}`;
    
    return (
      <div key={comment.id} className={`flex gap-2 ${isReply ? 'mt-2' : ''}`}>
        <button 
          onClick={() => navigate(`/profile/${comment.user_id}`)}
          className={`${isReply ? 'w-6 h-6' : 'w-8 h-8'} rounded-full object-cover flex-shrink-0 overflow-hidden`}
        >
          <img
            src={avatarUrl}
            alt=""
            className={`${isReply ? 'w-6 h-6' : 'w-8 h-8'} rounded-full object-cover`}
          />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`${isReply ? 'text-xs' : 'text-sm'} font-medium text-gray-900`}>
              {username}
            </span>
            {comment.user_id === postUserId && (
              <span className="px-1 py-0.5 bg-[#E11D48] text-white text-[10px] rounded">作者</span>
            )}
            <span className={`text-xs text-gray-400 ${isReply ? '' : ''}`}>
              {new Date(comment.created_at).toLocaleDateString()}
            </span>
          </div>
          {renderCommentContent(comment.content)}
          {!isReply && (
            <div className="flex items-center gap-3 mt-1">
              <button 
                onClick={() => handleReplyClick(comment.id, username)}
                className="text-xs text-gray-500 hover:text-[#E11D48]"
              >
                回复
              </button>
              {isOwner && (
                <button 
                  onClick={() => handleDeleteComment(comment.id)}
                  className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  删除
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 渲染回复列表
  const renderReplies = (parentId: string) => {
    const parentComment = comments.find(c => c.id === parentId);
    const { visible, hidden } = getVisibleReplies(parentId);
    const isCollapsed = collapsedReplies[parentId];
    
    if (visible.length === 0) return null;
    
    return (
      <div className="ml-6 pl-3 border-l-2 border-gray-100 mt-2">
        {visible.map(reply => renderCommentItem(reply, true))}
        {hidden > 0 && (
          <button 
            onClick={() => toggleRepliesCollapse(parentId)}
            className="text-xs text-[#E11D48] mt-2 flex items-center gap-1"
          >
            {isCollapsed ? (
              <>
                <ChevronDown className="w-3 h-3" />
                查看全部 {visible.length + hidden} 条回复
              </>
            ) : (
              <>
                <ChevronUp className="w-3 h-3" />
                收起
              </>
            )}
          </button>
        )}
      </div>
    );
  };

  // 主色值
  const primaryColor = '#E11D48';

  if (!currentPost) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col">
      {/* 评论图片查看器 */}
      {fullscreenImage && (
        <CommentImageViewer 
          src={fullscreenImage} 
          onClose={() => setFullscreenImage(null)} 
        />
      )}

      {/* 笔记图片全屏查看器 */}
      {postImageModal && images.length > 0 && (
        <PostImageViewer
          images={images}
          initialIndex={postImageIndex}
          onClose={() => setPostImageModal(false)}
        />
      )}
      
      {/* 顶部导航栏 */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
        >
          <ChevronLeft className="w-6 h-6 text-gray-700" />
        </button>
        <div className="flex gap-2">
          <span className="text-gray-600 text-sm">
            {currentIndex + 1} / {posts.length}
          </span>
        </div>
        <button 
          onClick={handleShare}
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
        >
          <Share2 className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* 可滚动内容：图片+详情+评论+输入框 */}
      <div className="flex-1 overflow-y-auto pb-20">
        {/* 图片 - 支持触摸滑动切换和点击放大 */}
        {images.length > 0 && (
          <div className="w-full">
            <div
              className="w-full select-none"
              onTouchStart={(e) => {
                if (images.length > 1) {
                  setPostImageTouchStart(e.touches[0].clientX);
                }
              }}
              onTouchEnd={(e) => {
                if (images.length > 1) {
                  const deltaX = e.changedTouches[0].clientX - postImageTouchStart;
                  if (deltaX > 50 && postImageIndex > 0) {
                    setPostImageIndex(prev => prev - 1);
                  } else if (deltaX < -50 && postImageIndex < images.length - 1) {
                    setPostImageIndex(prev => prev + 1);
                  }
                }
              }}
            >
              <img
                src={images[postImageIndex] || images[0]}
                alt=""
                className="w-full h-auto object-contain"
                onClick={() => {
                  setPostImageIndex(postImageIndex);
                  setPostImageModal(true);
                }}
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/300/400'; }}
              />
            </div>
            {/* 多图圆点指示器 */}
            {images.length > 1 && (
              <div className="flex justify-center gap-1.5 py-2">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setPostImageIndex(idx)}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      idx === postImageIndex
                        ? 'bg-[#E11D48] w-3'
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                    aria-label={`查看第 ${idx + 1} 张图片`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 详情+评论区 - 紧贴图片下方 */}
        <div className="bg-white p-4">
          {/* 作者信息 */}
          <div className="flex items-center gap-3 mb-3">
            <button 
              onClick={() => navigate(`/profile/${postUserId}`)}
              className="w-10 h-10 rounded-full object-cover overflow-hidden"
            >
              <img
                src={author.avatar_url || author.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${author.username}`}
                alt=""
                className="w-10 h-10 rounded-full object-cover"
              />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-900">{author.username || author.nickname}</p>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full">{faithTag}</span>
              </div>
              <p className="text-xs text-gray-500">
                {currentPost.created_at ? new Date(currentPost.created_at).toLocaleDateString() : ''}
              </p>
            </div>
            <button className="px-4 py-1.5 bg-[#E11D48] text-white text-sm rounded-full">
              + 关注
            </button>
          </div>

          {/* 标题 */}
          <h2 className="text-lg font-semibold text-gray-900 mb-2">{currentPost.title}</h2>

          {/* 内容 */}
          {currentPost.content && (
            <p className="text-sm text-gray-600 mb-3">{currentPost.content}</p>
          )}

          {/* 标签 */}
          {currentPost.tags && currentPost.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {currentPost.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}



          {/* 分隔线 + 评论标题 */}
          <div className="border-t border-gray-100 pt-3 mt-3">
            <p id="comment-section" className="text-sm font-medium text-gray-700 mb-3">
              评论 {topLevelComments.length > 0 ? topLevelComments.length : ''}
            </p>
          </div>

          {/* 评论列表 */}
          {loadingComments ? (
            <div className="text-center py-4 text-gray-400 text-sm">加载评论中...</div>
          ) : topLevelComments.length === 0 ? (
            <div className="text-center py-4 text-gray-400 text-sm">暂无评论，快来抢沙发</div>
          ) : (
            <div className="space-y-4">
              {topLevelComments.map((comment) => (
                <div key={comment.id}>
                  {renderCommentItem(comment)}
                  {/* 渲染回复列表 */}
                  {renderReplies(comment.id)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========== 底部固定栏：输入框 + 操作按钮 ========== */}
      <div 
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50"
        style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom))' }}
      >
        {/* 表情选择器 - 简笔画风格主题色 */}
        {showEmojiPicker && (
          <div className="flex flex-wrap gap-1 p-2 bg-gray-50 max-h-[120px] overflow-y-auto border-b border-gray-100">
            {EMOJI_ICONS.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleEmojiClick(item.emoji)}
                className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded transition-colors"
                style={{ color: '#E11D48' }}
              >
                {item.icon}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 px-2 py-1.5">
          {user ? (
            <>
              {/* 语音按钮 - 在输入框外部最左边 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleVoiceComment();
                }}
                className={`flex-shrink-0 ${isRecording ? 'text-red-500' : 'text-gray-500'}`}
                title="语音"
              >
                <Mic className="w-5 h-5" />
              </button>
              {/* 输入框 */}
              <div className="flex-1 flex items-center gap-1 bg-gray-100 rounded-full px-2 py-1.5">
                <input
                  ref={topInputRef}
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSubmitComment();
                    }
                  }}
                  placeholder={replyTo ? `回复 @${replyTo.username}` : "说点什么..."}
                  className="flex-1 bg-transparent text-sm outline-none min-w-0"
                  style={{ WebkitAppearance: 'none', appearance: 'none' }}
                />
                <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageUpload} className="hidden" />
                <button onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }} title="图片" className="text-gray-400 flex-shrink-0">
                  <Image className="w-4 h-4" />
                </button>
                {newComment.trim() && (
                  <button onClick={(e) => { e.stopPropagation(); handleSubmitComment(); }} className="text-[#E11D48] flex-shrink-0">
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </div>
              {/* 表情按钮 - 在输入框外部右边 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEmojiPicker(!showEmojiPicker);
                }}
                className={`flex-shrink-0 ${showEmojiPicker ? 'text-[#E11D48]' : 'text-gray-500'}`}
                title="表情"
              >
                <Smile className="w-5 h-5" />
              </button>
              {/* 评论数 */}
              <button onClick={() => {
                document.getElementById('comment-section')?.scrollIntoView({ behavior: 'smooth' });
              }} className="flex flex-col items-center min-w-[36px]">
                <MessageCircle className="w-4 h-4 text-gray-500" />
                <span className="text-[9px] text-gray-400">{commentsCount}</span>
              </button>
              {/* 加热 */}
              <button onClick={handleHeat} className="flex flex-col items-center min-w-[36px]">
                <Flame className={`w-4 h-4 ${isHeated ? 'text-[#E11D48]' : 'text-gray-500'}`} />
                <span className={`text-[9px] ${isHeated ? 'text-[#E11D48]' : 'text-gray-400'}`}>{heatCount}</span>
              </button>
              {/* 收藏 */}
              <button 
                onClick={() => {
                  const newFav = !isFavorited;
                  setIsFavorited(newFav);
                  if (newFav) { addFavorite(currentPost.id); } else { removeFavorite(currentPost.id); }
                }} 
                className="flex flex-col items-center min-w-[36px]"
              >
                <Star className={`w-4 h-4 ${isFavorited ? 'text-yellow-500 fill-yellow-500' : 'text-gray-500'}`} />
                <span className={`text-[9px] ${isFavorited ? 'text-yellow-500' : 'text-gray-400'}`}>收藏</span>
              </button>
            </>
          ) : (
            <>
              <div 
                className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm text-gray-400 cursor-pointer"
                onClick={() => requireLogin()}
              >
                说点什么...
              </div>
              <button onClick={() => {}} className="flex flex-col items-center min-w-[36px]">
                <MessageCircle className="w-4 h-4 text-gray-500" />
                <span className="text-[9px] text-gray-400">{commentsCount}</span>
              </button>
              <button onClick={() => requireLogin()} className="flex flex-col items-center min-w-[36px]">
                <Flame className="w-4 h-4 text-gray-500" />
                <span className="text-[9px] text-gray-400">{heatCount}</span>
              </button>
              <button onClick={() => requireLogin()} className="flex flex-col items-center min-w-[36px]">
                <Star className="w-4 h-4 text-gray-500" />
                <span className="text-[9px] text-gray-400">收藏</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
