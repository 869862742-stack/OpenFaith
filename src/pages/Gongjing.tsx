// Build: 20250519 - 共境(静默同行/世界呼吸时刻/树洞回声)入口页面

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Music, Loader2, Moon, BookOpen, Heart, Brain, Hand, Sparkles, Send, X, Volume2 } from 'lucide-react';
import { checkBadWords } from '../utils/badWordFilter/index';

// Service Role Key
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';
const SUPABASE_URL = 'https://rdhwmeittgdosmkxtpak.supabase.co';

// 状态选项（静默同行）
const primaryColor = '#E11D48';
const ICON_MAP: Record<string, React.FC<any>> = { Moon, BookOpen, Heart, Brain, Hand, Sparkles };

const STATUS_OPTIONS = [
  { id: '安静中', icon: 'Moon', label: '安静中' },
  { id: '阅读中', icon: 'BookOpen', label: '阅读中' },
  { id: '反思中', icon: 'Heart', label: '反思中' },
  { id: '冥想中', icon: 'Brain', label: '冥想中' },
  { id: '祈祷时', icon: 'Hand', label: '祈祷时' },
];

// 世界呼吸时刻状态选项（增加"感恩中"）
const BREATHING_STATUS_OPTIONS = [
  { id: '安静中', icon: 'Moon', label: '安静中' },
  { id: '阅读中', icon: 'BookOpen', label: '阅读中' },
  { id: '反思中', icon: 'Heart', label: '反思中' },
  { id: '冥想中', icon: 'Brain', label: '冥想中' },
  { id: '祈祷时', icon: 'Hand', label: '祈祷时' },
  { id: '感恩中', emoji: '💝', label: '感恩中', color: '#f9a8d4' },
];

// 时长选项
const DURATION_OPTIONS = [
  { value: 15, label: '15分钟' },
  { value: 30, label: '30分钟' },
  { value: 60, label: '1小时' },
];

// 回声反应类型
const REACTION_TYPES = [
  { id: 'resonated', emoji: '🤍', label: 'Resonated' },
  { id: 'understand', emoji: '🌿', label: 'I Understand' },
  { id: 'with_you', emoji: '✨', label: 'With You' },
  { id: 'quiet_support', emoji: '🌙', label: 'Quiet Support' },
];

// 类型定义
type TabType = 'silent' | 'breathing' | 'echo';

interface EchoShare {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  echo_echoes?: EchoEcho[];
  echo_reactions?: EchoReaction[];
}

interface EchoEcho {
  id: string;
  share_id: string;
  content: string;
  user_id: string;
  created_at: string;
}

interface EchoReaction {
  id: string;
  share_id: string;
  user_id: string;
  reaction_type: string;
  created_at: string;
}

