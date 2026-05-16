import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users, Settings, Share2, UserMinus, UserPlus, Shield, ChevronRight, X, MessageSquare, Bell, BellOff, Flame, Loader2 } from 'lucide-react';

const PRIMARY_COLOR = '#E11D48';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';

interface GroupChat {
  id: string;
  title: string;
  content: string;
  tags: string[];
  user_id: string;
  heat_count: number;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url: string;
  };
}

function GroupChatDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [group, setGroup] = useState<GroupChat | null>(null);
  const [groupOwner, setGroupOwner] = useState<{ username: string; avatar_url: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
  const [showSettings, setShowSettings] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  const currentUserId = localStorage.getItem('user_id');
  const isMember = currentUserId ? group?.tags?.includes(`member_${currentUserId}`) : false;
  const isOwner = currentUserId === group?.user_id;

  // 夜间模式颜色
  const bgColor = 'var(--bg-color)';
  const cardBgSecondary = 'var(--bg-secondary)';
  const textColor = 'var(--text-color)';
  const textSecondary = 'var(--text-secondary)';
  const borderColor = 'var(--border-color)';

  // 显示 toast 提示
  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  // 获取群聊信息
  useEffect(() => {
    const fetchGroupChat = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('select', 'id,title,content,tags,user_id,heat_count,created_at');
        params.append('id', `eq.${id}`);

        const res = await fetch(`/sb-api/rest/v1/posts?${params.toString()}`, {
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          }
        });

        if (!res.ok) {
          throw new Error('Failed to fetch group chat');
        }

        const data = await res.json();
        
        if (Array.isArray(data) && data.length > 0) {
          const groupData = data[0];
          setGroup(groupData);
          
          // 获取群主信息
          if (groupData.user_id) {
            const ownerParams = new URLSearchParams();
            ownerParams.append('select', 'username,avatar_url');
            ownerParams.append('user_id', `eq.${groupData.user_id}`);
            ownerParams.append('limit', '1');
            
            const ownerRes = await fetch(`/sb-api/rest/v1/profiles?${ownerParams.toString()}`, {
              headers: {
                'apikey': SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
              }
            });
            
            if (ownerRes.ok) {
              const ownerData = await ownerRes.json();
              if (ownerData && ownerData.length > 0) {
                setGroupOwner(ownerData[0]);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching group chat:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // 加载静音状态
    const savedMute = localStorage.getItem(`group_muted_${id}`);
    if (savedMute === 'true') {
      setIsMuted(true);
    }

    if (id) {
      fetchGroupChat();
    }
  }, [id]);

  // isOwner and isMember are already defined above

  // 加入群聊
  const handleJoinGroup = async () => {
    if (!currentUserId || !group) return;
    setIsJoining(true);
    try {
      const newTags = [...(group.tags || []), `member_${currentUserId}`];
      const res = await fetch(`/sb-api/rest/v1/posts?id=eq.${group.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ tags: newTags }),
      });
      if (res.ok) {
        setGroup({ ...group, tags: newTags });
        setToast('加入群聊成功！');
      } else {
        setToast('加入群聊失败');
      }
    } catch (error) {
      console.error('Error joining group:', error);
      setToast('加入群聊失败');
    } finally {
      setIsJoining(false);
    }
  };

  // 退出群聊
  const handleLeaveGroup = async () => {
    if (!currentUserId || !group) return;
    if (!confirm('确定要退出该群聊吗？')) return;
    try {
      const newTags = (group.tags || []).filter(t => t !== `member_${currentUserId}`);
      const res = await fetch(`/sb-api/rest/v1/posts?id=eq.${group.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ tags: newTags }),
      });
      if (res.ok) {
        setGroup({ ...group, tags: newTags });
        showToast('已退出群聊');
        setTimeout(() => navigate('/messages'), 1000);
      }
    } catch (error) {
      console.error('Error leaving group:', error);
    }
  };

  // 分享群聊
  const handleShare = () => {
    setShowSettings(false);
    const shareUrl = `${window.location.origin}/group-chat/${id}`;
    if (navigator.share) {
      navigator.share({
        title: group?.title || '群聊',
        text: group?.content || '邀请你加入群聊',
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      showToast('分享链接已复制到剪贴板');
    }
  };

  // 切换静音状态
  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    try {
      localStorage.setItem(`group_muted_${id}`, String(newMuted));
    } catch (e) {
      console.error('Failed to save mute status:', e);
    }
    showToast(newMuted ? '已关闭消息提醒' : '已开启消息提醒');
  };

  // 群管理
  const handleGroupManagement = () => {
    setShowSettings(false);
    showToast('仅群主可管理');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bgColor }}>
        <div className="w-8 h-8 border-3 border-[#E11D48] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: bgColor }}>
        <p className="mb-4" style={{ color: textSecondary }}>群聊不存在或已被删除</p>
        <button
          onClick={() => navigate('/messages')}
          className="px-4 py-2 rounded-xl text-sm font-medium text-white"
          style={{ backgroundColor: PRIMARY_COLOR }}
        >
          返回消息
        </button>
      </div>
    );
  }

  const tags = group.tags?.filter(tag => tag !== '__group_chat__') || [];

  return (
    <div className="min-h-screen theme-transition" style={{ backgroundColor: bgColor }}>
      {/* Toast 提示 */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-sm text-white" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <header 
        className="sticky top-0 z-40 px-4 py-3 border-b flex items-center gap-3 theme-transition" 
        style={{ backgroundColor: bgColor, borderColor }}
      >
        <button onClick={() => navigate('/messages')} className="p-2 -ml-2" style={{ color: textColor }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="flex-1 text-lg font-bold truncate theme-transition" style={{ color: textColor }}>
          {group.title}
        </h1>
        <button onClick={() => setShowSettings(true)} className="p-2" style={{ color: textColor }}>
          <Settings className="w-5 h-5" />
        </button>
      </header>

      {/* 群聊头像和名称 */}
      <div className="p-4 text-center">
        <div 
          className="w-20 h-20 rounded-2xl mx-auto mb-3 flex items-center justify-center"
          style={{ backgroundColor: `${PRIMARY_COLOR}15` }}
        >
          <Users className="w-10 h-10" style={{ color: PRIMARY_COLOR }} />
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: textColor }}>{group.title}</h2>
        {group.content && (
          <p className="text-sm mb-3" style={{ color: textSecondary }}>{group.content}</p>
        )}
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {tags.map((tag) => (
            <span 
              key={tag} 
              className="px-3 py-1 text-xs rounded-full"
              style={{ backgroundColor: `${PRIMARY_COLOR}15`, color: PRIMARY_COLOR }}
            >
              {tag}
            </span>
          ))}
        </div>
        
        {/* 操作按钮 */}
        <div className="flex justify-center gap-3">
          {!isMember ? (
            <button
              onClick={handleJoinGroup}
              disabled={isJoining}
              className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-medium text-white"
              style={{ backgroundColor: PRIMARY_COLOR }}
            >
              {isJoining ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              加入群聊
            </button>
          ) : (
            <>
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
                style={{ backgroundColor: PRIMARY_COLOR }}
              >
                <Share2 className="w-4 h-4" />
                邀请
              </button>
              <button
                onClick={toggleMute}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                style={{ 
                  backgroundColor: cardBgSecondary,
                  color: isMuted ? textSecondary : textColor
                }}
              >
                {isMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                {isMuted ? '已静音' : '消息提醒'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="px-4 mb-4">
        <div
          className="flex items-center justify-center rounded-full p-1"
          style={{ backgroundColor: cardBgSecondary }}
        >
          {[
            { id: 'info', label: '群信息' },
            { id: 'members', label: '成员' },
            { id: 'announce', label: '公告' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 py-2 text-sm font-medium rounded-full transition-colors"
              style={{
                backgroundColor: activeTab === tab.id ? PRIMARY_COLOR : 'transparent',
                color: activeTab === tab.id ? '#FFFFFF' : textSecondary,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 内容 */}
      <div className="px-4">
        {activeTab === 'info' && (
          <div className="space-y-4">
            {/* 群信息卡片 */}
            <div className="p-4 rounded-xl" style={{ backgroundColor: cardBgSecondary }}>
              <h3 className="font-medium mb-3" style={{ color: textColor }}>群信息</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span style={{ color: textSecondary }}>群成员</span>
                  <span style={{ color: textColor }}>1 人</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: textSecondary }}>创建时间</span>
                  <span style={{ color: textColor }}>{new Date(group.created_at).toLocaleDateString('zh-CN')}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: textSecondary }}>群热度</span>
                  <span style={{ color: textColor }}>
                    <Flame className="w-4 h-4 inline mr-1" style={{ color: PRIMARY_COLOR }} />
                    {group.heat_count}
                  </span>
                </div>
              </div>
            </div>

            {/* 公告卡片 */}
            <div className="p-4 rounded-xl" style={{ backgroundColor: cardBgSecondary }}>
              <h3 className="font-medium mb-3" style={{ color: textColor }}>群公告</h3>
              <p style={{ color: textSecondary }}>暂无公告</p>
            </div>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="space-y-4">
            {/* 成员列表 - UI框架 */}
            <div className="p-4 rounded-xl" style={{ backgroundColor: cardBgSecondary }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium" style={{ color: textColor }}>群成员</h3>
                <span className="text-sm" style={{ color: textSecondary }}>1 人</span>
              </div>
              <div className="space-y-3">
                {/* 群主 */}
                <div className="flex items-center gap-3 p-2 rounded-lg" style={{ backgroundColor: `${PRIMARY_COLOR}08` }}>
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-[#E11D48]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm" style={{ color: textColor }}>{groupOwner?.username || '群主'}</p>
                    <p className="text-xs" style={{ color: textSecondary }}>群主</p>
                  </div>
                </div>
                {/* 更多成员占位 */}
                <p className="text-center text-sm py-4" style={{ color: textSecondary }}>
                  更多成员加载中...
                </p>
              </div>
            </div>

            {/* 管理员操作按钮（仅群主/管理员可见） */}
            {isOwner && (
              <button
                className="w-full py-3 rounded-xl text-sm font-medium"
                style={{ backgroundColor: cardBgSecondary, color: textColor }}
              >
                <UserMinus className="w-4 h-4 inline mr-2" />
                移除成员
              </button>
            )}
          </div>
        )}

        {activeTab === 'announce' && (
          <div className="p-4 rounded-xl text-center" style={{ backgroundColor: cardBgSecondary }}>
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: textSecondary }} />
            <p style={{ color: textSecondary }}>暂无公告</p>
            {isOwner && (
              <button
                className="mt-4 px-4 py-2 rounded-xl text-sm font-medium text-white"
                style={{ backgroundColor: PRIMARY_COLOR }}
              >
                发布公告
              </button>
            )}
          </div>
        )}
      </div>

      {/* 设置弹窗 */}
      {showSettings && (
        <div 
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => setShowSettings(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div 
            className="relative w-full max-w-md bg-white rounded-t-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">群聊设置</h3>
              <button 
                onClick={() => setShowSettings(false)}
                className="p-1.5 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-4 space-y-2">
              <button 
                onClick={handleShare}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50"
              >
                <Share2 className="w-5 h-5 text-gray-500" />
                <span className="text-gray-900">分享群聊</span>
                <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
              </button>
              
              <button 
                onClick={toggleMute}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50"
              >
                <Bell className="w-5 h-5 text-gray-500" />
                <span className="text-gray-900">{isMuted ? '开启' : '关闭'}消息提醒</span>
                <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
              </button>

              <button 
                onClick={handleGroupManagement}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50"
              >
                <Shield className="w-5 h-5 text-gray-500" />
                <span className="text-gray-900">群管理</span>
                <ChevronRight className="w-5 h-5 text-gray-400 ml-auto" />
              </button>

              <button 
                onClick={handleLeaveGroup}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50"
              >
                <UserMinus className="w-5 h-5 text-red-500" />
                <span className="text-red-500">退出群聊</span>
              </button>
            </div>

            <div className="p-4 pb-8">
              <button
                onClick={() => setShowSettings(false)}
                className="w-full py-3 rounded-xl font-medium"
                style={{ backgroundColor: cardBgSecondary, color: textColor }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GroupChatDetail;
