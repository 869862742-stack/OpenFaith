import React, { useState, useEffect, useCallback } from 'react';
import { getSupabaseUrl } from '../supabase/client';
import { 
  FileText, Users, ShieldCheck, Flag, MessageSquare, Wifi, WifiOff, 
  Clock, UserPlus, BookOpen, MessageCircle, Download, Calendar, 
  ChevronDown, ChevronRight, PieChart, BarChart3, MapPin, Globe,
  Tag, RefreshCw, X, Check
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
} from 'recharts';

// Service Role Key for bypassing RLS
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';

// 主题色
const PRIMARY_COLOR = '#2563EB';
const PRIMARY_LIGHT = '#FCE7F3';
const PRIMARY_DARK = '#BE123C';

// 大洲到国家的映射
const CONTINENT_COUNTRIES: Record<string, string[]> = {
  '亚洲': ['中国', '日本', '韩国', '印度', '泰国', '新加坡', '马来西亚', '印尼', '越南', '菲律宾', '其他亚洲'],
  '欧洲': ['英国', '德国', '法国', '意大利', '西班牙', '荷兰', '瑞士', '瑞典', '波兰', '俄罗斯', '其他欧洲'],
  '北美洲': ['美国', '加拿大', '墨西哥', '其他北美'],
  '南美洲': ['巴西', '阿根廷', '哥伦比亚', '智利', '秘鲁', '其他南美'],
  '非洲': ['埃及', '南非', '尼日利亚', '肯尼亚', '摩洛哥', '其他非洲'],
  '大洋洲': ['澳大利亚', '新西兰', '其他大洋洲'],
  '其他': ['其他'],
};

// 辅助函数：根据国家确定大洲
const getContinentFromCountry = (country: string): string => {
  for (const [continent, countries] of Object.entries(CONTINENT_COUNTRIES)) {
    if (countries.includes(country)) {
      return continent;
    }
  }
  return '其他';
};

// 导出格式类型
type ExportFormat = 'csv' | 'xlsx';

// 时间范围类型
type TimeRange = 'today' | '7days' | '30days' | '90days' | 'custom';

// 时间范围配置
const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: 'today', label: '今日' },
  { key: '7days', label: '近7天' },
  { key: '30days', label: '近30天' },
  { key: '90days', label: '近90天' },
  { key: 'custom', label: '自定义' },
];