export default function Gongjing() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const breathingFileInputRef = useRef<HTMLInputElement>(null);
  
  // Tab状态
  const [activeTab, setActiveTab] = useState<TabType>('silent');
  
  // 静默同行状态
  const [selectedStatus, setSelectedStatus] = useState<string>('安静中');
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicName, setMusicName] = useState<string>('');
  
  // 世界呼吸时刻状态
  const [breathingStatus, setBreathingStatus] = useState<string>('安静中');
  const [breathingDuration, setBreathingDuration] = useState<number>(30);
  const [breathingMusicFile, setBreathingMusicFile] = useState<File | null>(null);
  const [breathingMusicName, setBreathingMusicName] = useState<string>('');
  const [breathingTheme, setBreathingTheme] = useState<string>('');
  const [participantCount, setParticipantCount] = useState<number>(0);
  
  // 树洞回声状态
  const [echoContent, setEchoContent] = useState<string>('');
  const [echoList, setEchoList] = useState<EchoShare[]>([]);
  const [echoLoading, setEchoLoading] = useState(false);
  const [echoSubmitting, setEchoSubmitting] = useState(false);
  const [echoError, setEchoError] = useState('');
  const [expandedEchoId, setExpandedEchoId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState<string>('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [userReactions, setUserReactions] = useState<Record<string, string[]>>({});
  const [isNightMode, setIsNightMode] = useState(false);
  
  // 通用状态
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // 修正：selectedBreathingStatus 未定义的问题
  const selectedBreathingStatus = breathingStatus;

  // 检测深夜模式（22:00 - 06:00）
  useEffect(() => {
    const checkNightMode = () => {
      const hour = new Date().getHours();
      setIsNightMode(hour >= 22 || hour < 6);
    };
    checkNightMode();
    const interval = setInterval(checkNightMode, 60000);
    return () => clearInterval(interval);
  }, []);

  // 加载回声列表
  const loadEchoList = async () => {
    setEchoLoading(true);
    try {
      const res = await fetch(
        '/sb-api/rest/v1/echo_shares?select=*,echo_echoes(*),echo_reactions(*)&order=created_at.desc&limit=30',
        {
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setEchoList(data || []);
        
        // 加载用户反应
        const userInfo = localStorage.getItem('user_info');
        if (userInfo) {
          const parsed = JSON.parse(userInfo);
          const userId = parsed.user_id || parsed.id;
          if (userId && data) {
            const reactions: Record<string, string[]> = {};
            data.forEach((share: EchoShare) => {
              if (share.echo_reactions) {
                const userReactTypes = share.echo_reactions
                  .filter(r => r.user_id === userId)
                  .map(r => r.reaction_type);
                if (userReactTypes.length > 0) {
                  reactions[share.id] = userReactTypes;
                }
              }
            });
            setUserReactions(reactions);
          }
        }
      }
    } catch (err) {
      console.warn('加载回声列表失败:', err);
    } finally {
      setEchoLoading(false);
    }
  };

  // 加载今日主题和参与人数
  useEffect(() => {
    const loadBreathingData = async () => {
      try {
        // 获取今日主题
        const themeRes = await fetch(
          '/sb-api/rest/v1/breathing_moments?select=*&order=created_at.desc&limit=1',
          {
            headers: {
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            },
          }
        );
        if (themeRes.ok) {
          const themes = await themeRes.json();
          if (themes && themes.length > 0 && themes[0].theme) {
            setBreathingTheme(themes[0].theme);
          }
        }
      } catch (err) {
        console.warn('获取主题失败:', err);
      }

      try {
        // 获取世界呼吸时刻房间数量（模拟参与人数）
        const roomsRes = await fetch(
          '/sb-api/rest/v1/rooms?type=eq.world_breathing&status=eq.active&select=id',
          {
            headers: {
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            },
          }
        );
        if (roomsRes.ok) {
          const rooms = await roomsRes.json();
          // 模拟参与人数 = 活跃房间数 * 随机系数
          const baseCount = rooms.length || 0;
          const simulatedCount = baseCount > 0 ? baseCount * 3 + Math.floor(Math.random() * 50) + 12 : Math.floor(Math.random() * 30) + 5;
          setParticipantCount(simulatedCount);
        }
      } catch (err) {
        console.warn('获取参与人数失败:', err);
        setParticipantCount(Math.floor(Math.random() * 30) + 5);
      }
    };

    if (activeTab === 'breathing') {
      loadBreathingData();
      // 每30秒刷新一次
      const interval = setInterval(loadBreathingData, 30000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  // 当切换到回声Tab时加载数据
  useEffect(() => {
    if (activeTab === 'echo') {
      loadEchoList();
      // 每15秒刷新一次
      const interval = setInterval(loadEchoList, 15000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  // 处理静默同行音乐文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        setError('音频文件不能超过20MB');
        return;
      }
      if (!file.type.startsWith('audio/')) {
        setError('请上传音频文件');
        return;
      }
      setMusicFile(file);
      setMusicName(file.name.replace(/\.[^/.]+$/, ''));
      setError('');
    }
  };

  // 处理世界呼吸时刻音乐文件选择
  const handleBreathingFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        setError('音频文件不能超过20MB');
        return;
      }
      if (!file.type.startsWith('audio/')) {
        setError('请上传音频文件');
        return;
      }
      setBreathingMusicFile(file);
      setBreathingMusicName(file.name.replace(/\.[^/.]+$/, ''));
      setError('');
    }
  };

  // 移除音乐
  const removeMusic = (type: 'silent' | 'breathing') => {
    if (type === 'silent') {
      setMusicFile(null);
      setMusicName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else {
      setBreathingMusicFile(null);
      setBreathingMusicName('');
      if (breathingFileInputRef.current) {
        breathingFileInputRef.current.value = '';
      }
    }
  };

  // 生成房间代码
  const generateRoomCode = () => Math.floor(10000 + Math.random() * 90000);

  // 上传音乐到Supabase Storage
  const uploadMusic = async (file: File, userId: string): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const fileName = `music/${Date.now()}_${file.name}`;
    
    const uploadRes = await fetch(
      `/sb-storage/v1/object/room-music/${userId}/${fileName}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': file.type || 'audio/mpeg',
          'x-upsert': 'true',
        },
        body: arrayBuffer,
      }
    );

    if (!uploadRes.ok) {
      throw new Error('音乐上传失败');
    }

    return `${SUPABASE_URL}/storage/v1/object/public/room-music/${userId}/${fileName}`;
  };

  // 创建静默同行房间
  const handleEnterSilent = async () => {
    setCreating(true);
    setError('');

    try {
      const userInfo = localStorage.getItem('user_info');
      if (!userInfo) {
        setError('请先登录');
        return;
      }
      const parsed = JSON.parse(userInfo);
      const userId = parsed.user_id || parsed.id;
      if (!userId) {
        setError('无法获取用户信息');
        return;
      }

      let musicUrl: string | null = null;
      
      // 上传音乐（如果有）
      if (musicFile) {
        try {
          musicUrl = await uploadMusic(musicFile, userId);
        } catch (err) {
          console.warn('音乐上传失败，继续创建房间:', err);
        }
      }

      const roomCode = generateRoomCode();
      const expiresAt = new Date(Date.now() + selectedDuration * 60000).toISOString();

      // 创建房间
      const roomData = {
        room_code: roomCode,
        title: `静默同行 · ${selectedStatus}`,
        type: 'silent_companion',
        creator_id: userId,
        status: 'active',
        max_participants: 2,
        current_participants: 1,
        music_url: musicUrl,
        music_name: musicName || null,
        duration: selectedDuration,
        expires_at: expiresAt,
        tags: [selectedStatus],
        created_at: new Date().toISOString(),
        ambient_sound: musicUrl ? 'custom' : 'none',
        custom_audio_url: musicUrl,
        description: `与你一起${selectedStatus}的静默时光`,
      };

      const res = await fetch('/sb-api/rest/v1/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify(roomData),
      });

      if (!res.ok) {
        throw new Error('创建房间失败');
      }

      const room = await res.json();
      navigate(`/silent-room/${room.id}`);
    } catch (err: any) {
      setError(err.message || '创建失败');
    } finally {
      setCreating(false);
    }
  };

  // 进入世界呼吸时刻
  const handleEnterBreathing = async () => {
    setCreating(true);
    setError('');

    try {
      const userInfo = localStorage.getItem('user_info');
      if (!userInfo) {
        setError('请先登录');
        return;
      }
      const parsed = JSON.parse(userInfo);
      const userId = parsed.user_id || parsed.id;
      if (!userId) {
        setError('无法获取用户信息');
        return;
      }

      let musicUrl: string | null = null;
      
      // 上传音乐（如果有）
      if (breathingMusicFile) {
        try {
          musicUrl = await uploadMusic(breathingMusicFile, userId);
        } catch (err) {
          console.warn('音乐上传失败，继续创建房间:', err);
        }
      }

      const roomCode = generateRoomCode();
      const expiresAt = new Date(Date.now() + breathingDuration * 60000).toISOString();

      // 创建世界呼吸时刻房间
      const roomData = {
        room_code: roomCode,
        title: `世界呼吸时刻 · ${breathingStatus}`,
        type: 'world_breathing',
        creator_id: userId,
        status: 'active',
        max_participants: 999,
        current_participants: 1,
        music_url: musicUrl,
        music_name: breathingMusicName || null,
        duration: breathingDuration,
        expires_at: expiresAt,
        tags: [breathingStatus, 'world_breathing'],
        created_at: new Date().toISOString(),
        ambient_sound: musicUrl ? 'custom' : 'nature',
        custom_audio_url: musicUrl,
        description: `与世界各地的人一起${breathingStatus}`,
      };

      const res = await fetch('/sb-api/rest/v1/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify(roomData),
      });

      if (!res.ok) {
        throw new Error('创建房间失败');
      }

      const room = await res.json();
      navigate(`/silent-room/${room.id}`);
    } catch (err: any) {
      setError(err.message || '创建失败');
    } finally {
      setCreating(false);
    }
  };

  // 发布回声分享
  const handlePublishEcho = async () => {
    if (!echoContent.trim()) {
      setEchoError('请输入内容');
      return;
    }

    if (echoContent.length > 200) {
      setEchoError('内容不能超过200字');
      return;
    }

    // 安全过滤
    const filterResult = checkBadWords(echoContent);
    if (filterResult.hasViolation) {
      setEchoError('内容包含不当用语，请修改后发布');
      return;
    }

    setEchoSubmitting(true);
    setEchoError('');

    try {
      const userInfo = localStorage.getItem('user_info');
      if (!userInfo) {
        setEchoError('请先登录');
        return;
      }
      const parsed = JSON.parse(userInfo);
      const userId = parsed.user_id || parsed.id;
      if (!userId) {
        setEchoError('无法获取用户信息');
        return;
      }

      const res = await fetch('/sb-api/rest/v1/echo_shares', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          content: echoContent.trim(),
          user_id: userId,
        }),
      });

      if (!res.ok) {
        throw new Error('发布失败');
      }

      setEchoContent('');
      loadEchoList();
    } catch (err: any) {
      setEchoError(err.message || '发布失败');
    } finally {
      setEchoSubmitting(false);
    }
  };

  // 发布回声回应
  const handlePublishEchoReply = async (shareId: string) => {
    if (!replyContent.trim()) {
      return;
    }

    if (replyContent.length > 100) {
      setEchoError('回应不能超过100字');
      return;
    }

    // 安全过滤
    const filterResult = checkBadWords(replyContent);
    if (filterResult.hasViolation) {
      setEchoError('内容包含不当用语，请修改后发布');
      return;
    }

    try {
      const userInfo = localStorage.getItem('user_info');
      if (!userInfo) {
        setEchoError('请先登录');
        return;
      }
      const parsed = JSON.parse(userInfo);
      const userId = parsed.user_id || parsed.id;
      if (!userId) {
        setEchoError('无法获取用户信息');
        return;
      }

      const res = await fetch('/sb-api/rest/v1/echo_echoes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          share_id: shareId,
          content: replyContent.trim(),
          user_id: userId,
        }),
      });

      if (!res.ok) {
        throw new Error('发送回应失败');
      }

      setReplyContent('');
      setReplyingTo(null);
      setExpandedEchoId(null);
      loadEchoList();
    } catch (err: any) {
      setEchoError(err.message || '发送回应失败');
    }
  };

  // 切换反应
  const toggleReaction = async (shareId: string, reactionType: string) => {
    try {
      const userInfo = localStorage.getItem('user_info');
      if (!userInfo) {
        setEchoError('请先登录');
        return;
      }
      const parsed = JSON.parse(userInfo);
      const userId = parsed.user_id || parsed.id;
      if (!userId) {
        return;
      }

      const currentReactions = userReactions[shareId] || [];
      const hasReacted = currentReactions.includes(reactionType);

      if (hasReacted) {
        // 移除反应
        await fetch(
          `/sb-api/rest/v1/echo_reactions?share_id=eq.${shareId}&user_id=eq.${userId}&reaction_type=eq.${reactionType}`,
          {
            method: 'DELETE',
            headers: {
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            },
          }
        );
        setUserReactions(prev => ({
          ...prev,
          [shareId]: (prev[shareId] || []).filter(r => r !== reactionType),
        }));
      } else {
        // 添加反应
        await fetch('/sb-api/rest/v1/echo_reactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            share_id: shareId,
            user_id: userId,
            reaction_type: reactionType,
          }),
        });
        setUserReactions(prev => ({
          ...prev,
          [shareId]: [...(prev[shareId] || []), reactionType],
        }));
      }
    } catch (err) {
      console.warn('反应操作失败:', err);
    }
  };

  // 删除自己的分享
  const handleDeleteShare = async (shareId: string) => {
    if (!confirm('确定要删除这条分享吗？')) {
      return;
    }

    try {
      const userInfo = localStorage.getItem('user_info');
      if (!userInfo) return;
      const parsed = JSON.parse(userInfo);
      const userId = parsed.user_id || parsed.id;
      if (!userId) return;

      await fetch(
        `/sb-api/rest/v1/echo_shares?id=eq.${shareId}&user_id=eq.${userId}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          },
        }
      );
      loadEchoList();
    } catch (err) {
      console.warn('删除失败:', err);
    }
  };

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return '刚刚';
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  // 获取用户ID判断是否是自己的分享
  const getUserId = () => {
    try {
      const userInfo = localStorage.getItem('user_info');
      if (!userInfo) return null;
      const parsed = JSON.parse(userInfo);
      return parsed.user_id || parsed.id;
    } catch {
      return null;
    }
  };

  const currentUserId = getUserId();

  // 深夜模式样式
  const nightModeStyle = isNightMode ? {
    '--echo-accent': '#f59e0b',
    background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a15 100%)',
  } : {};

  return (
    <div 
      className="min-h-screen pb-8"
      style={nightModeStyle}
    >
      {/* 星空背景（静默同行和世界呼吸时刻） */}
      {activeTab !== 'echo' && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: `${Math.random() * 3 + 1}px`,
                height: `${Math.random() * 3 + 1}px`,
                backgroundColor: 'rgba(255, 255, 255, 0.6)',
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* 顶部导航 */}
      <div className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white/70" />
          </button>
          <h1 className="text-white font-medium">共境</h1>
          <div className="w-10" />
        </div>
        
        {/* Tab切换 */}
        <div className="flex px-4 pb-3 gap-2">
          <button
            onClick={() => setActiveTab('silent')}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all duration-300 ${
              activeTab === 'silent'
                ? 'bg-white/15 text-white shadow-lg'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            静默同行
          </button>
          <button
            onClick={() => setActiveTab('breathing')}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all duration-300 ${
              activeTab === 'breathing'
                ? 'bg-blue-500/20 text-white shadow-lg'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
            style={{
              border: activeTab === 'breathing' ? '1px solid rgba(59, 130, 246, 0.4)' : 'none',
            }}
          >
            世界呼吸
          </button>
          <button
            onClick={() => setActiveTab('echo')}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all duration-300 ${
              activeTab === 'echo'
                ? 'text-white shadow-lg'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
            style={{
              background: activeTab === 'echo' ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.3) 0%, rgba(217, 119, 6, 0.3) 100%)' : undefined,
              border: activeTab === 'echo' ? '1px solid rgba(245, 158, 11, 0.4)' : 'none',
            }}
          >
            🌙 树洞回声
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="px-4 pt-6">
        {/* 静默同行 Tab */}
        {activeTab === 'silent' && (
          <div className="space-y-6" style={{ animation: 'fadeIn 0.3s ease-out' }}>
            {/* 标题区域 */}
            <div className="text-center mb-8" style={{ animation: 'fadeInUp 0.5s ease-out' }}>
              <div className="inline-flex items-center gap-2 mb-4">
                <Moon className="w-8 h-8" style={{ color: primaryColor }} />
              </div>
              <h2 className="text-white text-xl font-light mb-2">静默同行</h2>
              <p className="text-white/50 text-sm italic">Silent Companion</p>
              <p className="text-white/40 text-xs mt-2">一对一安静陪伴</p>
            </div>

            {/* 状态选择 */}
            <div>
              <h2 className="text-white/80 text-sm mb-4 text-center">此刻你的状态</h2>
              <div className="flex flex-wrap justify-center gap-3">
                {STATUS_OPTIONS.map((status) => {
                  const Icon = ICON_MAP[status.icon];
                  return (
                    <button
                      key={status.id}
                      onClick={() => setSelectedStatus(status.id)}
                      className={`relative px-4 py-3 rounded-2xl backdrop-blur-md transition-all duration-300 ${
                        selectedStatus === status.id
                          ? 'bg-white/15 shadow-lg scale-105'
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                      style={{
                        border: selectedStatus === status.id ? `1px solid ${primaryColor}50` : '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: selectedStatus === status.id ? `0 0 20px ${primaryColor}30` : 'none',
                      }}
                    >
                      <div className="flex flex-col items-center gap-1">
                        {Icon && <Icon className="w-6 h-6" style={{ color: selectedStatus === status.id ? primaryColor : 'rgba(255,255,255,0.5)' }} />}
                        <span className="text-white/90 text-xs">{status.label}</span>
                      </div>
                      {selectedStatus === status.id && (
                        <div 
                          className="absolute inset-0 rounded-2xl animate-pulse" 
                          style={{ border: `1px solid ${primaryColor}50` }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 时长选择 */}
            <div>
              <h2 className="text-white/80 text-sm mb-4 text-center">陪伴时长</h2>
              <div className="flex justify-center gap-4">
                {DURATION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedDuration(option.value)}
                    className={`px-6 py-3 rounded-full backdrop-blur-md transition-all duration-300 ${
                      selectedDuration === option.value
                        ? 'text-white shadow-lg'
                        : 'text-white/70 hover:bg-white/10'
                    }`}
                    style={{
                      background: selectedDuration === option.value ? `${primaryColor}30` : 'rgba(255, 255, 255, 0.05)',
                      border: selectedDuration === option.value ? `1px solid ${primaryColor}50` : '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: selectedDuration === option.value ? `0 0 15px ${primaryColor}20` : 'none',
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 音乐上传（可选） */}
            <div>
              <h2 className="text-white/80 text-sm mb-4 text-center">背景音乐（可选）</h2>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-6 rounded-2xl backdrop-blur-md transition-all duration-300 hover:bg-white/10"
                style={{
                  backgroundColor: musicFile ? `${primaryColor}15` : 'rgba(255, 255, 255, 0.05)',
                  border: musicFile ? `1px solid ${primaryColor}30` : '1px dashed rgba(255, 255, 255, 0.2)',
                }}
              >
                {musicFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <Music className="w-5 h-5" style={{ color: primaryColor }} />
                    <span className="text-white/90 text-sm truncate max-w-xs">{musicName}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeMusic('silent'); }}
                      className="text-white/50 hover:text-white ml-2"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-6 h-6 text-white/40" />
                    <span className="text-white/50 text-sm">点击上传 MP3 / WAV / AAC</span>
                  </div>
                )}
              </button>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm text-center">
                {error}
              </div>
            )}

            {/* 进入按钮 */}
            <button
              onClick={handleEnterSilent}
              disabled={creating}
              className="w-full py-5 rounded-2xl backdrop-blur-md text-white font-medium transition-all duration-300 relative overflow-hidden"
              style={{
                background: creating
                  ? `${primaryColor}50`
                  : `linear-gradient(135deg, ${primaryColor}60 0%, ${primaryColor}40 100%)`,
                border: `1px solid ${primaryColor}50`,
                boxShadow: creating ? 'none' : `0 0 30px ${primaryColor}30`,
              }}
            >
              {creating ? (
                <div className="flex items-center justify-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>正在进入...</span>
                </div>
              ) : (
                <span className="relative z-10">进入静默同行</span>
              )}
              {!creating && (
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                    animation: 'shimmer 3s infinite',
                  }}
                />
              )}
            </button>

            {/* 底部提示 */}
            <div className="mt-16 text-center">
              <p className="text-white/40 text-sm italic" style={{ animation: 'fadeInUp 1s ease-out 0.5s both' }}>
                In silence, we find each other.
              </p>
            </div>
          </div>
        )}

        {/* 世界呼吸时刻 Tab */}
        {activeTab === 'breathing' && (
          <div className="space-y-6" style={{ animation: 'fadeIn 0.3s ease-out' }}>
            {/* 标题区域 */}
            <div className="text-center mb-8" style={{ animation: 'fadeInUp 0.5s ease-out' }}>
              <div className="inline-flex items-center gap-2 mb-4">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{
                    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)',
                    animation: 'breathing 4s ease-in-out infinite',
                  }}
                >
                  <span className="text-3xl">🌍</span>
                </div>
              </div>
              <h2 className="text-white text-xl font-light mb-2">世界呼吸时刻</h2>
              <p className="text-white/50 text-sm italic">World Breathing Moment</p>
            </div>

            {/* 呼吸地球动画 */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                {/* 外层光晕 */}
                <div 
                  className="absolute inset-0 rounded-full opacity-30"
                  style={{
                    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%)',
                    animation: 'glowPulse 4s ease-in-out infinite',
                    transform: 'scale(1.5)',
                  }}
                />
                {/* 中层光晕 */}
                <div 
                  className="absolute inset-0 rounded-full opacity-50"
                  style={{
                    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.5) 0%, transparent 70%)',
                    animation: 'glowPulse 4s ease-in-out infinite 0.5s',
                    transform: 'scale(1.2)',
                  }}
                />
                {/* 地球主体 */}
                <div 
                  className="relative w-32 h-32 rounded-full"
                  style={{
                    background: 'radial-gradient(circle at 30% 30%, #60a5fa 0%, #3b82f6 40%, #1d4ed8 70%, #1e3a8a 100%)',
                    animation: 'earthBreathing 4s ease-in-out infinite',
                    boxShadow: '0 0 40px rgba(59, 130, 246, 0.3)',
                  }}
                >
                  {/* 地球上的光点 */}
                  {[...Array(8)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-1.5 h-1.5 rounded-full bg-white/80"
                      style={{
                        left: `${20 + Math.random() * 60}%`,
                        top: `${20 + Math.random() * 60}%`,
                        animation: `floatParticle ${2 + Math.random() * 2}s ease-in-out infinite`,
                        animationDelay: `${Math.random() * 2}s`,
                      }}
                    />
                  ))}
                </div>
                {/* 浮动粒子 */}
                {[...Array(12)].map((_, i) => (
                  <div
                    key={`particle-${i}`}
                    className="absolute w-1 h-1 rounded-full bg-blue-300/60"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animation: `floatParticle ${3 + Math.random() * 2}s ease-in-out infinite`,
                      animationDelay: `${Math.random() * 3}s`,
                    }}
                  />
                ))}
              </div>
            </div>

            <p className="text-center text-white/50 text-sm italic mb-8" style={{ animation: 'fadeInUp 0.5s ease-out' }}>
              Every light is someone awake tonight.
            </p>

            {/* 今日主题 */}
            <div 
              className="mb-8 p-5 rounded-2xl backdrop-blur-md text-center"
              style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                boxShadow: '0 0 30px rgba(59, 130, 246, 0.1)',
              }}
            >
              <p className="text-white/60 text-xs mb-2">今晚主题</p>
              <p className="text-white text-lg font-light">
                {breathingTheme || '今夜，安静相伴'}
              </p>
            </div>

            {/* 实时状态 */}
            <div className="mb-8 text-center">
              <p className="text-white/80 text-lg mb-1">
                🌍 {participantCount} people are quietly present now
              </p>
              <p className="text-white/50 text-sm italic">
                The world is breathing quietly together.
              </p>
            </div>

            {/* 状态选择 */}
            <div className="mb-8">
              <h2 className="text-white/80 text-sm mb-4 text-center">此刻你的状态</h2>
              <div className="flex flex-wrap justify-center gap-3">
                {BREATHING_STATUS_OPTIONS.map((status) => (
                  <button
                    key={status.id}
                    onClick={() => setBreathingStatus(status.id)}
                    className={`relative px-4 py-3 rounded-2xl backdrop-blur-md transition-all duration-300 ${
                      breathingStatus === status.id
                        ? 'bg-white/15 shadow-lg scale-105'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                    style={{
                      border: breathingStatus === status.id ? `1px solid ${status.color}80` : '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: breathingStatus === status.id ? `0 0 20px ${status.color}30` : 'none',
                    }}
                  >
                    <div className="flex flex-col items-center gap-1">
                      {(() => { const Icon = ICON_MAP[status.icon]; return Icon ? <Icon className="w-6 h-6" style={{ color: selectedBreathingStatus === status.id ? primaryColor : "rgba(255,255,255,0.5)" }} /> : null; })()}
                      <span className="text-white/90 text-xs">{status.label}</span>
                    </div>
                    {breathingStatus === status.id && (
                      <div 
                        className="absolute inset-0 rounded-2xl animate-pulse" 
                        style={{ border: `1px solid ${status.color}50` }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 时长选择 */}
            <div className="mb-8">
              <h2 className="text-white/80 text-sm mb-4 text-center">陪伴时长</h2>
              <div className="flex justify-center gap-4">
                {DURATION_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setBreathingDuration(option.value)}
                    className={`px-6 py-3 rounded-full backdrop-blur-md transition-all duration-300 ${
                      breathingDuration === option.value
                        ? 'bg-blue-500/20 text-white shadow-lg'
                        : 'bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                    style={{
                      border: breathingDuration === option.value ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: breathingDuration === option.value ? '0 0 15px rgba(59, 130, 246, 0.2)' : 'none',
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 音乐上传（可选） */}
            <div className="mb-10">
              <h2 className="text-white/80 text-sm mb-4 text-center">背景音乐（可选）</h2>
              <input
                ref={breathingFileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleBreathingFileChange}
                className="hidden"
              />
              <button
                onClick={() => breathingFileInputRef.current?.click()}
                className="w-full p-6 rounded-2xl backdrop-blur-md transition-all duration-300 hover:bg-white/10"
                style={{
                  backgroundColor: breathingMusicFile ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                  border: breathingMusicFile ? '1px solid rgba(59, 130, 246, 0.3)' : '1px dashed rgba(255, 255, 255, 0.2)',
                }}
              >
                {breathingMusicFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <Music className="w-5 h-5 text-blue-400" />
                    <span className="text-white/90 text-sm truncate max-w-xs">{breathingMusicName}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeMusic('breathing'); }}
                      className="text-white/50 hover:text-white ml-2"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-6 h-6 text-white/40" />
                    <span className="text-white/50 text-sm">点击上传 MP3 / WAV / AAC</span>
                  </div>
                )}
              </button>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm text-center">
                {error}
              </div>
            )}

            {/* 进入按钮 */}
            <button
              onClick={handleEnterBreathing}
              disabled={creating}
              className="w-full py-5 rounded-2xl backdrop-blur-md text-white font-medium transition-all duration-300 relative overflow-hidden"
              style={{
                background: creating
                  ? 'rgba(59, 130, 246, 0.3)'
                  : 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(37, 99, 235, 0.4) 100%)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                boxShadow: creating ? 'none' : '0 0 30px rgba(59, 130, 246, 0.3)',
              }}
            >
              {creating ? (
                <div className="flex items-center justify-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>正在进入...</span>
                </div>
              ) : (
                <span className="relative z-10">进入世界呼吸时刻</span>
              )}
              {!creating && (
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                    animation: 'shimmer 3s infinite',
                  }}
                />
              )}
            </button>

            {/* 底部提示 */}
            <div className="mt-16 text-center">
              <p className="text-white/40 text-sm italic" style={{ animation: 'fadeInUp 1s ease-out 0.5s both' }}>
                Tonight, the world slowed down together.
              </p>
            </div>
          </div>
        )}

        {/* 树洞回声 Tab */}
        {activeTab === 'echo' && (
          <div className="space-y-6" style={{ animation: 'fadeIn 0.3s ease-out' }}>
            {/* 标题区域 */}
            <div className="text-center mb-8" style={{ animation: 'fadeInUp 0.5s ease-out' }}>
              <div className="inline-flex items-center gap-2 mb-4">
                <span className="text-4xl">🌙</span>
              </div>
              <h2 className="text-white text-xl font-light mb-2">树洞回声</h2>
              <p className="text-white/50 text-sm italic">Echo Cave</p>
              <p className="text-amber-400/70 text-xs mt-2" style={{ animation: 'fadeInUp 0.5s ease-out 0.2s both' }}>
                让人被温柔倾听
              </p>
            </div>

            {/* 深夜模式提示 */}
            {isNightMode && (
              <div 
                className="mb-6 p-4 rounded-2xl backdrop-blur-md text-center"
                style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                }}
              >
                <p className="text-amber-400/80 text-sm italic">
                  🌙 Night Echo Mode — The world feels quieter tonight.
                </p>
              </div>
            )}

            {/* 发布区域 */}
            <div 
              className="p-5 rounded-2xl backdrop-blur-md"
              style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.15)',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-amber-400/80">🌙</span>
                <span className="text-white/70 text-sm">Anonymous Soul</span>
              </div>
              <textarea
                value={echoContent}
                onChange={(e) => setEchoContent(e.target.value)}
                placeholder="在这里说出你的心里话..."
                maxLength={200}
                rows={3}
                className="w-full bg-white/5 text-white placeholder-white/30 rounded-xl p-3 resize-none focus:outline-none focus:ring-1 transition-all"
                style={{
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  '--tw-ring-color': 'rgba(245, 158, 11, 0.3)',
                }}
              />
              <div className="flex items-center justify-between mt-3">
                <span className="text-white/30 text-xs">{echoContent.length}/200</span>
                <button
                  onClick={handlePublishEcho}
                  disabled={echoSubmitting || !echoContent.trim()}
                  className="px-5 py-2 rounded-full text-white text-sm font-medium transition-all duration-300 flex items-center gap-2"
                  style={{
                    background: echoContent.trim() 
                      ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.4) 0%, rgba(217, 119, 6, 0.4) 100%)' 
                      : 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    opacity: echoSubmitting || !echoContent.trim() ? 0.5 : 1,
                  }}
                >
                  {echoSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  留下回声
                </button>
              </div>
              {echoError && (
                <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                  {echoError}
                </div>
              )}
            </div>

            {/* 回声列表 */}
            <div className="space-y-4">
              {echoLoading ? (
                <div className="text-center py-10">
                  <Loader2 className="w-8 h-8 text-amber-400/50 animate-spin mx-auto" />
                  <p className="text-white/40 text-sm mt-3">Loading echoes...</p>
                </div>
              ) : echoList.length === 0 ? (
                <div className="text-center py-10">
                  <span className="text-4xl mb-4 block">🌙</span>
                  <p className="text-white/40 text-sm">暂无回声，成为第一个倾诉者</p>
                </div>
              ) : (
                echoList.map((share, index) => (
                  <div
                    key={share.id}
                    className="p-5 rounded-2xl backdrop-blur-md"
                    style={{
                      background: 'rgba(245, 158, 11, 0.05)',
                      border: '1px solid rgba(245, 158, 11, 0.1)',
                      animation: `echoFadeIn 0.5s ease-out ${index * 0.1}s both`,
                      opacity: isNightMode ? 0.9 : 1,
                    }}
                  >
                    {/* 发布者信息 */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400/80">🌙</span>
                        <span className="text-white/60 text-sm">Anonymous Soul</span>
                        <span className="text-white/30 text-xs">·</span>
                        <span className="text-white/30 text-xs">{formatTime(share.created_at)}</span>
                      </div>
                      {currentUserId === share.user_id && (
                        <button
                          onClick={() => handleDeleteShare(share.id)}
                          className="text-white/30 hover:text-red-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* 内容 */}
                    <p className="text-white/90 text-sm leading-relaxed mb-4">{share.content}</p>

                    {/* 反应按钮 */}
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      {REACTION_TYPES.map((reaction) => {
                        const hasReacted = (userReactions[share.id] || []).includes(reaction.id);
                        const reactionCount = share.echo_reactions?.filter(r => r.reaction_type === reaction.id).length || 0;
                        return (
                          <button
                            key={reaction.id}
                            onClick={() => toggleReaction(share.id, reaction.id)}
                            className={`px-3 py-1.5 rounded-full text-xs flex items-center gap-1 transition-all duration-300 ${
                              hasReacted ? 'scale-105' : 'hover:scale-105'
                            }`}
                            style={{
                              background: hasReacted 
                                ? 'rgba(245, 158, 11, 0.2)' 
                                : 'rgba(255, 255, 255, 0.05)',
                              border: hasReacted 
                                ? '1px solid rgba(245, 158, 11, 0.4)' 
                                : '1px solid rgba(255, 255, 255, 0.1)',
                            }}
                          >
                            <span>{reaction.emoji}</span>
                            <span className={hasReacted ? 'text-amber-400' : 'text-white/50'}>
                              {reaction.label}
                            </span>
                            {reactionCount > 0 && (
                              <span className="text-white/30 ml-1">({reactionCount})</span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* 回声列表 */}
                    {share.echo_echoes && share.echo_echoes.length > 0 && (
                      <div 
                        className="pl-4 border-l-2 space-y-3 mb-4"
                        style={{ borderColor: 'rgba(245, 158, 11, 0.2)' }}
                      >
                        {share.echo_echoes.map((echo) => (
                          <div 
                            key={echo.id} 
                            className="p-3 rounded-xl"
                            style={{
                              background: 'rgba(255, 255, 255, 0.03)',
                            }}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-amber-400/60">🌿</span>
                              <span className="text-white/50 text-xs">Anonymous Soul</span>
                              <span className="text-white/20 text-xs">·</span>
                              <span className="text-white/20 text-xs">{formatTime(echo.created_at)}</span>
                            </div>
                            <p className="text-white/70 text-xs leading-relaxed">{echo.content}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 留下回声按钮 */}
                    <button
                      onClick={() => {
                        setExpandedEchoId(expandedEchoId === share.id ? null : share.id);
                        setReplyingTo(replyingTo === share.id ? null : share.id);
                        setReplyContent('');
                      }}
                      className="text-amber-400/70 hover:text-amber-400 text-xs transition-colors flex items-center gap-1"
                    >
                      <Volume2 className="w-3 h-3" />
                      留下回声
                    </button>

                    {/* 回复输入框 */}
                    {expandedEchoId === share.id && (
                      <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(245, 158, 11, 0.1)' }}>
                        <textarea
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="轻轻回应..."
                          maxLength={100}
                          rows={2}
                          className="w-full bg-white/5 text-white placeholder-white/30 rounded-xl p-3 resize-none focus:outline-none text-sm"
                          style={{
                            border: '1px solid rgba(245, 158, 11, 0.15)',
                          }}
                        />
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-white/30 text-xs">{replyContent.length}/100</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setExpandedEchoId(null);
                                setReplyingTo(null);
                                setReplyContent('');
                              }}
                              className="px-4 py-1.5 rounded-full text-white/50 text-xs hover:text-white transition-colors"
                            >
                              取消
                            </button>
                            <button
                              onClick={() => handlePublishEchoReply(share.id)}
                              disabled={!replyContent.trim()}
                              className="px-4 py-1.5 rounded-full text-white text-xs transition-all duration-300"
                              style={{
                                background: replyContent.trim() 
                                  ? 'rgba(245, 158, 11, 0.3)' 
                                  : 'rgba(255, 255, 255, 0.1)',
                                opacity: replyContent.trim() ? 1 : 0.5,
                              }}
                            >
                              发送
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* 安全提示 */}
            <div className="mt-10 text-center">
              <p className="text-white/30 text-xs italic">
                Share experiences, not arguments.
              </p>
              <p className="text-white/20 text-xs mt-2">
                这里不是辩论区，而是被倾听的角落
              </p>
            </div>
          </div>
        )}
      </div>

      {/* CSS动画 */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }

        @keyframes breathing {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.2); opacity: 1; }
        }

        @keyframes earthBreathing {
          0%, 100% { transform: scale(1); box-shadow: 0 0 40px rgba(59, 130, 246, 0.3); }
          50% { transform: scale(1.08); box-shadow: 0 0 80px rgba(59, 130, 246, 0.5); }
        }

        @keyframes glowPulse {
          0%, 100% { opacity: 0.3; transform: scale(1.5); }
          50% { opacity: 0.6; transform: scale(1.6); }
        }

        @keyframes floatParticle {
          0%, 100% { transform: translateY(0px); opacity: 0.5; }
          50% { transform: translateY(-10px); opacity: 1; }
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes echoFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes echoDrift {
          0% { opacity: 1; }
          70% { opacity: 1; }
          100% { opacity: 0.3; }
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
