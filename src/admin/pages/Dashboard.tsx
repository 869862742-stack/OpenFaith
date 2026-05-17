import React, { useState, useEffect } from 'react';
import { getSupabaseUrl } from '../supabase/client';
import { FileText, Users, ShieldCheck, Flag, MessageSquare, Wifi, WifiOff, Clock, UserPlus, BookOpen, MessageCircle } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// Service Role Key for bypassing RLS
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';

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

  // 获取统计数据
  const loadStats = async () => {
    const supabaseUrl = getSupabaseUrl();
    
    try {
      // Get today's date range
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();
      
      // 5分钟前的时间（用于计算在线人数）
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
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
        todayCommentsRes
      ] = await Promise.all([
        // 今日新增笔记
        fetch(`${supabaseUrl}/rest/v1/posts?created_at=gte.${todayStart}&created_at=lte.${todayEnd}&select=id`, { headers }),
        // 今日新增用户
        fetch(`${supabaseUrl}/rest/v1/profiles?created_at=gte.${todayStart}&created_at=lte.${todayEnd}&select=id`, { headers }),
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
        // 今日新增笔记（posts）
        fetch(`${supabaseUrl}/rest/v1/posts?created_at=gte.${todayStart}&created_at=lte.${todayEnd}&select=id`, { headers }),
        // 今日新增评论
        fetch(`${supabaseUrl}/rest/v1/comments?created_at=gte.${todayStart}&created_at=lte.${todayEnd}&select=id`, { headers }),
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
        todayCommentsData
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
      ]);

      // 今日活跃用户（今天有 last_online_at 记录的用户）
      const todayActiveUsersRes = await fetch(
        `${supabaseUrl}/rest/v1/profiles?last_online_at=gte.${todayStart}&select=id`,
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

  useEffect(() => {
    loadStats();
    // 每30秒自动刷新
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

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
          borderTop: '3px solid #E11D48',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* 标题栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>数据概览</h2>
        <button 
          onClick={handleRefresh}
          style={{
            padding: '8px 16px',
            background: '#E11D48',
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
          <Clock size={16} />
          刷新数据
        </button>
      </div>

      {/* 在线状态统计卡片 - 特别突出显示 */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: '20px', 
        marginBottom: '20px',
        padding: '20px',
        background: 'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)',
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
        <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 600 }}>📊 今日数据</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <StatCard
            title="新增笔记"
            value={stats.todayNotes}
            icon={<BookOpen size={24} />}
            color="#E11D48"
          />
          <StatCard
            title="新增评论"
            value={stats.todayComments}
            icon={<MessageCircle size={24} />}
            color="#E11D48"
          />
          <StatCard
            title="新增用户"
            value={stats.todayUsers}
            icon={<Users size={24} />}
            color="#E11D48"
          />
          <StatCard
            title="待处理举报"
            value={stats.pendingReports}
            icon={<Flag size={24} />}
            color="#E11D48"
          />
        </div>
      </div>

      {/* 总体统计 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
        <StatCard
          title="总笔记数"
          value={stats.totalPosts}
          change="+12%"
          positive={true}
          icon={<FileText size={24} />}
          color="#E11D48"
        />
        <StatCard
          title="总注册用户"
          value={stats.totalUsers}
          change="+8%"
          positive={true}
          icon={<Users size={24} />}
          color="#E11D48"
        />
        <StatCard
          title="待审核内容"
          value={stats.pendingPosts + stats.pendingComments}
          change="-5%"
          positive={false}
          icon={<ShieldCheck size={24} />}
          color="#E11D48"
        />
        <StatCard
          title="今日新增笔记"
          value={stats.todayPosts}
          change="+5%"
          positive={true}
          icon={<MessageSquare size={24} />}
          color="#E11D48"
        />
      </div>

      {/* 趋势图表 */}
      <div style={{ 
        background: 'white', 
        borderRadius: '8px', 
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '30px'
      }}>
        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={20} />
          近7天数据趋势
        </h3>
        <div style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={postsTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="posts" stroke="#E11D48" strokeWidth={2} name="笔记" />
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
          color="#E11D48"
        />
        <QuickAction
          title="信仰百科"
          description="管理宗教百科内容"
          href="#/admin/religions"
          color="#E11D48"
        />
        <QuickAction
          title="标签管理"
          description="管理笔记标签"
          href="#/admin/tags"
          color="#E11D48"
        />
      </div>

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
              color: positive ? '#BE123C' : '#E11D48', 
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