function Dashboard() {
  const [stats, setStats] = useState({
    todayPosts: 0,
    todayUsers: 0,
    pendingPosts: 0,
    pendingReports: 0,
    pendingComments: 0,
    totalPosts: 0,
    totalUsers: 0,
    onlineUsers: 0,
    todayActiveUsers: 0,
    todayNotes: 0,
    todayComments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [postsTrend, setPostsTrend] = useState<{ date: string; posts: number; users: number }[]>([]);
  
  // 新增：身份标签分布
  const [faithTagDistribution, setFaithTagDistribution] = useState<{ name: string; value: number; percentage: string }[]>([]);
  
  // 新增：地区分布
  const [continentDistribution, setContinentDistribution] = useState<{ name: string; value: number; percentage: string }[]>([]);
  const [countryDistribution, setCountryDistribution] = useState<{ country: string; count: number }[]>([]);
  const [expandedContinent, setExpandedContinent] = useState<string | null>(null);
  
  // 新增：时间范围筛选
  const [timeRange, setTimeRange] = useState<TimeRange>('30days');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  
  // 新增：导出模态框
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState<'faithTag' | 'continent' | 'country' | 'all'>('all');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  
  // 新增：数据库字段检测状态
  const [fieldsInitialized, setFieldsInitialized] = useState(false);

  // 计算时间范围
  const getDateRange = useCallback(() => {
    const now = new Date();
    let start: Date, end: Date = now;
    
    switch (timeRange) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case '7days':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90days':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        start = customDateRange.start ? new Date(customDateRange.start) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        end = customDateRange.end ? new Date(customDateRange.end) : now;
        break;
      default:
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    return { start: start.toISOString(), end: end.toISOString() };
  }, [timeRange, customDateRange]);

  // 初始化地区字段
  const initializeFields = async () => {
    const supabaseUrl = getSupabaseUrl();
    
    // 尝试添加字段（通过 PATCH 请求，如果字段不存在会报错，但不影响功能）
    try {
      // 检查字段是否存在
      const testRes = await fetch(`${supabaseUrl}/rest/v1/profiles?select=continent,country,region&limit=1`, {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
      });
      
      if (testRes.ok) {
        setFieldsInitialized(true);
      }
    } catch (e) {
      console.log('Fields may not exist yet, will use faith_tag only');
    }
  };

  // 获取统计数据
  const loadStats = async () => {
    const supabaseUrl = getSupabaseUrl();
    const { start, end } = getDateRange();
    
    try {
      // 5分钟前的时间（用于计算在线人数）
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      // Fetch all stats in parallel using Service Role Key
      const headers = {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      };

      // 并行获取所有统计数据
      const [
        todayPostsRes,
        todayUsersRes,
        pendingPostsRes,
        pendingReportsRes,
        pendingCommentsRes,
        totalPostsRes,
        totalUsersRes,
        onlineUsersRes,
        todayNotesRes,
        todayCommentsRes,
        allProfilesRes,
        faithTagRes
      ] = await Promise.all([
        // 今日新增笔记
        fetch(`${supabaseUrl}/rest/v1/posts?created_at=gte.${start}&created_at=lte.${end}&select=id`, { headers }),
        // 今日新增用户
        fetch(`${supabaseUrl}/rest/v1/profiles?created_at=gte.${start}&created_at=lte.${end}&select=id`, { headers }),
        // 待审核帖子
        fetch(`${supabaseUrl}/rest/v1/posts?status=eq.pending&select=id`, { headers }),
        // 待处理举报
        fetch(`${supabaseUrl}/rest/v1/reports?status=eq.pending&select=id`, { headers }),
        // 待审核评论
        fetch(`${supabaseUrl}/rest/v1/comments?status=eq.pending&select=id`, { headers }),
        // 总笔记数
        fetch(`${supabaseUrl}/rest/v1/posts?status=eq.published&select=id`, { headers }),
        // 总用户数
        fetch(`${supabaseUrl}/rest/v1/profiles?select=id`, { headers }),
        // 在线人数（最近5分钟内有活动）
        fetch(`${supabaseUrl}/rest/v1/profiles?last_online_at=gte.${fiveMinutesAgo}&select=id`, { headers }),
        // 今日新增笔记
        fetch(`${supabaseUrl}/rest/v1/posts?created_at=gte.${start}&created_at=lte.${end}&select=id`, { headers }),
        // 今日新增评论
        fetch(`${supabaseUrl}/rest/v1/comments?created_at=gte.${start}&created_at=lte.${end}&select=id`, { headers }),
        // 获取所有用户用于分布统计
        fetch(`${supabaseUrl}/rest/v1/profiles?select=faith_tag,continent,country,created_at`, { headers }),
        // 按 faith_tag 分组统计
        fetch(`${supabaseUrl}/rest/v1/profiles?select=faith_tag&count=exact&countMode=exact`, { headers }),
      ]);

      const [
        todayPostsData,
        todayUsersData,
        pendingPostsData,
        pendingReportsData,
        pendingCommentsData,
        totalPostsData,
        totalUsersData,
        onlineUsersData,
        todayNotesData,
        todayCommentsData,
        allProfilesData,
        faithTagData
      ] = await Promise.all([
        todayPostsRes.json(),
        todayUsersRes.json(),
        pendingPostsRes.json(),
        pendingReportsRes.json(),
        pendingCommentsRes.json(),
        totalPostsRes.json(),
        totalUsersRes.json(),
        onlineUsersRes.json(),
        todayNotesRes.json(),
        todayCommentsRes.json(),
        allProfilesRes.json(),
        faithTagRes.json(),
      ]);

      // 今日活跃用户
      const todayActiveUsersRes = await fetch(
        `${supabaseUrl}/rest/v1/profiles?last_online_at=gte.${todayStart.toISOString()}&select=id`,
        { headers }
      );
      const todayActiveUsersData = await todayActiveUsersRes.json();

      setStats({
        todayPosts: Array.isArray(todayPostsData) ? todayPostsData.length : 0,
        todayUsers: Array.isArray(todayUsersData) ? todayUsersData.length : 0,
        pendingPosts: Array.isArray(pendingPostsData) ? pendingPostsData.length : 0,
        pendingReports: Array.isArray(pendingReportsData) ? pendingReportsData.length : 0,
        pendingComments: Array.isArray(pendingCommentsData) ? pendingCommentsData.length : 0,
        totalPosts: Array.isArray(totalPostsData) ? totalPostsData.length : 0,
        totalUsers: Array.isArray(totalUsersData) ? totalUsersData.length : 0,
        onlineUsers: Array.isArray(onlineUsersData) ? onlineUsersData.length : 0,
        todayActiveUsers: Array.isArray(todayActiveUsersData) ? todayActiveUsersData.length : 0,
        todayNotes: Array.isArray(todayNotesData) ? todayNotesData.length : 0,
        todayComments: Array.isArray(todayCommentsData) ? todayCommentsData.length : 0,
      });

      // 处理身份标签分布
      if (Array.isArray(allProfilesData)) {
        const faithTagCounts: Record<string, number> = {};
        const continentCounts: Record<string, number> = {};
        
        allProfilesData.forEach((profile: any) => {
          // 统计 faith_tag
          const tag = profile.faith_tag || '未分类';
          faithTagCounts[tag] = (faithTagCounts[tag] || 0) + 1;
          
          // 统计大洲（如果有 continent 字段）
          if (profile.continent) {
            continentCounts[profile.continent] = (continentCounts[profile.continent] || 0) + 1;
          } else if (profile.country) {
            // 根据国家推断大洲
            const continent = getContinentFromCountry(profile.country);
            continentCounts[continent] = (continentCounts[continent] || 0) + 1;
          } else {
            continentCounts['未知地区'] = (continentCounts['未知地区'] || 0) + 1;
          }
        });

        const totalUsers = allProfilesData.length;

        // 转换 faith_tag 分布
        const faithTagDist = Object.entries(faithTagCounts)
          .map(([name, value]) => ({
            name,
            value,
            percentage: ((value / totalUsers) * 100).toFixed(1) + '%',
          }))
          .sort((a, b) => b.value - a.value);

        setFaithTagDistribution(faithTagDist);

        // 转换大洲分布
        const continentDist = Object.entries(continentCounts)
          .map(([name, value]) => ({
            name,
            value,
            percentage: ((value / totalUsers) * 100).toFixed(1) + '%',
          }))
          .sort((a, b) => b.value - a.value);

        setContinentDistribution(continentDist);
      }

      // Fetch last 7 days trend data
      const trendData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
        const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59).toISOString();
        
        const [dayPostsRes, dayUsersRes] = await Promise.all([
          fetch(`${supabaseUrl}/rest/v1/posts?created_at=gte.${dayStart}&created_at=lte.${dayEnd}&select=id`, { headers }),
          fetch(`${supabaseUrl}/rest/v1/profiles?created_at=gte.${dayStart}&created_at=lte.${dayEnd}&select=id`, { headers }),
        ]);
        
        const [dayPostsData, dayUsersData] = await Promise.all([
          dayPostsRes.json(),
          dayUsersRes.json(),
        ]);
        
        const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        trendData.push({
          date: dayNames[date.getDay()],
          posts: Array.isArray(dayPostsData) ? dayPostsData.length : 0,
          users: Array.isArray(dayUsersData) ? dayUsersData.length : 0,
        });
      }
      setPostsTrend(trendData);
    } catch (error) {
      console.error('加载统计失败:', error);
    }
    setLoading(false);
  };

  // 展开大洲时获取该大洲的国家分布
  const loadCountryDistribution = async (continent: string) => {
    const supabaseUrl = getSupabaseUrl();
    
    try {
      const headers = {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      };
      
      // 先尝试获取有 continent 字段的数据
      let res = await fetch(
        `${supabaseUrl}/rest/v1/profiles?continent=eq.${encodeURIComponent(continent)}&select=country&count=exact`,
        { headers }
      );
      
      let data = await res.json();
      
      if (!Array.isArray(data) || data.length === 0) {
        // 如果没有 continent 字段，根据国家推断
        const countries = CONTINENT_COUNTRIES[continent] || [];
        const countryCounts: Record<string, number> = {};
        
        for (const country of countries) {
          res = await fetch(
            `${supabaseUrl}/rest/v1/profiles?country=eq.${encodeURIComponent(country)}&select=id&count=exact`,
            { headers }
          );
          const countData = await res.json();
          const count = parseInt(res.headers.get('content-range')?.split('/')[1] || '0');
          if (count > 0) {
            countryCounts[country] = count;
          }
        }
        
        setCountryDistribution(
          Object.entries(countryCounts)
            .map(([country, count]) => ({ country, count }))
            .sort((a, b) => b.count - a.count)
        );
      } else {
        // 处理有 continent 字段的情况
        const countryCounts: Record<string, number> = {};
        data.forEach((profile: any) => {
          const country = profile.country || '未知';
          countryCounts[country] = (countryCounts[country] || 0) + 1;
        });
        
        setCountryDistribution(
          Object.entries(countryCounts)
            .map(([country, count]) => ({ country, count }))
            .sort((a, b) => b.count - a.count)
        );
      }
    } catch (error) {
      console.error('获取国家分布失败:', error);
    }
  };

  // 处理大洲展开/收起
  const handleContinentClick = (continent: string) => {
    if (expandedContinent === continent) {
      setExpandedContinent(null);
      setCountryDistribution([]);
    } else {
      setExpandedContinent(continent);
      loadCountryDistribution(continent);
    }
  };

  // 导出数据
  const handleExport = async () => {
    const supabaseUrl = getSupabaseUrl();
    const { start, end } = getDateRange();
    
    try {
      const headers = {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      };
      
      let data: any[] = [];
      let filename = '';
      
      switch (exportType) {
        case 'faithTag':
          data = faithTagDistribution.map(item => ({
            '身份标签': item.name,
            '用户数': item.value,
            '占比': item.percentage,
          }));
          filename = `身份标签分布_${new Date().toISOString().split('T')[0]}`;
          break;
          
        case 'continent':
          data = continentDistribution.map(item => ({
            '大洲': item.name,
            '用户数': item.value,
            '占比': item.percentage,
          }));
          filename = `大洲分布_${new Date().toISOString().split('T')[0]}`;
          break;
          
        case 'country':
          data = countryDistribution.map(item => ({
            '国家': item.country,
            '用户数': item.count,
          }));
          filename = `国家分布_${new Date().toISOString().split('T')[0]}`;
          break;
          
        case 'all':
        default:
          // 导出所有数据的汇总
          data = [
            { '统计项': '总用户数', '数值': stats.totalUsers },
            { '统计项': '今日新增用户', '数值': stats.todayUsers },
            { '统计项': '当前在线用户', '数值': stats.onlineUsers },
            { '统计项': '今日活跃用户', '数值': stats.todayActiveUsers },
            { '统计项': '总笔记数', '数值': stats.totalPosts },
            { '统计项': '今日新增笔记', '数值': stats.todayNotes },
            { '统计项': '今日新增评论', '数值': stats.todayComments },
            { '统计项': '待审核内容', '数值': stats.pendingPosts + stats.pendingComments },
            { '统计项': '待处理举报', '数值': stats.pendingReports },
          ];
          filename = `综合统计_${new Date().toISOString().split('T')[0]}`;
          break;
      }
      
      if (exportFormat === 'csv') {
        // 导出 CSV
        const csvContent = [
          Object.keys(data[0] || {}).join(','),
          ...data.map(row => Object.values(row).join(','))
        ].join('\n');
        
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        // 导出 Excel (使用简单的 HTML 表格方式，浏览器会自动转换)
        const headers_list = Object.keys(data[0] || {});
        let html = `<table><thead><tr>${headers_list.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>`;
        html += data.map(row => `<tr>${headers_list.map(h => `<td>${row[h]}</td>`).join('')}</tr>`).join('');
        html += '</tbody></table>';
        
        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.xls`;
        link.click();
        URL.revokeObjectURL(url);
      }
      
      setShowExportModal(false);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    }
  };

  useEffect(() => {
    initializeFields();
    loadStats();
    // 每30秒自动刷新
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, [timeRange, customDateRange]);

  // 手动刷新
  const handleRefresh = () => {
    setLoading(true);
    loadStats();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
        <div className="loading-spinner" style={{ 
          width: '40px', height: '40px', 
          border: '3px solid #f3f3f3', 
          borderTop: '3px solid #2563EB',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    );
  }

  // 饼图颜色
  const COLORS = ['#2563EB', '#BE123C', '#F43F5E', '#FB7185', '#FDA4AF', '#FFB3C1', '#FFD6E0', '#FFE4E8', '#FFF0F3', '#FFF5F7'];

  return (
    <div style={{ padding: '20px' }}>
      {/* 标题栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>数据概览</h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* 时间范围选择 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', padding: '4px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <Calendar size={16} color={PRIMARY_COLOR} />
            {TIME_RANGES.map(range => (
              <button
                key={range.key}
                onClick={() => setTimeRange(range.key)}
                style={{
                  padding: '6px 12px',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  background: timeRange === range.key ? PRIMARY_COLOR : 'transparent',
                  color: timeRange === range.key ? 'white' : '#666',
                  transition: 'all 0.2s',
                }}
              >
                {range.label}
              </button>
            ))}
          </div>
          
          {/* 自定义日期范围 */}
          {timeRange === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="date"
                value={customDateRange.start}
                onChange={e => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px' }}
              />
              <span style={{ color: '#999' }}>至</span>
              <input
                type="date"
                value={customDateRange.end}
                onChange={e => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px' }}
              />
            </div>
          )}
          
          <button 
            onClick={handleRefresh}
            style={{
              padding: '8px 16px',
              background: '#2563EB',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
            }}
          >
            <RefreshCw size={16} />
            刷新
          </button>
        </div>
      </div>

      {/* 在线状态统计卡片 */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: '20px', 
        marginBottom: '20px',
        padding: '20px',
        background: 'linear-gradient(135deg, #2563EB 0%, #BE123C 100%)',
        borderRadius: '12px',
        color: 'white',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ 
            width: '56px', 
            height: '56px', 
            borderRadius: '12px', 
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Wifi size={28} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>当前在线人数</p>
            <h2 style={{ margin: '4px 0 0', fontSize: '36px', fontWeight: 700 }}>{stats.onlineUsers}</h2>
            <p style={{ margin: 0, fontSize: '12px', opacity: 0.7 }}>最近5分钟活跃用户</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ 
            width: '56px', 
            height: '56px', 
            borderRadius: '12px', 
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <UserPlus size={28} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>今日活跃用户</p>
            <h2 style={{ margin: '4px 0 0', fontSize: '36px', fontWeight: 700 }}>{stats.todayActiveUsers}</h2>
            <p style={{ margin: 0, fontSize: '12px', opacity: 0.7 }}>今日有操作的用户</p>
          </div>
        </div>
      </div>

      {/* 今日数据统计 */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 600 }}>📊 {timeRange === 'today' ? '今日' : '近30天'}数据</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <StatCard
            title="新增笔记"
            value={stats.todayNotes}
            icon={<BookOpen size={24} />}
            color="#2563EB"
          />
          <StatCard
            title="新增评论"
            value={stats.todayComments}
            icon={<MessageCircle size={24} />}
            color="#2563EB"
          />
          <StatCard
            title="新增用户"
            value={stats.todayUsers}
            icon={<Users size={24} />}
            color="#2563EB"
          />
          <StatCard
            title="待处理举报"
            value={stats.pendingReports}
            icon={<Flag size={24} />}
            color="#2563EB"
          />
        </div>
      </div>

      {/* 身份标签分布 */}
      <div style={{ 
        background: 'white', 
        borderRadius: '12px', 
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: PRIMARY_COLOR }}>
            <Tag size={20} />
            身份标签分布
          </h3>
          <button
            onClick={() => { setExportType('faithTag'); setShowExportModal(true); }}
            style={{
              padding: '6px 12px',
              background: PRIMARY_LIGHT,
              color: PRIMARY_COLOR,
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '13px',
            }}
          >
            <Download size={14} />
            导出
          </button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* 饼图 */}
          <div style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie
                  data={faithTagDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percentage }) => `${name} ${percentage}`}
                  labelLine={true}
                >
                  {faithTagDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value} 用户`, '数量']} />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
          
          {/* 列表 */}
          <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: PRIMARY_LIGHT }}>
                  <th style={{ padding: '10px', textAlign: 'left', color: PRIMARY_COLOR }}>标签</th>
                  <th style={{ padding: '10px', textAlign: 'right', color: PRIMARY_COLOR }}>用户数</th>
                  <th style={{ padding: '10px', textAlign: 'right', color: PRIMARY_COLOR }}>占比</th>
                </tr>
              </thead>
              <tbody>
                {faithTagDistribution.map((item, index) => (
                  <tr key={item.name} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ 
                        width: '12px', 
                        height: '12px', 
                        borderRadius: '3px', 
                        background: COLORS[index % COLORS.length],
                        display: 'inline-block'
                      }}></span>
                      {item.name}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>{item.value}</td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#666' }}>{item.percentage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 地区分布 */}
      <div style={{ 
        background: 'white', 
        borderRadius: '12px', 
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: PRIMARY_COLOR }}>
            <Globe size={20} />
            地区分布
          </h3>
          <button
            onClick={() => { setExportType('continent'); setShowExportModal(true); }}
            style={{
              padding: '6px 12px',
              background: PRIMARY_LIGHT,
              color: PRIMARY_COLOR,
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '13px',
            }}
          >
            <Download size={14} />
            导出
          </button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* 柱状图 */}
          <div style={{ height: '250px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={continentDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={80} />
                <Tooltip formatter={(value: number) => [`${value} 用户`, '数量']} />
                <Bar dataKey="value" fill={PRIMARY_COLOR} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* 可展开列表 */}
          <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
            {continentDistribution.map((item, index) => (
              <div key={item.name}>
                <div
                  onClick={() => handleContinentClick(item.name)}
                  style={{
                    padding: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    borderBottom: '1px solid #f0f0f0',
                    background: expandedContinent === item.name ? PRIMARY_LIGHT : 'transparent',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => { if (expandedContinent !== item.name) e.currentTarget.style.background = '#f9f9f9'; }}
                  onMouseLeave={e => { if (expandedContinent !== item.name) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {expandedContinent === item.name ? <ChevronDown size={16} color={PRIMARY_COLOR} /> : <ChevronRight size={16} color="#999" />}
                    <MapPin size={16} color={COLORS[index % COLORS.length]} />
                    <span>{item.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontWeight: 600, color: PRIMARY_COLOR }}>{item.value}</span>
                    <span style={{ color: '#666', fontSize: '13px' }}>{item.percentage}</span>
                  </div>
                </div>
                
                {/* 展开的国家列表 */}
                {expandedContinent === item.name && (
                  <div style={{ background: '#fafafa', padding: '8px 12px 8px 40px' }}>
                    {countryDistribution.length > 0 ? (
                      countryDistribution.map(country => (
                        <div key={country.country} style={{ 
                          padding: '6px 0', 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          fontSize: '13px',
                          color: '#666'
                        }}>
                          <span>{country.country}</span>
                          <span style={{ color: PRIMARY_COLOR }}>{country.count}</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '6px 0', color: '#999', fontSize: '13px' }}>
                        暂无数据
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 总体统计 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
        <StatCard
          title="总笔记数"
          value={stats.totalPosts}
          icon={<FileText size={24} />}
          color="#2563EB"
        />
        <StatCard
          title="总注册用户"
          value={stats.totalUsers}
          icon={<Users size={24} />}
          color="#2563EB"
        />
        <StatCard
          title="待审核内容"
          value={stats.pendingPosts + stats.pendingComments}
          icon={<ShieldCheck size={24} />}
          color="#2563EB"
        />
        <StatCard
          title="今日新增笔记"
          value={stats.todayPosts}
          icon={<MessageSquare size={24} />}
          color="#2563EB"
        />
      </div>

      {/* 趋势图表 */}
      <div style={{ 
        background: 'white', 
        borderRadius: '12px', 
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '30px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={20} />
            近7天数据趋势
          </h3>
          <button
            onClick={() => { setExportType('all'); setShowExportModal(true); }}
            style={{
              padding: '6px 12px',
              background: PRIMARY_LIGHT,
              color: PRIMARY_COLOR,
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '13px',
            }}
          >
            <Download size={14} />
            导出全部数据
          </button>
        </div>
        <div style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={postsTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="posts" stroke="#2563EB" strokeWidth={2} name="笔记" />
              <Line type="monotone" dataKey="users" stroke="#BE123C" strokeWidth={2} name="用户" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 快捷操作 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        <QuickAction
          title="藏书管理"
          description="管理经典藏书和章节"
          href="#/admin/books"
          color="#2563EB"
        />
        <QuickAction
          title="信仰百科"
          description="管理宗教百科内容"
          href="#/admin/religions"
          color="#2563EB"
        />
        <QuickAction
          title="标签管理"
          description="管理笔记标签"
          href="#/admin/tags"
          color="#2563EB"
        />
      </div>

      {/* 导出模态框 */}
      {showExportModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '400px',
            maxWidth: '90%',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: PRIMARY_COLOR }}>导出数据</h3>
              <button
                onClick={() => setShowExportModal(false)}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={20} color="#666" />
              </button>
            </div>
            
            {/* 导出类型选择 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#666', fontSize: '14px' }}>选择导出内容</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { key: 'all', label: '综合统计数据' },
                  { key: 'faithTag', label: '身份标签分布' },
                  { key: 'continent', label: '大洲分布' },
                  { key: 'country', label: '国家分布（当前选中大洲）' },
                ].map(option => (
                  <label key={option.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="exportType"
                      value={option.key}
                      checked={exportType === option.key}
                      onChange={() => setExportType(option.key as any)}
                      style={{ accentColor: PRIMARY_COLOR }}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
            
            {/* 时间范围 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#666', fontSize: '14px' }}>时间范围</label>
              <div style={{ padding: '10px', background: PRIMARY_LIGHT, borderRadius: '6px', color: '#666', fontSize: '13px' }}>
                {timeRange === 'custom' 
                  ? `${customDateRange.start || '未设置'} 至 ${customDateRange.end || '未设置'}`
                  : TIME_RANGES.find(r => r.key === timeRange)?.label || '近30天'
                }
              </div>
            </div>
            
            {/* 导出格式 */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#666', fontSize: '14px' }}>导出格式</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                {[
                  { key: 'csv', label: 'CSV', desc: '适合Excel和数据分析' },
                  { key: 'xlsx', label: 'Excel', desc: '保留格式' },
                ].map(format => (
                  <label 
                    key={format.key}
                    style={{ 
                      flex: 1,
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      cursor: 'pointer',
                      padding: '10px',
                      border: `2px solid ${exportFormat === format.key ? PRIMARY_COLOR : '#e0e0e0'}`,
                      borderRadius: '8px',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <input
                      type="radio"
                      name="exportFormat"
                      value={format.key}
                      checked={exportFormat === format.key}
                      onChange={() => setExportFormat(format.key as ExportFormat)}
                      style={{ accentColor: PRIMARY_COLOR }}
                    />
                    <div>
                      <div style={{ fontWeight: 500 }}>{format.label}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{format.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            
            {/* 导出按钮 */}
            <button
              onClick={handleExport}
              style={{
                width: '100%',
                padding: '12px',
                background: PRIMARY_COLOR,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Download size={18} />
              确认导出
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function StatCard({ title, value, change, positive, icon, color }: {
  title: string;
  value: number;
  change?: string;
  positive?: boolean;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div style={{
      background: 'white',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ color: '#666', margin: 0, fontSize: '14px' }}>{title}</p>
          <h2 style={{ margin: '10px 0', fontSize: '32px' }}>{value}</h2>
          {change && (
            <p style={{ 
              color: positive ? '#BE123C' : '#2563EB', 
              margin: 0, 
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              {positive ? '↑' : '↓'} {change} vs 昨日
            </p>
          )}
        </div>
        <div style={{ 
          width: '48px', 
          height: '48px', 
          borderRadius: '8px', 
          background: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function QuickAction({ title, description, href, color }: {
  title: string;
  description: string;
  href: string;
  color: string;
}) {
  return (
    <a href={href} style={{
      background: 'white',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      textDecoration: 'none',
      color: 'inherit',
      display: 'block',
      transition: 'transform 0.2s, box-shadow 0.2s',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
    }}
    >
      <h4 style={{ margin: '0 0 8px', color }}>{title}</h4>
      <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>{description}</p>
    </a>
  );
}

export default Dashboard;
