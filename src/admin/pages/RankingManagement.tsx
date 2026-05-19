import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Flame,
  Trophy,
  TrendingUp,
  Users,
  FileText,
  Star,
  Clock,
  Download,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Search,
  Medal,
  Award,
  Crown,
  X,
} from 'lucide-react';
import { getSupabaseUrl } from '../supabase/client';

// Service Role Key - 绕过 RLS
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';

// 排行榜 Tab 类型
type RankingTabType = 'experience' | 'hot_points' | 'heat_count' | 'post_heat' | 'followers' | 'new_users';

// 时间筛选类型 - 与前台 HotRanking.tsx 保持一致
type TimeRange = 'day' | 'week' | 'month' | 'year' | 'all';

// Tab 配置
const tabConfig = [
  { id: 'experience' as RankingTabType, label: '经验值排行', icon: Trophy, color: 'text-yellow-500' },
  { id: 'hot_points' as RankingTabType, label: '热点排行', icon: Flame, color: 'text-orange-500' },
  { id: 'heat_count' as RankingTabType, label: '加热排行', icon: TrendingUp, color: 'text-red-500' },
  { id: 'post_heat' as RankingTabType, label: '笔记热度', icon: FileText, color: 'text-blue-500' },
  { id: 'followers' as RankingTabType, label: '粉丝排行', icon: Users, color: 'text-purple-500' },
  { id: 'new_users' as RankingTabType, label: '新用户', icon: Clock, color: 'text-green-500' },
];

// 时间筛选配置 - 与前台 HotRanking.tsx 保持一致
const timeRangeOptions = [
  { value: 'day' as TimeRange, label: '日榜' },
  { value: 'week' as TimeRange, label: '周榜' },
  { value: 'month' as TimeRange, label: '月榜' },
  { value: 'year' as TimeRange, label: '年榜' },
  { value: 'all' as TimeRange, label: '总榜' },
];

// 用户排行榜数据
interface ProfileRanking {
  id: string;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  faith_tag: string | null;
  level: number;
  experience: number;
  hot_points: number;
  heat_count: number;
  followers_count: number;
  following_count: number;
  is_vip: boolean;
  created_at: string;
  updated_at: string;
  rank: number;
}

// 笔记排行榜数据
interface PostRanking {
  id: string;
  title: string;
  user_id: string;
  views_count: number;
  heat_count: number;
  comments_count: number;
  shares_count: number;
  favorites_count: number;
  created_at: string;
  author_username?: string;
  author_nickname?: string;
  author_faith_tag?: string;
  hot_value: number;
  original_hot_value?: number;
  rank: number;
}

// 导出快捷选项
const exportQuickOptions = [
  { value: 'day', label: '日榜' },
  { value: 'week', label: '周榜' },
  { value: 'month', label: '月榜' },
  { value: 'year', label: '年榜' },
  { value: 'all', label: '总榜' },
];

// 格式化数字（添加千分位）
const formatNumber = (num: number): string => {
  return num.toLocaleString('zh-CN');
};

