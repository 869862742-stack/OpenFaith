import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, CloudRain, Waves, TreePine, Wind, Piano, Music, Users } from 'lucide-react';
import { useThemeContext } from '../contexts/ThemeContext';
import Sidebar from '../components/Sidebar';
import SearchBar from '../components/SearchBar';
import ChannelTabs from '../components/ChannelTabs';
import HotRanking from '../components/HotRanking';
import PostCard from '../components/PostCard';
import BottomNav from '../components/BottomNav';
import PostDetailModal from '../components/PostDetailModal';
import { useTranslation } from 'react-i18next';
import { cachedFetch } from '../utils/apiCache';
import { filterOutGroupChats } from '../utils/postUtils';

const defaultTags = [
  '基督教', '伊斯兰教', '犹太教', '佛教', '印度教', '道教', '锡克教',
  '巴哈伊教', '摩门教', '耶和华见证人', '琐罗亚斯德教', '诺斯替',
  '卡巴拉', '神道教', '耆那教', '德鲁兹教', '约鲁巴教', '伏都教',
  '雅兹迪', '曼达安', '玛雅/阿兹特克', '毛利宗教', '天理教', '天道教',
  '高台教'
];

function Home() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { primaryColor } = useThemeContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('recommend');
  const [posts, setPosts] = useState<any[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagModal, setShowTagModal] = useState(false);
  const [customTag, setCustomTag] = useState('');
  const [selectedPostIndex, setSelectedPostIndex] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [rooms, setRooms] = useState<any[]>([]);
  const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';

  // 获取在线人数
  const fetchOnlineUsers = async () => {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const headers = {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      };
      const res = await cachedFetch(
        `/sb-api/rest/v1/profiles?last_online_at=gte.${fiveMinutesAgo}&select=id`,
        { headers },
        { ttl: 30000 }
      );
      if (Array.isArray(res)) {
        setOnlineUsers(res.length);
      }
    } catch (e) {
      console.error('Failed to fetch online users:', e);
    }
  };

  // 获取活跃房间
  const fetchRooms = async () => {
    try {
      const headers = {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      };
      // 获取最近创建且有人的房间
      const res = await cachedFetch(
        '/sb-api/rest/v1/rooms?user_count=gt.0&order=last_activity_at.desc&limit=6&select=*',
        { headers },
        { ttl: 30000 }
      );
      if (Array.isArray(res)) {
        setRooms(res);
      }
    } catch (e) {
      console.error('Failed to fetch rooms:', e);
    }
  };

  useEffect(() => {
    fetchPosts();
    fetchOnlineUsers();
    fetchRooms();
    // 每30秒刷新在线人数
    const interval = setInterval(fetchOnlineUsers, 30000);
    // 每分钟刷新房间列表
    const roomInterval = setInterval(fetchRooms, 60000);
    // 安全获取禁言状态
    try {
      setIsMuted(localStorage.getItem('of_muted_notice') === '1');
    } catch (e) {
      console.error('Failed to get muted notice status:', e);
      setIsMuted(false);
    }
    return () => {
      clearInterval(interval);
      clearInterval(roomInterval);
    };
  }, []);

  // 处理排行榜点击 - 根据 postId 打开笔记详情
  const handlePostClick = async (postId: string) => {
    // 先在当前 posts 中查找
    const existingIndex = posts.findIndex(p => p.id === postId);
    if (existingIndex !== -1) {
      setSelectedPostIndex(existingIndex);
      return;
    }

    // 如果找不到，从 API 拉取单个笔记数据
    try {
      const headers = {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      };

      // 并行获取 post 和 profiles
      const [postData, profilesData] = await Promise.all([
        cachedFetch(`/sb-api/rest/v1/posts?id=eq.${postId}&select=*`, { headers }, { ttl: 60000 }),
        cachedFetch('/sb-api/rest/v1/profiles?select=user_id,username,avatar_url,faith_tag', { headers }, { ttl: 300000 })
      ]);

      if (!Array.isArray(postData) || postData.length === 0) {
        console.error('Post not found:', postId);
        return;
      }

      const post = postData[0];

      // 构建 profiles 映射
      const profilesMap: Record<string, any> = {};
      if (Array.isArray(profilesData)) {
        profilesData.forEach((p: any) => { profilesMap[p.user_id] = p; });
      }

      const author = profilesMap[post.user_id] || {};
      const formattedPost = {
        id: post.id,
        title: post.title,
        content: post.content,
        coverImage: post.cover_image || 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=400&h=600&fit=crop',
        author: {
          id: post.user_id || '',
          nickname: author.username || '未知用户',
          avatar: author.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1',
          faithTag: author.faith_tag || '寻求者'
        },
        likes_count: post.likes_count || 0,
        comments_count: post.comments_count || 0,
        tags: post.tags || [],
        createdAt: post.created_at,
        images: post.images || [],
        heat_count: post.heat_count || 0,
        views_count: post.views_count || 0,
        shares_count: post.shares_count || 0,
        favorites_count: post.favorites_count || 0,
      };

      // 添加到 posts 列表开头并打开详情
      setPosts(prev => [formattedPost, ...prev]);
      setSelectedPostIndex(0);
    } catch (error) {
      console.error('Failed to load post:', error);
    }
  };

  const fetchPosts = async () => {
    try {
      const headers = {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      };

      // 并行请求 posts 和 profiles（解决 Supabase 无外键约束导致的 PGRST200 错误）
      const [postsData, profilesData] = await Promise.all([
        cachedFetch('/sb-api/rest/v1/posts?status=eq.published&select=*&order=created_at.desc&limit=20', { headers }, { ttl: 60000 }),
        cachedFetch('/sb-api/rest/v1/profiles?select=user_id,username,avatar_url,faith_tag', { headers }, { ttl: 300000 })
      ]);

      if (!Array.isArray(postsData) || postsData.length === 0) {
        setPosts([]);
        return;
      }

      // 前端过滤：排除群聊记录
      const filteredPosts = filterOutGroupChats(postsData);

      // 构建 profiles 映射
      const profilesMap: Record<string, any> = {};
      if (Array.isArray(profilesData)) {
        profilesData.forEach((p: any) => { profilesMap[p.user_id] = p; });
      }

      // 合并数据
      const formattedPosts = filteredPosts.map((post: any) => {
        const author = profilesMap[post.user_id] || {};
        return {
          id: post.id,
          title: post.title,
          content: post.content,
          coverImage: post.cover_image || 'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?w=400&h=600&fit=crop',
          author: {
            id: post.user_id || '',
            nickname: author.username || '未知用户',
            avatar: author.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user1',
            faithTag: author.faith_tag || '寻求者'
          },
          likes_count: post.likes_count || 0,
          comments_count: post.comments_count || 0,
          tags: post.tags || [],
          createdAt: post.created_at,
          images: post.images || [],
          heat_count: post.heat_count || 0,
          views_count: post.views_count || 0,
          shares_count: post.shares_count || 0,
          favorites_count: post.favorites_count || 0,
        };
      });

      setPosts(formattedPosts);
    } catch (error) {
      console.error('Fetch posts error:', error);
      setPosts([]);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const addCustomTag = () => {
    if (customTag && !selectedTags.includes(customTag)) {
      setSelectedTags(prev => [...prev, customTag]);
      setCustomTag('');
    }
  };

  const confirmTags = () => {
    setShowTagModal(false);
    if (selectedTags.length > 0) {
      setActiveTab('tags');
    }
  };

  const filteredPosts = activeTab === 'following' ? [] : 
    (selectedTags.length > 0 ? posts.filter(post => post.tags?.some((tag: string) => selectedTags.includes(tag))) : posts);
  
  // 夜间模式颜色
  const bgColor = 'var(--bg-color)';
  const cardBg = 'var(--bg-secondary)';
  const textColor = 'var(--text-color)';
  const textSecondary = 'var(--text-secondary)';
  const borderColor = 'var(--border-color)';

  return (
    <div className="min-h-screen theme-transition" style={{ backgroundColor: bgColor }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="pb-20">
        {/* 禁言提示 */}
        {isMuted && (
          <div className="mx-4 mt-2 px-4 py-2.5 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center gap-2 text-sm text-yellow-700">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>你的账号已被禁言，评论和发布功能暂时受限</span>
          </div>
        )}
        <header className="sticky top-0 z-40 px-4 py-3 border-b theme-transition" style={{ backgroundColor: bgColor, borderColor }}>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(true)} 
              className="p-2 -ml-2 rounded-xl theme-transition"
              style={{ backgroundColor: cardBg }}
            >
              <svg className="w-6 h-6" style={{ color: primaryColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <SearchBar />
          </div>
          <ChannelTabs activeTab={activeTab} onTabChange={(tab) => {
            setActiveTab(tab);
            if (tab === 'tags') setShowTagModal(true);
          }} />
        </header>

        <HotRanking onPostClick={handlePostClick} />

        {/* 静默房间入口已移至消息TAB */}

        {selectedTags.length > 0 && activeTab === 'tags' && (
          <div className="px-4 mb-2 flex items-center gap-2 flex-wrap">
            <span className="text-xs" style={{ color: textSecondary }}>{t('home.selectedTags') || '已选标签'}：</span>
            {selectedTags.map(tag => (
              <span 
                key={tag} 
                className="px-2 py-0.5 text-xs rounded-full flex items-center gap-1"
                style={{ backgroundColor: `${primaryColor}1A`, color: primaryColor }}
              >
                {tag}
                <button onClick={() => toggleTag(tag)}>×</button>
              </span>
            ))}
            <button 
              onClick={() => { setSelectedTags([]); setActiveTab('recommend'); }} 
              className="text-xs"
              style={{ color: textSecondary }}
            >
              {t('common.cancel') || '取消'}
            </button>
          </div>
        )}

        <main className="px-4 overflow-y-auto" style={{ height: 'calc(100vh - 280px)' }}>
          {filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <p style={{ color: textSecondary }}>{t('common.noData') || '暂无内容'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredPosts.map((post, index) => (
                <div key={post.id}>
                  <PostCard 
                    post={post} 
                    onClick={() => setSelectedPostIndex(index)}
                  />
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      <BottomNav />

      {/* 全屏笔记详情 */}
      {selectedPostIndex !== null && (
        <PostDetailModal
          posts={filteredPosts}
          initialIndex={selectedPostIndex}
          onClose={() => setSelectedPostIndex(null)}
        />
      )}

      {showTagModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setShowTagModal(false)}>
          <div 
            className="w-full rounded-t-2xl p-6 max-h-[80vh] theme-transition" 
            style={{ backgroundColor: bgColor }} 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: textColor }}>{t('home.selectTags') || '选择标签'}</h3>
              <button onClick={() => setShowTagModal(false)}>
                <svg className="w-5 h-5" style={{ color: textSecondary }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm mb-2" style={{ color: textSecondary }}>{t('home.addCustomTag') || '添加自定义标签'}</p>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={customTag} 
                  onChange={(e) => setCustomTag(e.target.value)} 
                  placeholder={t('home.tagPlaceholder') || '输入标签'} 
                  className="flex-1 h-10 px-4 rounded-xl text-sm border theme-transition" 
                  style={{ backgroundColor: cardBg, borderColor, color: textColor }}
                />
                <button 
                  onClick={addCustomTag} 
                  className="px-4 h-10 rounded-xl text-sm whitespace-nowrap text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  {t('common.confirm') || '确定'}
                </button>
              </div>
            </div>

            <p className="text-sm mb-2" style={{ color: textSecondary }}>{t('home.tagCategory') || '标签分类'}</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {defaultTags.map(tag => (
                <button 
                  key={tag} 
                  onClick={() => toggleTag(tag)} 
                  className="w-full flex items-center gap-3 p-3 rounded-xl theme-transition"
                  style={{ backgroundColor: cardBg }}
                >
                  <div 
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                    style={{ 
                      borderColor: selectedTags.includes(tag) ? primaryColor : borderColor,
                      backgroundColor: selectedTags.includes(tag) ? primaryColor : 'transparent'
                    }}
                  >
                    {selectedTags.includes(tag) && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <span className="text-sm" style={{ color: textColor }}>{tag}</span>
                </button>
              ))}
            </div>

            <button 
              onClick={confirmTags} 
              className="w-full mt-4 py-3 rounded-xl font-medium text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {t('common.confirm') || '确定'}（{t('common.selected') || '已选'} {selectedTags.length} {t('common.count') || '个'})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
