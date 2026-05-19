// Build: 20250519 - 共境(静默同行/世界呼吸时刻)入口页面

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Music, Loader2, Moon, BookOpen, Heart, Brain, Hand, Sparkles, Play } from 'lucide-react';

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

type TabType = 'silent' | 'breathing';

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
  // 管理员设置的背景音乐
  const [adminMusicUrl, setAdminMusicUrl] = useState<string | null>(null);
  const [adminMusicName, setAdminMusicName] = useState<string>('');
  
  // 通用状态
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // 加载今日主题和参与人数
  useEffect(() => {
    const loadBreathingData = async () => {
      try {
        // 获取今日主题和管理员设置的背景音乐
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
          if (themes && themes.length > 0) {
            if (themes[0].theme) {
              setBreathingTheme(themes[0].theme);
            }
            // 读取管理员设置的背景音乐
            if (themes[0].music_url) {
              setAdminMusicUrl(themes[0].music_url);
              setAdminMusicName(themes[0].music_name || '背景音乐');
            }
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
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(roomData),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || '创建房间失败');
      }

      const rooms = await res.json();
      const newRoom = rooms[0];

      // 创建参与者记录
      try {
        await fetch('/sb-api/rest/v1/room_participants', {
          method: 'POST',
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            room_id: newRoom.id,
            user_id: userId,
            is_owner: true,
            status: 'quiet',
            joined_at: new Date().toISOString(),
          }),
        });
      } catch {
        // 忽略重复键错误
      }

      // 跳转到房间页面
      window.location.hash = `/room/${newRoom.id}`;
    } catch (err: any) {
      setError(err.message || '创建房间失败');
    } finally {
      setCreating(false);
    }
  };

  // 创建世界呼吸时刻房间
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

      // 使用管理员设置的背景音乐（用户不能自定义）
      const musicUrl = adminMusicUrl;
      const musicName = adminMusicName;

      const roomCode = generateRoomCode();
      const expiresAt = new Date(Date.now() + breathingDuration * 60000).toISOString();

      // 创建房间
      const roomData = {
        room_code: roomCode,
        title: breathingTheme ? `世界呼吸时刻 · ${breathingTheme}` : '世界呼吸时刻',
        type: 'world_breathing',
        creator_id: userId,
        status: 'active',
        max_participants: 9999,  // 世界呼吸不限制人数
        current_participants: 1,
        music_url: musicUrl,
        music_name: musicName || null,
        duration: breathingDuration,
        expires_at: expiresAt,
        tags: [breathingStatus, 'world_breathing'],
        theme: breathingTheme || null,  // 今日主题
        created_at: new Date().toISOString(),
        custom_audio_url: musicUrl,  // 添加自定义音频URL字段
        audio_tracks: musicUrl ? [{
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: musicName || '背景音乐',
          url: musicUrl,
          duration: 0,
          lyrics: '',
          uploaded_at: new Date().toISOString(),
        }] : [],
      };

      const res = await fetch('/sb-api/rest/v1/rooms', {
        method: 'POST',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(roomData),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || '创建房间失败');
      }

      const rooms = await res.json();
      const newRoom = rooms[0];

      // 创建参与者记录
      try {
        await fetch('/sb-api/rest/v1/room_participants', {
          method: 'POST',
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            room_id: newRoom.id,
            user_id: userId,
            is_owner: true,
            status: 'breathing',
            joined_at: new Date().toISOString(),
          }),
        });
      } catch {
        // 忽略重复键错误
      }

      // 跳转到房间页面
      window.location.hash = `/room/${newRoom.id}`;
    } catch (err: any) {
      setError(err.message || '创建房间失败');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 50%, #0f0f2a 100%)' }}>
      {/* 星空背景 */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(60)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 3 + 1 + 'px',
              height: Math.random() * 3 + 1 + 'px',
              backgroundColor: `rgba(255, 255, 255, ${Math.random() * 0.6 + 0.2})`,
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              animation: `twinkle ${Math.random() * 4 + 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      {/* 顶部导航 */}
      <div className="relative z-10 p-4">
        <button
          onClick={() => window.location.hash = '/'}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">返回</span>
        </button>
      </div>

      {/* Tab切换 */}
      <div className="relative z-10 max-w-lg mx-auto px-6">
        <div className="flex bg-white/5 rounded-full p-1 backdrop-blur-md" style={{ border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <button
            onClick={() => setActiveTab('silent')}
            className={`flex-1 py-3 px-4 rounded-full text-sm font-medium transition-all duration-300 ${
              activeTab === 'silent'
                ? 'bg-white/15 text-white shadow-lg'
                : 'text-white/60 hover:text-white'
            }`}
          >
            静默同行
          </button>
          <button
            onClick={() => setActiveTab('breathing')}
            className={`flex-1 py-3 px-4 rounded-full text-sm font-medium transition-all duration-300 ${
              activeTab === 'breathing'
                ? 'bg-white/15 text-white shadow-lg'
                : 'text-white/60 hover:text-white'
            }`}
          >
            世界呼吸时刻
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="relative z-10 max-w-lg mx-auto px-6 py-8">
        {/* 静默同行内容 */}
        {activeTab === 'silent' && (
          <div className="animate-fadeIn">
            {/* 标题区域 */}
            <div className="text-center mb-12">
              {/* 呼吸光点 */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-r from-rose-400 to-pink-500" style={{ animation: 'breathing 3s ease-in-out infinite' }} />
                  <div className="absolute inset-0 w-4 h-4 rounded-full bg-gradient-to-r from-rose-400 to-pink-500 animate-ping opacity-50" />
                </div>
              </div>
              
              <h1 className="text-3xl font-light text-white mb-3 tracking-wide">
                静默同行 <span className="text-white/50 text-xl">/ Silent Companion</span>
              </h1>
              <p className="text-white/60 text-sm">
                即使不说话，也有人与你一起存在
              </p>
            </div>

            {/* 状态选择 */}
            <div className="mb-8">
              <h2 className="text-white/80 text-sm mb-4 text-center">此刻你的状态</h2>
              <div className="flex flex-wrap justify-center gap-3">
                {STATUS_OPTIONS.map((status) => (
                  <button
                    key={status.id}
                    onClick={() => setSelectedStatus(status.id)}
                    className={`relative px-4 py-3 rounded-2xl backdrop-blur-md transition-all duration-300 ${
                      selectedStatus === status.id
                        ? 'bg-white/15 shadow-lg scale-105'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                    style={{
                      border: selectedStatus === status.id ? `1px solid ${primaryColor}` : '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: selectedStatus === status.id ? '0 0 20px rgba(244, 114, 182, 0.2)' : 'none',
                    }}
                  >
                    <div className="flex flex-col items-center gap-1">
                      {(() => { const Icon = ICON_MAP[status.icon]; return Icon ? <Icon className="w-6 h-6" style={{ color: selectedStatus === status.id ? primaryColor : "rgba(255,255,255,0.5)" }} /> : null; })()}
                      <span className="text-white/90 text-xs">{status.label}</span>
                    </div>
                    {selectedStatus === status.id && (
                      <div className="absolute inset-0 rounded-2xl border border-rose-400/30 animate-pulse" />
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
                    onClick={() => setSelectedDuration(option.value)}
                    className={`px-6 py-3 rounded-full backdrop-blur-md transition-all duration-300 ${
                      selectedDuration === option.value
                        ? 'bg-rose-500/20 text-white shadow-lg'
                        : 'bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                    style={{
                      border: selectedDuration === option.value ? '1px solid rgba(244, 114, 182, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: selectedDuration === option.value ? '0 0 15px rgba(244, 114, 182, 0.2)' : 'none',
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
                  backgroundColor: musicFile ? 'rgba(244, 114, 182, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                  border: musicFile ? '1px solid rgba(244, 114, 182, 0.3)' : '1px dashed rgba(255, 255, 255, 0.2)',
                }}
              >
                {musicFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <Music className="w-5 h-5 text-rose-400" />
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
                  ? 'rgba(244, 114, 182, 0.3)'
                  : 'linear-gradient(135deg, rgba(244, 114, 182, 0.4) 0%, rgba(236, 72, 153, 0.4) 100%)',
                border: '1px solid rgba(244, 114, 182, 0.4)',
                boxShadow: creating ? 'none' : '0 0 30px rgba(244, 114, 182, 0.3)',
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
                Someone in another part of the world is quietly with you.
              </p>
            </div>
          </div>
        )}

        {/* 世界呼吸时刻内容 */}
        {activeTab === 'breathing' && (
          <div className="animate-fadeIn">
            {/* 标题区域 */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-light text-white mb-2 tracking-wide">
                世界呼吸时刻 <span className="text-white/50 text-lg">/ World Breathing Moment</span>
              </h1>
              <p className="text-white/60 text-sm">
                世界正在一起安静呼吸
              </p>
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

            {/* 管理员设置的背景音乐指示器 */}
            {adminMusicUrl && (
              <div className="mb-8 p-4 rounded-2xl backdrop-blur-md text-center"
                style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                }}
              >
                <div className="flex items-center justify-center gap-3">
                  <Music className="w-5 h-5 text-blue-400" />
                  <span className="text-white/80 text-sm">
                    今晚背景音乐：{adminMusicName || '背景音乐'}
                  </span>
                  <Play className="w-4 h-4 text-blue-400 cursor-pointer hover:text-blue-300" onClick={() => {
                    const audio = document.getElementById('breathing-admin-music') as HTMLAudioElement;
                    if (audio) {
                      if (audio.paused) {
                        audio.play();
                      } else {
                        audio.pause();
                      }
                    }
                  }} />
                </div>
                <audio id="breathing-admin-music" src={adminMusicUrl} className="hidden" />
              </div>
            )}

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