// 获取排名样式
const getRankStyle = (rank: number): { bg: string; border: string; text: string } => {
  if (rank === 1) return { bg: 'bg-gradient-to-br from-yellow-400 to-amber-500', border: 'border-yellow-600', text: 'text-white' };
  if (rank === 2) return { bg: 'bg-gradient-to-br from-gray-300 to-gray-400', border: 'border-gray-500', text: 'text-white' };
  if (rank === 3) return { bg: 'bg-gradient-to-br from-amber-600 to-amber-700', border: 'border-amber-800', text: 'text-white' };
  return { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-700' };
};

// 获取排名图标
const getRankIcon = (rank: number): React.ReactNode => {
  if (rank === 1) return <Crown className="w-4 h-4" />;
  if (rank === 2) return <Medal className="w-4 h-4" />;
  if (rank === 3) return <Award className="w-4 h-4" />;
  return null;
};

// ========== 热值计算公式 ==========
// 热值 = (浏览数×0.5) + (加热数×5) + (评论数×2) + (分享数×3) + (收藏数×2)
// 与前台 HotRanking.tsx 保持一致
const calculateHotValue = (post: any): number => {
  const views = post.views_count || 0;
  const heat = post.heat_count || 0;
  const comments = post.comments_count || 0;
  const shares = post.shares_count || 0;
  const favorites = post.favorites_count || 0;
  return (views * 0.5) + (heat * 5) + (comments * 2) + (shares * 3) + (favorites * 2);
};

// 指数衰减计算 - 与前台 HotRanking.tsx 保持一致
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

// 热度格式化（抖音风格）
function formatHotValue(num: number): string {
  if (num < 10000) return String(Math.floor(num));
  const wan = num / 10000;
  if (wan < 10) {
    return wan % 1 === 0 ? `${wan}W` : `${wan.toFixed(1)}W`;
  }
  return `${Math.floor(wan)}W`;
}

export default function RankingManagement() {
  const [activeTab, setActiveTab] = useState<RankingTabType>('experience');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [profileRankings, setProfileRankings] = useState<ProfileRanking[]>([]);
  const [postRankings, setPostRankings] = useState<PostRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [levelFilter, setLevelFilter] = useState<number | null>(null);
  const [vipFilter, setVipFilter] = useState<'all' | 'vip' | 'normal'>('all');
  const [page, setPage] = useState(1);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportTimeRange, setExportTimeRange] = useState<TimeRange>('all');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  const supabaseUrl = getSupabaseUrl();
  const pageSize = 20;

  // 获取时间范围开始日期 - 与前台 HotRanking.tsx 保持一致
  const getStartDate = useCallback((range: TimeRange): string | null => {
    const now = new Date();
    switch (range) {
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
  }, []);

  // 获取结束日期
  const getEndDate = useCallback((): string => {
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    return now.toISOString();
  }, []);

  // 加载用户排行榜数据
  const loadProfileRankings = useCallback(async () => {
    setLoading(true);
    try {
      let selectFields = 'id,username,nickname,avatar_url,faith_tag,level,experience,hot_points,heat_count,followers_count,following_count,is_vip,created_at,updated_at';
      
      let url = `${supabaseUrl}/rest/v1/profiles?select=${selectFields}&order=experience.desc`;

      // 根据不同排行榜类型设置排序和筛选
      if (activeTab === 'experience') {
        url = `${supabaseUrl}/rest/v1/profiles?select=${selectFields}&order=experience.desc`;
      } else if (activeTab === 'hot_points') {
        url = `${supabaseUrl}/rest/v1/profiles?select=${selectFields}&order=hot_points.desc`;
      } else if (activeTab === 'heat_count') {
        url = `${supabaseUrl}/rest/v1/profiles?select=${selectFields}&order=heat_count.desc`;
      } else if (activeTab === 'followers') {
        url = `${supabaseUrl}/rest/v1/profiles?select=${selectFields}&order=followers_count.desc`;
      } else if (activeTab === 'new_users') {
        url = `${supabaseUrl}/rest/v1/profiles?select=${selectFields}&order=created_at.desc`;
        const startDate = getStartDate(timeRange);
        if (startDate) {
          url += `&created_at=gte.${startDate}`;
        }
      }

      const res = await fetch(url, {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
      });

      if (!res.ok) throw new Error('Failed to fetch profiles');
      
      let data = await res.json();
      
      // 过滤时间范围（除了新用户，其他按updated_at筛选）
      if (activeTab !== 'new_users') {
        const startDate = getStartDate(timeRange);
        if (startDate) {
          data = data.filter((p: any) => new Date(p.updated_at) >= new Date(startDate));
        }
      }

      // 过滤等级
      if (levelFilter !== null) {
        data = data.filter((p: any) => p.level === levelFilter);
      }

      // 过滤VIP状态
      if (vipFilter === 'vip') {
        data = data.filter((p: any) => p.is_vip === true);
      } else if (vipFilter === 'normal') {
        data = data.filter((p: any) => p.is_vip !== true);
      }

      // 过滤搜索关键词
      if (searchKeyword) {
        const keyword = searchKeyword.toLowerCase();
        data = data.filter((p: any) => 
          p.username?.toLowerCase().includes(keyword) ||
          p.nickname?.toLowerCase().includes(keyword) ||
          p.faith_tag?.toLowerCase().includes(keyword)
        );
      }

      // 添加排名
      const rankedData = data.map((p: any, index: number) => ({
        ...p,
        rank: index + 1
      }));

      setProfileRankings(rankedData);
      setLastUpdate(new Date().toLocaleString('zh-CN'));
    } catch (error) {
      console.error('加载用户排行榜失败:', error);
      setProfileRankings([]);
    }
    setLoading(false);
  }, [supabaseUrl, activeTab, timeRange, levelFilter, vipFilter, searchKeyword, getStartDate]);

  // 加载笔记排行榜数据 - 与前台 HotRanking.tsx 保持一致
  const loadPostRankings = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${supabaseUrl}/rest/v1/posts?select=id,title,user_id,views_count,heat_count,comments_count,shares_count,favorites_count,created_at&status=eq.published&order=created_at.desc.nullslast&limit=200`;

      const res = await fetch(url, {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
      });

      if (!res.ok) throw new Error('Failed to fetch posts');
      
      let data = await res.json();

      // 过滤时间范围
      const startDate = getStartDate(timeRange);
      if (startDate) {
        data = data.filter((p: any) => new Date(p.created_at) >= new Date(startDate));
      }

      // 获取作者信息
      const userIds = [...new Set(data.map((p: any) => p.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const usersRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=in.(${userIds.join(',')})`, {
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          },
        });
        const users = await usersRes.json();
        const userMap: Record<string, any> = {};
        
        if (Array.isArray(users)) {
          users.forEach((u: any) => {
            userMap[u.id] = u;
          });
        }

        // 添加作者信息和热值
        const postsWithHotValue = data.map((p: any) => {
          const hotValue = calculateHotValue(p);
          const daysAgo = p.created_at ? getDaysAgo(p.created_at) : 0;
          
          // 根据时间维度应用衰减 - 与前台 HotRanking.tsx 保持一致
          let finalHotValue = hotValue;
          if (timeRange === 'week' || timeRange === 'month') {
            // 周榜/月榜：指数衰减 λ=0.1
            finalHotValue = applyDecay(hotValue, daysAgo, 0.1);
          }
          // 日榜/年榜/总榜：不衰减
          
          return {
            ...p,
            author_username: userMap[p.user_id]?.username || '未知',
            author_nickname: userMap[p.user_id]?.nickname || '',
            author_faith_tag: userMap[p.user_id]?.faith_tag || '',
            hot_value: finalHotValue,
            original_hot_value: hotValue // 保存原始热值用于显示
          };
        });

        // 按热值排序
        postsWithHotValue.sort((a: any, b: any) => b.hot_value - a.hot_value);

        // 过滤热值为0的帖子
        const filtered = postsWithHotValue.filter((p: any) => p.hot_value > 0);

        // 过滤搜索关键词
        if (searchKeyword) {
          const keyword = searchKeyword.toLowerCase();
          filtered.filter((p: any) => 
            p.title?.toLowerCase().includes(keyword) ||
            p.author_username?.toLowerCase().includes(keyword) ||
            p.author_nickname?.toLowerCase().includes(keyword)
          );
        }

        // 添加排名
        data = filtered.map((p: any, index: number) => ({
          ...p,
          rank: index + 1
        }));
      }

      setPostRankings(data);
      setLastUpdate(new Date().toLocaleString('zh-CN'));
    } catch (error) {
      console.error('加载笔记排行榜失败:', error);
      setPostRankings([]);
    }
    setLoading(false);
  }, [supabaseUrl, timeRange, searchKeyword, getStartDate]);

  // 加载数据
  useEffect(() => {
    if (activeTab === 'post_heat') {
      loadPostRankings();
    } else {
      loadProfileRankings();
    }
  }, [activeTab, loadProfileRankings, loadPostRankings]);

  // 重置分页
  useEffect(() => {
    setPage(1);
  }, [activeTab, timeRange, searchKeyword, levelFilter, vipFilter]);

  // 获取当前显示的数据
  const currentData = useMemo(() => {
    if (activeTab === 'post_heat') {
      return postRankings;
    }
    return profileRankings;
  }, [activeTab, profileRankings, postRankings]);

  // 分页数据
  const totalCount = currentData.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedData = currentData.slice((page - 1) * pageSize, page * pageSize);

  // 导出数据
  const handleExport = useCallback(() => {
    const dataToExport = currentData;
    
    // 根据Tab类型确定CSV列
    let csvContent = '';
    
    if (activeTab === 'post_heat') {
      csvContent = '排名,笔记标题,作者,信仰标签,浏览数,加热数,评论数,分享数,收藏数,热值,原始热值,发布时间\n';
      dataToExport.forEach((post: any) => {
        csvContent += `${post.rank},"${post.title}","${post.author_username || ''}","${post.author_faith_tag || ''}",${post.views_count},${post.heat_count},${post.comments_count},${post.shares_count},${post.favorites_count},${post.hot_value.toFixed(2)},${post.original_hot_value?.toFixed(2) || 0},"${post.created_at}"\n`;
      });
    } else {
      csvContent = '排名,用户名,昵称,信仰标签,等级,经验值,热点数,加热数,粉丝数,关注数,VIP状态,注册时间\n';
      dataToExport.forEach((profile: any) => {
        csvContent += `${profile.rank},"${profile.username}","${profile.nickname || ''}","${profile.faith_tag || ''}",${profile.level},${profile.experience},${profile.hot_points},${profile.heat_count},${profile.followers_count},${profile.following_count},"${profile.is_vip || 'none'}","${profile.created_at}"\n`;
      });
    }

    // 创建下载
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const tabName = tabConfig.find(t => t.id === activeTab)?.label || activeTab;
    const timeName = timeRangeOptions.find(t => t.value === timeRange)?.label || '总榜';
    const today = new Date().toISOString().split('T')[0];
    const fileName = `${tabName}-${timeName}-${today}.csv`;
    
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setShowExportModal(false);
  }, [currentData, activeTab, timeRange]);

  // 获取等级徽章样式
  const getLevelBadgeStyle = (level: number) => {
    const colors = [
      'bg-gray-400',   // 0
      'bg-green-500',  // 1
      'bg-green-600',  // 2
      'bg-blue-500',    // 3
      'bg-blue-600',   // 4
      'bg-purple-500', // 5
      'bg-purple-600', // 6
      'bg-orange-500', // 7
      'bg-orange-600', // 8
      'bg-red-500',    // 9
      'bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500', // 10+
    ];
    return colors[Math.min(level, 10)] || colors[0];
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Trophy className="w-8 h-8 text-[#2563EB]" />
          <h1 className="text-2xl font-bold text-gray-900">排行榜管理</h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <RefreshCw className="w-4 h-4" />
          <span>更新于: {lastUpdate || '-'}</span>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
        <div className="flex flex-wrap border-b border-gray-200">
          {tabConfig.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'text-[#2563EB] border-b-2 border-[#2563EB] bg-pink-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${activeTab === tab.id ? tab.color : ''}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 时间筛选按钮组 - 与前台 HotRanking.tsx 保持一致 */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-2 overflow-x-auto">
            {timeRangeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTimeRange(opt.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  timeRange === opt.value
                    ? 'bg-[#2563EB] text-white shadow-md'
                    : 'bg-white text-gray-600 hover:bg-pink-50 hover:text-[#2563EB] border border-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {activeTab === 'post_heat' && (timeRange === 'week' || timeRange === 'month') && (
            <p className="mt-2 text-xs text-gray-500">
              注：周榜/月榜使用指数衰减计算热值（λ=0.1），发布时间越久远，热度衰减越多
            </p>
          )}
        </div>

        {/* 筛选栏 */}
        <div className="p-4 bg-white border-b border-gray-100">
          <div className="flex flex-wrap items-center gap-4">
            {/* 搜索框 */}
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="搜索用户名、昵称或标签..."
                  className="w-full h-9 pl-10 pr-4 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                />
              </div>
            </div>

            {/* 等级筛选（仅经验值和热点排行显示） */}
            {(activeTab === 'experience' || activeTab === 'hot_points') && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">等级:</span>
                  <select
                    value={levelFilter === null ? '' : levelFilter}
                    onChange={(e) => setLevelFilter(e.target.value ? parseInt(e.target.value) : null)}
                    className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                  >
                    <option value="">全部等级</option>
                    {Array.from({ length: 11 }, (_, i) => (
                      <option key={i} value={i}>Lv.{i}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">VIP:</span>
                  <select
                    value={vipFilter}
                    onChange={(e) => setVipFilter(e.target.value as 'all' | 'vip' | 'normal')}
                    className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                  >
                    <option value="all">全部</option>
                    <option value="vip">VIP用户</option>
                    <option value="normal">普通用户</option>
                  </select>
                </div>
              </>
            )}

            {/* 导出按钮 */}
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 h-9 px-4 bg-[#2563EB] text-white rounded-lg text-sm font-medium hover:bg-[#be1d40] transition-colors"
            >
              <Download className="w-4 h-4" />
              导出
            </button>

            {/* 刷新按钮 */}
            <button
              onClick={() => activeTab === 'post_heat' ? loadPostRankings() : loadProfileRankings()}
              className="flex items-center gap-2 h-9 px-4 border border-gray-200 rounded-lg text-sm font-medium hover:bg-white transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </button>
          </div>

          {/* 统计信息 */}
          <div className="mt-3 flex items-center gap-4 text-sm">
            <span className="text-gray-500">
              <span className="font-medium text-[#2563EB]">{timeRangeOptions.find(t => t.value === timeRange)?.label}</span>
              {' '}共 <span className="font-semibold text-gray-900">{formatNumber(totalCount)}</span> 条记录
            </span>
            {activeTab !== 'post_heat' && (
              <span className="text-gray-500">
                | 前三名: 
                <span className="ml-2 inline-flex items-center gap-1">
                  {profileRankings[0] && (
                    <span className="text-yellow-500 font-medium">{profileRankings[0].username}</span>
                  )}
                  {profileRankings[1] && (
                    <>
                      <span className="text-gray-400">,</span>
                      <span className="text-gray-400 font-medium">{profileRankings[1].username}</span>
                    </>
                  )}
                  {profileRankings[2] && (
                    <>
                      <span className="text-gray-400">,</span>
                      <span className="text-amber-600 font-medium">{profileRankings[2].username}</span>
                    </>
                  )}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 排行榜表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-500">加载中...</span>
            </div>
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Trophy className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-lg">暂无排行榜数据</p>
            <p className="text-sm">请检查筛选条件或等待数据同步</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              {/* 用户排行榜表格 */}
              {activeTab !== 'post_heat' && (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 w-20">排名</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">用户信息</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 w-20">等级</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                        {activeTab === 'experience' && '经验值'}
                        {activeTab === 'hot_points' && '热点数'}
                        {activeTab === 'heat_count' && '加热次数'}
                        {activeTab === 'followers' && '粉丝数'}
                        {activeTab === 'new_users' && '关注数'}
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">信仰标签</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">VIP</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        {activeTab === 'new_users' ? '注册时间' : '更新时间'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedData.map((profile: any) => {
                      const rankStyle = getRankStyle(profile.rank);
                      return (
                        <tr key={profile.id} className={`hover:bg-gray-50 transition-colors ${profile.rank <= 3 ? 'bg-yellow-50' : ''}`}>
                          <td className="px-4 py-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm mx-auto ${rankStyle.bg} ${rankStyle.text} border ${rankStyle.border}`}>
                              {profile.rank <= 3 ? (
                                <span className="flex items-center gap-0.5">
                                  {getRankIcon(profile.rank)}
                                  <span>{profile.rank}</span>
                                </span>
                              ) : (
                                profile.rank
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`}
                                alt=""
                                className="w-10 h-10 rounded-full bg-gray-100"
                              />
                              <div>
                                <p className="font-medium text-gray-900">{profile.username}</p>
                                {profile.nickname && (
                                  <p className="text-xs text-gray-400">{profile.nickname}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-bold ${getLevelBadgeStyle(profile.level)}`}>
                              {profile.level}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-bold text-[#2563EB]">
                              {formatNumber(
                                activeTab === 'experience' ? profile.experience :
                                activeTab === 'hot_points' ? profile.hot_points :
                                activeTab === 'heat_count' ? profile.heat_count :
                                activeTab === 'followers' ? profile.followers_count :
                                profile.following_count
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {profile.faith_tag && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                                {profile.faith_tag}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {profile.is_vip === true ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-white rounded-full text-xs font-medium">
                                <Star className="w-3 h-3" /> VIP
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {new Date(activeTab === 'new_users' ? profile.created_at : profile.updated_at).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* 笔记排行榜表格 */}
              {activeTab === 'post_heat' && (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 w-20">排名</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">笔记标题</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">作者</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">热值</th>
                      {(timeRange === 'week' || timeRange === 'month') && (
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">原始热值</th>
                      )}
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">浏览</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">加热</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">评论</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">收藏</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">发布时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedData.map((post: any) => {
                      const rankStyle = getRankStyle(post.rank);
                      return (
                        <tr key={post.id} className={`hover:bg-gray-50 transition-colors ${post.rank <= 3 ? 'bg-yellow-50' : ''}`}>
                          <td className="px-4 py-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm mx-auto ${rankStyle.bg} ${rankStyle.text} border ${rankStyle.border}`}>
                              {post.rank <= 3 ? (
                                <span className="flex items-center gap-0.5">
                                  {getRankIcon(post.rank)}
                                  <span>{post.rank}</span>
                                </span>
                              ) : (
                                post.rank
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900 max-w-xs truncate">{post.title || '无标题'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{post.author_username}</span>
                              {post.author_faith_tag && (
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                  {post.author_faith_tag}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-bold text-[#2563EB]">{formatHotValue(post.hot_value)}</span>
                          </td>
                          {(timeRange === 'week' || timeRange === 'month') && (
                            <td className="px-4 py-3 text-right text-gray-400 text-sm">
                              {formatHotValue(post.original_hot_value || 0)}
                            </td>
                          )}
                          <td className="px-4 py-3 text-right text-gray-600">
                            {formatNumber(post.views_count || 0)}
                          </td>
                          <td className="px-4 py-3 text-right text-orange-600">
                            {formatNumber(post.heat_count || 0)}
                          </td>
                          <td className="px-4 py-3 text-right text-blue-600">
                            {formatNumber(post.comments_count || 0)}
                          </td>
                          <td className="px-4 py-3 text-right text-purple-600">
                            {formatNumber(post.favorites_count || 0)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {new Date(post.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  显示 {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalCount)} 条，共 {formatNumber(totalCount)} 条
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    上一页
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`w-8 h-8 rounded-lg text-sm ${
                            page === pageNum
                              ? 'bg-[#2563EB] text-white'
                              : 'border border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一页
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 导出弹窗 */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">导出排行榜数据</h2>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">选择时段</label>
                <div className="flex flex-wrap gap-2">
                  {exportQuickOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setExportTimeRange(opt.value as TimeRange);
                        setExportStartDate('');
                        setExportEndDate('');
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        exportTimeRange === opt.value && !exportStartDate
                          ? 'bg-[#2563EB] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">自定义时间范围</label>
                <div className="flex items-center gap-4">
                  <input
                    type="date"
                    value={exportStartDate}
                    onChange={(e) => {
                      setExportStartDate(e.target.value);
                      setExportTimeRange('all');
                    }}
                    className="flex-1 h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    placeholder="开始日期"
                  />
                  <span className="text-gray-400">至</span>
                  <input
                    type="date"
                    value={exportEndDate}
                    onChange={(e) => {
                      setExportEndDate(e.target.value);
                      setExportTimeRange('all');
                    }}
                    className="flex-1 h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                    placeholder="结束日期"
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">导出内容:</span> {tabConfig.find(t => t.id === activeTab)?.label}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">导出时段:</span> {exportStartDate ? `${exportStartDate} 至 ${exportEndDate}` : exportQuickOptions.find(t => t.value === exportTimeRange)?.label || '全部'}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">记录数量:</span> {formatNumber(totalCount)} 条
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">文件名:</span> <span className="text-[#2563EB]">{tabConfig.find(t => t.id === activeTab)?.label}-{exportQuickOptions.find(t => t.value === exportTimeRange)?.label || '全部'}-{new Date().toISOString().split('T')[0]}.csv</span>
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="flex-1 h-11 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleExport}
                  className="flex-1 h-11 bg-[#2563EB] text-white rounded-lg font-medium hover:bg-[#be1d40] transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  确认导出
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
