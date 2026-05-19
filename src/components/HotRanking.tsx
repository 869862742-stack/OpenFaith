import React, { useState, useEffect } from 'react';
import { Flame, ChevronRight, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '../contexts/ThemeContext';
import { cachedFetch } from '../utils/apiCache';
import { isGroupChat } from '../utils/postUtils';

const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';

interface HotPost {
  id: string;
  title: string;
  views_count?: number;
  heat_count?: number;
  comments_count?: number;
  shares_count?: number;
  favorites_count?: number;
  created_at?: string;
}

interface HotRankingProps {
  onPostClick?: (postId: string) => void;
}

// 排行榜时间 tab
const rankingTabs = [
  { id: 'day', label: '本日' },
  { id: 'week', label: '本周' },
  { id: 'month', label: '本月' },
  { id: 'year', label: '年度' },
  { id: 'all', label: '总榜' },
];

// ========== 热值计算公式 ==========
// 热值 = (浏览数×0.5) + (加热数×5) + (评论数×2) + (分享数×3) + (收藏数×2)
const calculateHotValue = (post: HotPost): number => {
  const views = post.views_count || 0;
  const heat = post.heat_count || 0;
  const comments = post.comments_count || 0;
  const shares = post.shares_count || 0;
  const favorites = post.favorites_count || 0;
  return (views * 0.5) + (heat * 5) + (comments * 2) + (shares * 3) + (favorites * 2);
};

// 热度格式化（抖音风格）
function formatHotValue(num: number): string {
  if (num < 10000) return String(Math.floor(num));
  const wan = num / 10000;
  if (wan < 10) {
    return wan % 1 === 0 ? `${wan}W` : `${wan.toFixed(1)}W`;
  }
  return `${Math.floor(wan)}W`;
}

// 指数衰减计算
// 衰减公式：最终热度 = 原始热度 × e^(-λ × 天数)
const applyDecay = (hotValue: number, daysAgo: number, lambda: number = 0.1): number => {
  return hotValue * Math.exp(-lambda * daysAgo);
};

// 计算距离今天的天数
const getDaysAgo = (createdAt: string): number => {
  const created = new Date(createdAt);
  const now = new Date();
  const diff = now.getTime() - created.getTime();
  return Math.max(0, diff / (1000 * 60 * 60 * 24));
};

function HotRanking({ onPostClick }: HotRankingProps) {
  const { t } = useTranslation();
  const { primaryColor } = useThemeContext();
  const [showRankingModal, setShowRankingModal] = useState(false);
  const [hotPosts, setHotPosts] = useState<HotPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('day');

  // 首页 top3 数据（总热度排行，不限时间）
  const [topPosts, setTopPosts] = useState<HotPost[]>([]);

  // 首页 top3 加载
  useEffect(() => {
    fetchTop3();
  }, []);

  const fetchTop3 = async () => {
    try {
      const url = '/sb-api/rest/v1/posts?status=eq.published&select=id,title,views_count,heat_count,comments_count,shares_count,favorites_count,created_at&order=heat_count.desc.nullslast&limit=20';
      const data = await cachedFetch(url, {
        headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` }
      });
      if (Array.isArray(data) && data.length > 0) {
        // 过滤掉群聊，只显示笔记
        const notesOnly = data.filter((p: any) => !isGroupChat(p));
        // 计算所有帖子的热值
        const postsWithHotValue = notesOnly.map((p: HotPost) => ({
          ...p,
          hotValue: calculateHotValue(p)
        }));
        // 按热值排序，取前10
        postsWithHotValue.sort((a: any, b: any) => b.hotValue - a.hotValue);
        setTopPosts(postsWithHotValue.slice(0, 10).filter((p: any) => p.hotValue > 0));
      }
    } catch { /* ignore */ }
  };

  // 弹窗数据加载
  useEffect(() => {
    if (showRankingModal) {
      fetchHotPosts();
    }
  }, [showRankingModal, activeTab]);

  // 根据时间范围获取开始日期
  const getStartDate = () => {
    const now = new Date();
    switch (activeTab) {
      case 'day':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return weekAgo.toISOString();
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return monthAgo.toISOString();
      case 'year':
        return new Date(now.getFullYear(), 0, 1).toISOString();
      case 'all':
      default:
        return null;
    }
  };

  const fetchHotPosts = async () => {
    setLoading(true);
    try {
      const startDate = getStartDate();
      let url = '/sb-api/rest/v1/posts?status=eq.published&select=id,title,views_count,heat_count,comments_count,shares_count,favorites_count,created_at&order=created_at.desc.nullslast&limit=50';
      
      // 弹窗内按时间 tab 过滤
      if (startDate) {
        url += `&created_at=gte.${startDate}`;
      }

      const data = await cachedFetch(url, {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        }
      });
      
      if (Array.isArray(data) && data.length > 0) {
        // 过滤掉群聊，只显示笔记
        const notesOnly = data.filter((p: any) => !isGroupChat(p));
        // 计算所有帖子的热值
        const postsWithHotValue = notesOnly.map((p: HotPost) => {
          const hotValue = calculateHotValue(p);
          const daysAgo = p.created_at ? getDaysAgo(p.created_at) : 0;
          
          // 根据时间维度应用衰减
          let finalHotValue = hotValue;
          if (activeTab === 'week' || activeTab === 'month') {
            // 本周/本月榜：指数衰减 λ=0.1
            finalHotValue = applyDecay(hotValue, daysAgo, 0.1);
          }
          // 今日/年度/总榜：不衰减
          
          return {
            ...p,
            hotValue: finalHotValue,
            originalHotValue: hotValue // 保存原始热值用于显示
          };
        });
        
        // 过滤掉热值为0的帖子，并按热值排序
        const filtered = postsWithHotValue
          .filter((p: any) => p.hotValue > 0)
          .sort((a: any, b: any) => b.hotValue - a.hotValue)
          .slice(0, 20);
        
        setHotPosts(filtered);
      } else {
        setHotPosts([]);
      }
    } catch {
      setHotPosts([]);
    }
    setLoading(false);
  };

  const top3 = topPosts.slice(0, 3);

  // 首页排行榜始终显示（有数据时）
  const showComponent = top3.length > 0;

  return (
    <>
      {showComponent && (
        <div
          className="mx-4 mb-4 rounded-xl p-4 theme-transition"
          style={{ backgroundColor: 'var(--theme-primary)' }}
        >
          {/* 标题区域 - 点击打开排行榜弹窗 */}
          <div 
            className="flex items-center justify-between mb-3 cursor-pointer"
            onClick={() => setShowRankingModal(true)}
          >
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-white" />
              <span className="font-semibold text-white">{t('home.hotRanking')}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-white/70" />
          </div>

          <div className="space-y-2">
            {top3.map((post: any, index: number) => (
              <div 
                key={post.id} 
                className="flex items-center gap-3 py-2 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onPostClick?.(post.id);
                }}
              >
                <span
                  className="w-5 h-5 flex items-center justify-center rounded text-xs font-bold text-white"
                  style={{ backgroundColor: index === 0 ? 'white' : index === 1 ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.6)', color: primaryColor }}
                >
                  {index + 1}
                </span>
                <span className="flex-1 text-sm text-white truncate">{post.title}</span>
                <span className="text-xs text-white/70">{formatHotValue(post.hotValue)}热度</span>
              </div>
            ))}
            {top3.length === 0 && loading && (
              <div className="py-2 text-sm text-white/70">加载中...</div>
            )}
          </div>
        </div>
      )}

      {showRankingModal && (
        <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowRankingModal(false)}>
          <div
            className="absolute top-0 left-0 right-0 bottom-0 theme-transition"
            style={{ backgroundColor: 'var(--bg-color)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="sticky top-0 px-4 py-3 border-b flex items-center justify-between z-10 theme-transition"
              style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)' }}
            >
              <button onClick={() => setShowRankingModal(false)}>
                <X className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
              </button>
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-color)' }}>{t('home.hotRanking')}</h3>
              <div className="w-5" />
            </div>

            {/* Tab 切换 */}
            <div className="px-4 py-3 border-b theme-transition" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-2 overflow-x-auto">
                {rankingTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
                    style={{
                      backgroundColor: activeTab === tab.id ? primaryColor : 'var(--bg-secondary)',
                      color: activeTab === tab.id ? '#FFFFFF' : 'var(--text-secondary)',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 pb-24 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
              {loading ? (
                <div className="text-center py-12">
                  <div className="w-6 h-6 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : hotPosts.length === 0 ? (
                <div className="text-center py-12">
                  <Flame className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-secondary)' }} />
                  <p style={{ color: 'var(--text-secondary)' }}>暂无热门内容</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {hotPosts.map((post: any, index: number) => (
                    <div
                      key={post.id}
                      className="flex items-center gap-3 p-3 rounded-xl theme-transition cursor-pointer"
                      style={{ backgroundColor: 'var(--bg-secondary)' }}
                      onClick={() => onPostClick?.(post.id)}
                    >
                      <span
                        className="w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold"
                        style={{
                          backgroundColor: index === 0 ? primaryColor : index === 1 ? `${primaryColor}cc` : index === 2 ? `${primaryColor}99` : 'var(--border-color)',
                          color: index < 3 ? '#FFFFFF' : 'var(--text-secondary)'
                        }}
                      >
                        {index + 1}
                      </span>
                      <span className="flex-1 text-sm" style={{ color: 'var(--text-color)' }}>{post.title}</span>
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{formatHotValue(post.hotValue)} 热度</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default HotRanking;
