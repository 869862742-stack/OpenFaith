import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Volume2, VolumeX, Moon, Music, BookOpen, Brain, Flower2, HeartHandshake, Sparkles, Upload, X, Power, SkipBack, SkipForward, Play, Pause, Repeat, Shuffle, ListMusic, Trash2 } from 'lucide-react';

// Service Role Key
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';
const SUPABASE_URL = 'https://rdhwmeittgdosmkxtpak.supabase.co';

// 状态选项
const STATUS_OPTIONS = [
  { value: 'quiet', label: '安静中', Icon: VolumeX },
  { value: 'reading', label: '阅读中', Icon: BookOpen },
  { value: 'reflecting', label: '反思中', Icon: Brain },
  { value: 'meditating', label: '冥想中', Icon: Flower2 },
  { value: 'praying', label: '祈祷中', Icon: HeartHandshake },
  { value: 'grateful', label: '感恩中', Icon: Sparkles },
];

// 音频轨道类型定义
interface AudioTrack {
  id: string;
  name: string;
  url: string;
  duration?: number;
  lyrics?: string;
  uploaded_at: string;
}

interface Participant {
  id: string;
  user_id: string;
  status: string;
  is_owner: boolean;
  joined_at: string;
  profiles?: {
    username: string;
    avatar_url: string;
    faith_tag: string;
  };
}

interface Sentence {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url: string;
  };
}

interface Room {
  id: string;
  name: string;
  description: string;
  ambient_sound: string;
  custom_audio_url: string | null;
  tags: string[];
  user_count: number;
  max_display_sentences: number;
  creator_id: string;
  room_code?: number;
  audio_tracks?: AudioTrack[];
  last_activity_at?: string;
}

// 星空 Canvas 组件
function StarryBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Array<{
    x: number;
    y: number;
    size: number;
    speed: number;
    opacity: number;
    twinkleSpeed: number;
    twinklePhase: number;
  }>>([]);
  const particlesRef = useRef<Array<{
    x: number;
    y: number;
    size: number;
    speedX: number;
    speedY: number;
    opacity: number;
  }>>([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // 初始化星星
      starsRef.current = Array.from({ length: 150 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.1 + 0.02,
        opacity: Math.random() * 0.5 + 0.3,
        twinkleSpeed: Math.random() * 0.02 + 0.01,
        twinklePhase: Math.random() * Math.PI * 2,
      }));

      // 初始化粒子
      particlesRef.current = Array.from({ length: 30 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.3 + 0.1,
      }));
    };

    resize();
    window.addEventListener('resize', resize);

    let time = 0;
    const animate = () => {
      time += 0.016;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 绘制渐变背景
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#0f0f23');
      gradient.addColorStop(0.5, '#1a1a2e');
      gradient.addColorStop(1, '#16213e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 绘制星星
      starsRef.current.forEach(star => {
        star.twinklePhase += star.twinkleSpeed;
        const twinkle = Math.sin(star.twinklePhase) * 0.3 + 0.7;
        star.x += star.speed;
        if (star.x > canvas.width) star.x = 0;
        
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity * twinkle})`;
        ctx.fill();

        // 添加光晕
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity * twinkle * 0.1})`;
        ctx.fill();
      });

      // 绘制粒子
      particlesRef.current.forEach(particle => {
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(147, 112, 219, ${particle.opacity})`;
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  );
}

// 漂浮头像组件
function FloatingAvatar({ 
  participant, 
  index, 
  total 
}: { 
  participant: Participant; 
  index: number; 
  total: number;
}) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(true);
  const avatarRef = useRef<HTMLDivElement>(null);
  const statusConfig = STATUS_OPTIONS.find(s => s.value === participant.status) || STATUS_OPTIONS[0];
  
  // 计算初始位置（围绕中心分布）
  useEffect(() => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const radius = Math.min(window.innerWidth, window.innerHeight) * 0.3;
    const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
    
    setPosition({
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    });
  }, [index, total]);

  // 缓慢漂浮动画
  useEffect(() => {
    let animationId: number;
    let time = Math.random() * Math.PI * 2;
    const startX = position.x;
    const startY = position.y;
    
    const animate = () => {
      time += 0.01;
      setPosition({
        x: startX + Math.sin(time) * 20,
        y: startY + Math.cos(time * 0.7) * 15,
      });
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [position.x, position.y]);

  const avatar = participant.profiles?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + participant.user_id;
  const username = participant.profiles?.username || '匿名';

  return (
    <div
      ref={avatarRef}
      className="absolute flex flex-col items-center transition-all duration-1000"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
        opacity: isVisible ? 1 : 0,
      }}
    >
      {/* 发光效果 */}
      <div 
        className="absolute rounded-full animate-pulse"
        style={{
          width: 70,
          height: 70,
          background: `radial-gradient(circle, var(--theme-primary)30 0%, transparent 70%)`,
          animation: 'breathe 4s ease-in-out infinite',
        }}
      />
      {/* 头像 */}
      <div className="relative w-14 h-14 rounded-full overflow-hidden border-2" style={{ borderColor: 'var(--theme-primary)' }}>
        <img 
          src={avatar} 
          alt={username}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${participant.user_id}`;
          }}
        />
        {participant.is_owner && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs" style={{ backgroundColor: 'var(--theme-primary)' }}>
            👑
          </div>
        )}
      </div>
      {/* 状态标签 */}
      <div 
        className="mt-2 px-2 py-0.5 rounded-full text-xs whitespace-nowrap flex items-center gap-0.5"
        style={{ 
          backgroundColor: 'color-mix(in srgb, var(--theme-primary) 12%, transparent)',
          color: 'var(--theme-primary)',
        }}
      >
        <statusConfig.Icon className="w-3 h-3" /> {statusConfig.label}
      </div>
    </div>
  );
}

// 漂浮句子组件
function FloatingSentence({ sentence, onFadeOut }: { sentence: Sentence; onFadeOut: () => void }) {
  const [opacity, setOpacity] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isOverflowing, setIsOverflowing] = useState(false);
  const sentenceRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  
  // 检测文字是否溢出
  useEffect(() => {
    if (textRef.current) {
      // 延迟检测，等待 DOM 完全渲染
      const timer = setTimeout(() => {
        if (textRef.current) {
          const isOverflow = textRef.current.scrollWidth > textRef.current.clientWidth;
          setIsOverflowing(isOverflow);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [sentence.content]);
  
  // 注入 marquee 动画样式
  useEffect(() => {
    const styleId = 'marquee-keyframes-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `;
      document.head.appendChild(style);
    }
    return () => {
      // 不删除，因为可能其他句子也用到
    };
  }, []);
  
  useEffect(() => {
    // 淡入
    const fadeInTimer = setTimeout(() => setOpacity(1), 100);
    
    // 初始位置
    setPosition({
      x: Math.random() * (window.innerWidth - 200) + 100,
      y: window.innerHeight * 0.6 + Math.random() * 100,
    });

    // 30秒后淡出
    const fadeOutTimer = setTimeout(() => {
      setOpacity(0);
      setTimeout(onFadeOut, 1000);
    }, 30000);

    return () => {
      clearTimeout(fadeInTimer);
      clearTimeout(fadeOutTimer);
    };
  }, [onFadeOut]);

  // 缓慢上升
  useEffect(() => {
    if (opacity === 0) return;
    
    let animationId: number;
    let y = position.y;
    
    const animate = () => {
      y -= 0.1;
      if (y < -50) y = window.innerHeight + 50;
      setPosition(prev => ({ ...prev, y }));
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [opacity]);

  const username = sentence.profiles?.username || '匿名';

  return (
    <div
      ref={sentenceRef}
      className="absolute px-4 py-2 rounded-2xl backdrop-blur-sm"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translateX(-50%)',
        opacity,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        transition: 'opacity 1s ease-in-out',
      }}
    >
      {isOverflowing ? (
        <div className="overflow-hidden" style={{ maxWidth: '180px' }}>
          <div 
            style={{ 
              display: 'inline-block', 
              whiteSpace: 'nowrap', 
              animation: 'marquee 10s linear infinite' 
            }}
          >
            <p ref={textRef} className="text-sm text-white/90 pr-8">{sentence.content}</p>
            <span style={{ paddingRight: '2em' }}>{sentence.content}</span>
          </div>
        </div>
      ) : (
        <p ref={textRef} className="text-sm text-white/90 whitespace-nowrap">{sentence.content}</p>
      )}
    </div>
  );
}

function SilentRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [currentStatus, setCurrentStatus] = useState('quiet');
  const [showSentenceInput, setShowSentenceInput] = useState(false);
  const [sentenceText, setSentenceText] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [showSoundPanel, setShowSoundPanel] = useState(false);
  const [showDisbandConfirm, setShowDisbandConfirm] = useState(false);
  const [isDisbanding, setIsDisbanding] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [showLyricsInput, setShowLyricsInput] = useState<string | null>(null);
  const [lyricsText, setLyricsText] = useState('');
  const [panelHeight, setPanelHeight] = useState(200);
  const [isDragging, setIsDragging] = useState(false);
  
  // 音频播放状态
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playMode, setPlayMode] = useState<'list' | 'single' | 'shuffle'>('list');
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUploadRef = useRef<HTMLInputElement>(null);
  const playerRef = useRef<HTMLAudioElement | null>(null);

  // 获取当前用户ID
  useEffect(() => {
    const userInfo = localStorage.getItem('user_info');
    if (userInfo) {
      const parsed = JSON.parse(userInfo);
      setUserId(parsed.user_id || parsed.id);
    }
  }, []);

  // 获取房间信息
  const fetchRoom = useCallback(async () => {
    if (!roomId) return;
    try {
      const res = await fetch(
        `/sb-api/rest/v1/rooms?id=eq.${roomId}&select=*`,
        {
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          },
        }
      );
      if (!res.ok) throw new Error('房间不存在');
      const data = await res.json();
      if (data.length === 0) throw new Error('房间不存在');
      const roomData = data[0];
      setRoom(roomData);
      // 设置音频轨道
      if (roomData.audio_tracks && Array.isArray(roomData.audio_tracks) && roomData.audio_tracks.length > 0) {
        setAudioTracks(roomData.audio_tracks);
      } else if (roomData.custom_audio_url) {
        // Fallback: 如果有 custom_audio_url 但没有 audio_tracks，从 custom_audio_url 构建
        const fallbackTrack: AudioTrack = {
          id: `custom-${Date.now()}`,
          name: '自定义音频',
          url: roomData.custom_audio_url,
          duration: 0,
          lyrics: '',
          uploaded_at: new Date().toISOString(),
        };
        setAudioTracks([fallbackTrack]);
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, [roomId]);

  // 获取参与者
  const fetchParticipants = useCallback(async () => {
    if (!roomId) return;
    try {
      const res = await fetch(
        `/sb-api/rest/v1/room_participants?room_id=eq.${roomId}&select=*,profiles(username,avatar_url,faith_tag)&order=joined_at.asc`,
        {
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setParticipants(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch participants:', err);
    }
  }, [roomId]);

  // 获取漂浮句子
  const fetchSentences = useCallback(async () => {
    if (!roomId) return;
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const res = await fetch(
        `/sb-api/rest/v1/room_sentences?room_id=eq.${roomId}&created_at=gte.${fiveMinutesAgo}&select=*,profiles(username,avatar_url)&order=created_at.desc&limit=10`,
        {
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setSentences(Array.isArray(data) ? data.slice(0, 3) : []);
      }
    } catch (err) {
      console.error('Failed to fetch sentences:', err);
    }
  }, [roomId]);

  // 加入房间
  const joinRoom = useCallback(async () => {
    if (!roomId || !userId) return;
    try {
      // 检查是否已在房间
      const checkRes = await fetch(
        `/sb-api/rest/v1/room_participants?room_id=eq.${roomId}&user_id=eq.${userId}&select=id`,
        {
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          },
        }
      );
      const checkData = await checkRes.json();
      
      if (Array.isArray(checkData) && checkData.length === 0) {
        // 加入房间
        await fetch('/sb-api/rest/v1/room_participants', {
          method: 'POST',
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            room_id: roomId,
            user_id: userId,
            is_owner: room?.creator_id === userId,
            status: 'quiet',
          }),
        });
      }
    } catch (err) {
      console.error('Failed to join room:', err);
    }
  }, [roomId, userId, room?.creator_id]);

  // 离开房间
  const leaveRoom = useCallback(async () => {
    if (!roomId || !userId) return;
    try {
      await fetch(
        `/sb-api/rest/v1/room_participants?room_id=eq.${roomId}&user_id=eq.${userId}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          },
        }
      );
    } catch (err) {
      console.error('Failed to leave room:', err);
    }
  }, [roomId, userId]);

  // 解散房间（房主专属）
  const disbandRoom = async () => {
    if (!roomId || isDisbanding) return;
    setIsDisbanding(true);
    
    try {
      // 1. 删除所有 room_participants 记录
      await fetch(`/sb-api/rest/v1/room_participants?room_id=eq.${roomId}`, {
        method: 'DELETE',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
      });
      
      // 2. 删除所有 room_sentences 记录
      await fetch(`/sb-api/rest/v1/room_sentences?room_id=eq.${roomId}`, {
        method: 'DELETE',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
      });
      
      // 3. 删除房间记录
      await fetch(`/sb-api/rest/v1/rooms?id=eq.${roomId}`, {
        method: 'DELETE',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
      });
      
      // 4. 跳转回房间列表页
      navigate('/');
    } catch (err) {
      console.error('Failed to disband room:', err);
      alert('解散房间失败，请重试');
    } finally {
      setIsDisbanding(false);
      setShowDisbandConfirm(false);
    }
  };

  // 发送心跳
  const sendHeartbeat = useCallback(async () => {
    if (!roomId || !userId) return;
    try {
      await fetch(
        `/sb-api/rest/v1/room_participants?room_id=eq.${roomId}&user_id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            last_active_at: new Date().toISOString(),
            status: currentStatus,
          }),
        }
      );
    } catch (err) {
      console.error('Failed to send heartbeat:', err);
    }
  }, [roomId, userId, currentStatus]);

  // 音频播放控制 - 根据轨道列表播放
  const playTrack = useCallback((trackUrl?: string) => {
    if (isMuted || audioTracks.length === 0) return;
    
    const url = trackUrl || audioTracks[currentTrackIndex]?.url;
    if (!url) return;
    
    // 停止之前的播放
    if (playerRef.current) {
      playerRef.current.pause();
      playerRef.current = null;
    }
    
    const audio = new Audio(url);
    audio.volume = 0.5;
    
    audio.onended = () => {
      if (playMode === 'single') {
        // 单曲循环
        playTrack(url);
      } else if (playMode === 'shuffle') {
        // 随机播放下一首
        let nextIndex = Math.floor(Math.random() * audioTracks.length);
        if (nextIndex === currentTrackIndex && audioTracks.length > 1) {
          nextIndex = (nextIndex + 1) % audioTracks.length;
        }
        setCurrentTrackIndex(nextIndex);
        playTrack(audioTracks[nextIndex].url);
      } else {
        // 列表循环
        const nextIndex = (currentTrackIndex + 1) % audioTracks.length;
        setCurrentTrackIndex(nextIndex);
        if (nextIndex === 0 && !isPlaying) {
          setIsPlaying(false);
        } else {
          playTrack(audioTracks[nextIndex].url);
        }
      }
    };
    
    audio.onerror = () => {
      console.error('Audio playback error');
      setIsPlaying(false);
    };
    
    playerRef.current = audio;
    audio.play().catch(() => {});
    setIsPlaying(true);
  }, [isMuted, audioTracks, currentTrackIndex, playMode, isPlaying]);

  const pauseTrack = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pauseTrack();
    } else {
      if (audioTracks.length > 0 && !playerRef.current) {
        playTrack();
      } else if (playerRef.current) {
        playerRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  }, [isPlaying, pauseTrack, playTrack, audioTracks]);

  const playPrevious = useCallback(() => {
    if (audioTracks.length === 0) return;
    const newIndex = currentTrackIndex === 0 ? audioTracks.length - 1 : currentTrackIndex - 1;
    setCurrentTrackIndex(newIndex);
    if (isPlaying) {
      setTimeout(() => playTrack(audioTracks[newIndex].url), 100);
    }
  }, [audioTracks, currentTrackIndex, isPlaying, playTrack]);

  const playNext = useCallback(() => {
    if (audioTracks.length === 0) return;
    const newIndex = (currentTrackIndex + 1) % audioTracks.length;
    setCurrentTrackIndex(newIndex);
    if (isPlaying) {
      setTimeout(() => playTrack(audioTracks[newIndex].url), 100);
    }
  }, [audioTracks, currentTrackIndex, isPlaying, playTrack]);

  const cyclePlayMode = useCallback(() => {
    setPlayMode(prev => {
      if (prev === 'list') return 'single';
      if (prev === 'single') return 'shuffle';
      return 'list';
    });
  }, []);

  // 播放环境音 - 简化为静音控制
  const playAmbientSound = useCallback(() => {
    if (isMuted) {
      pauseTrack();
    } else if (audioTracks.length > 0) {
      playTrack();
    }
  }, [isMuted, pauseTrack, playTrack, audioTracks.length]);

  // 拖动调整面板大小
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    
    const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const startHeight = panelHeight;
    
    const handleDragMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentY = 'touches' in moveEvent ? (moveEvent as TouchEvent).touches[0].clientY : (moveEvent as MouseEvent).clientY;
      const delta = startY - currentY;
      const newHeight = Math.min(400, Math.max(150, startHeight + delta));
      setPanelHeight(newHeight);
    };
    
    const handleDragEnd = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('touchmove', handleDragMove);
      document.removeEventListener('touchend', handleDragEnd);
    };
    
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleDragMove);
    document.addEventListener('touchend', handleDragEnd);
  }, [panelHeight]);

  // 初始化
  useEffect(() => {
    if (!roomId) return;
    
    setIsLoading(true);
    Promise.all([fetchRoom()]).finally(() => setIsLoading(false));
  }, [roomId, fetchRoom]);

  // 加入房间并获取数据
  useEffect(() => {
    if (!roomId || !userId) return;
    
    joinRoom();
    fetchParticipants();
    fetchSentences();

    // 每10秒刷新数据
    const dataInterval = setInterval(() => {
      fetchParticipants();
      fetchSentences();
    }, 10000);

    // 每60秒心跳 + 检查房间是否应解散
    const heartbeatInterval = setInterval(async () => {
      sendHeartbeat();
      
      // 检查房间是否应该解散（1小时无人）
      try {
        const res = await fetch(
          `/sb-api/rest/v1/rooms?id=eq.${roomId}&select=last_activity_at,user_count`,
          {
            headers: {
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            },
          }
        );
        const rooms = await res.json();
        if (rooms.length > 0) {
          const roomData = rooms[0];
          const lastActivity = roomData.last_activity_at ? new Date(roomData.last_activity_at).getTime() : 0;
          const oneHourAgo = Date.now() - 60 * 60 * 1000;
          if (roomData.user_count === 0 && lastActivity < oneHourAgo) {
            // 解散房间
            await fetch(`/sb-api/rest/v1/room_participants?room_id=eq.${roomId}`, { method: 'DELETE', headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` } });
            await fetch(`/sb-api/rest/v1/room_sentences?room_id=eq.${roomId}`, { method: 'DELETE', headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` } });
            await fetch(`/sb-api/rest/v1/rooms?id=eq.${roomId}`, { method: 'DELETE', headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` } });
            navigate('/');
          }
        }
      } catch (err) {
        console.error('Failed to check room cleanup:', err);
      }
    }, 60000);

    // 页面关闭/刷新时离开房间
    const handleBeforeUnload = () => {
      // 用 sendBeacon 确保离开请求被发送
      const url = `/sb-api/rest/v1/room_participants?room_id=eq.${roomId}&user_id=eq.${userId}`;
      navigator.sendBeacon(url); // Note: sendBeacon only supports POST, fallback to sync fetch
      // 同步 XHR 作为 fallback
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('DELETE', url, false); // false = synchronous
        xhr.setRequestHeader('apikey', SERVICE_ROLE_KEY);
        xhr.setRequestHeader('Authorization', `Bearer ${SERVICE_ROLE_KEY}`);
        xhr.send();
      } catch {}
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // 清理 - 只清理定时器和事件监听，不调用 leaveRoom
    // leaveRoom 只在用户主动退出时调用
    return () => {
      clearInterval(dataInterval);
      clearInterval(heartbeatInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (playerRef.current) {
        playerRef.current.pause();
        playerRef.current = null;
      }
    };
  }, [roomId, userId]);

  // 播放环境音 - 当房间数据加载时自动播放
  useEffect(() => {
    if (room && audioTracks.length > 0 && !isMuted) {
      try {
        playTrack();
      } catch (err) {
        console.error('Failed to play audio:', err);
      }
    }
  }, [room, audioTracks.length, isMuted, playTrack]);

  // 同步房间在线人数到 rooms 表
  useEffect(() => {
    if (!roomId || participants.length === 0) return;
    fetch(`/sb-api/rest/v1/rooms?id=eq.${roomId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_count: participants.length }),
    }).catch(() => {});
  }, [roomId, participants.length]);

  // 更新状态
  const updateStatus = async (newStatus: string) => {
    setCurrentStatus(newStatus);
    if (!roomId || !userId) return;
    
    try {
      await fetch(
        `/sb-api/rest/v1/room_participants?room_id=eq.${roomId}&user_id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // 发送句子
  const sendSentence = async () => {
    if (!sentenceText.trim() || !roomId || !userId) return;
    
    try {
      const res = await fetch('/sb-api/rest/v1/room_sentences', {
        method: 'POST',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room_id: roomId,
          user_id: userId,
          content: sentenceText.trim().slice(0, 30),
        }),
      });
      
      if (res.ok) {
        setSentenceText('');
        setShowSentenceInput(false);
        fetchSentences();
      }
    } catch (err) {
      console.error('Failed to send sentence:', err);
    }
  };

  // 分享房间
  const shareRoom = () => {
    const url = `${window.location.origin}${window.location.pathname}#/room/${roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      alert('房间链接已复制到剪贴板');
    }).catch(() => {
      alert('房间链接: ' + url);
    });
  };

  // 上传自定义音频（支持多文件）
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !roomId || room?.creator_id !== userId) return;
    
    // 检查文件大小
    for (const file of files) {
      if (file.size > 20 * 1024 * 1024) {
        alert(`文件 ${file.name} 超过20MB限制`);
        return;
      }
      if (!file.type.startsWith('audio/')) {
        alert(`文件 ${file.name} 不是音频文件`);
        return;
      }
    }
    
    setUploadingAudio(true);
    setUploadProgress(`上传中 0/${files.length}...`);
    
    const newTracks: AudioTrack[] = [];
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(`上传中 ${i + 1}/${files.length}...`);
        
        const arrayBuffer = await file.arrayBuffer();
        const fileName = `${Date.now()}_${file.name}`;
        
        const uploadRes = await fetch(
          `/sb-storage/v1/object/room-audio/${roomId}/${fileName}`,
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
          console.error('Failed to upload:', file.name);
          continue;
        }

        const audioUrl = `${SUPABASE_URL}/storage/v1/object/public/room-audio/${roomId}/${fileName}`;
        
        // 获取音频时长
        const duration = await new Promise<number>((resolve) => {
          const audio = new Audio(audioUrl);
          audio.onloadedmetadata = () => resolve(audio.duration);
          audio.onerror = () => resolve(0);
        });
        
        newTracks.push({
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          url: audioUrl,
          duration: duration || undefined,
          uploaded_at: new Date().toISOString(),
        });
      }
      
      if (newTracks.length > 0) {
        // 更新音频轨道列表
        const updatedTracks = [...audioTracks, ...newTracks];
        setAudioTracks(updatedTracks);
        
        // 更新数据库
        await updateAudioTracksInRoom(updatedTracks);
        
        // 如果是第一个轨道，自动播放
        if (audioTracks.length === 0) {
          setCurrentTrackIndex(0);
          setIsPlaying(true);
          playTrack(newTracks[0].url);
        }
      }
    } catch (err) {
      console.error('Failed to upload audio:', err);
      alert('音频上传失败');
    } finally {
      setUploadingAudio(false);
      setUploadProgress('');
      // 清空 input 以便重新选择同一文件
      if (audioUploadRef.current) {
        audioUploadRef.current.value = '';
      }
    }
  };
  
  // 更新房间的 audio_tracks 字段
  const updateAudioTracksInRoom = async (tracks: AudioTrack[]) => {
    if (!roomId || room?.creator_id !== userId) return;
    
    try {
      const res = await fetch(`/sb-api/rest/v1/rooms?id=eq.${roomId}`, {
        method: 'PATCH',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audio_tracks: tracks }),
      });
      
      if (res.ok) {
        setRoom(prev => prev ? { ...prev, audio_tracks: tracks } : null);
      } else {
        // audio_tracks 列可能不存在，忽略错误
        console.warn('audio_tracks update failed, column may not exist');
      }
    } catch (err) {
      console.error('Failed to update audio tracks:', err);
    }
  };
  
  // 删除音频轨道
  const deleteAudioTrack = async (trackId: string) => {
    if (!roomId || room?.creator_id !== userId) return;
    
    const updatedTracks = audioTracks.filter(t => t.id !== trackId);
    setAudioTracks(updatedTracks);
    
    // 如果删除的是当前播放的曲目
    const deletedIndex = audioTracks.findIndex(t => t.id === trackId);
    if (deletedIndex !== -1) {
      if (deletedIndex < currentTrackIndex) {
        setCurrentTrackIndex(prev => prev - 1);
      } else if (deletedIndex === currentTrackIndex) {
        pauseTrack();
        if (updatedTracks.length > 0) {
          const newIndex = Math.min(currentTrackIndex, updatedTracks.length - 1);
          setCurrentTrackIndex(newIndex);
        } else {
          setCurrentTrackIndex(0);
        }
      }
    }
    
    await updateAudioTracksInRoom(updatedTracks);
  };
  
  // 添加歌词
  const addLyricsToTrack = async (trackId: string, lyrics: string) => {
    if (!roomId || room?.creator_id !== userId) return;
    
    const updatedTracks = audioTracks.map(t => 
      t.id === trackId ? { ...t, lyrics } : t
    );
    setAudioTracks(updatedTracks);
    await updateAudioTracksInRoom(updatedTracks);
    setShowLyricsInput(null);
    setLyricsText('');
  };

  // 移除过期的句子
  const removeSentence = (id: string) => {
    setSentences(prev => prev.filter(s => s.id !== id));
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: '#0f0f23' }}>
        <div className="text-center">
          <Moon className="w-10 h-10 mb-4 animate-pulse" style={{ color: 'var(--theme-primary)' }} />
          <p className="text-white/60">进入静默空间...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: '#0f0f23' }}>
        <div className="text-center p-8">
          <div className="text-4xl mb-4">😔</div>
          <p className="text-white/80 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 rounded-full text-white"
            style={{ backgroundColor: '#E11D48' }}
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ backgroundColor: '#0f0f23' }}>
      <StarryBackground />

      {/* 顶部区域 */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-full backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        
        <div className="text-center">
          <h1 className="text-white font-medium">{room?.name || '房间'}</h1>
          {room?.room_code && (
            <p className="text-white/40 text-xs">ID: {room.room_code}</p>
          )}
          <p className="text-white/50 text-sm flex items-center justify-center gap-1"><Moon className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} /> {participants.length || room?.user_count || 0} 人在此</p>
        </div>

        <button
          onClick={shareRoom}
          className="p-2 rounded-full backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
        >
          <Share2 className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* 中间区域 - 漂浮头像 */}
      <div className="absolute inset-0 z-5">
        {participants.slice(0, 50).map((participant, index) => (
          <FloatingAvatar
            key={participant.id}
            participant={participant}
            index={index}
            total={Math.min(participants.length, 50)}
          />
        ))}
        {participants.length > 50 && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="px-4 py-2 rounded-full backdrop-blur-sm" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
              <span className="text-white/70">+{participants.length - 50} more</span>
            </div>
          </div>
        )}
      </div>

      {/* 漂浮句子 */}
      {sentences.map(sentence => (
        <FloatingSentence
          key={sentence.id}
          sentence={sentence}
          onFadeOut={() => removeSentence(sentence.id)}
        />
      ))}

      {/* 环境音控制 - 合并为一个按钮 */}
      <div className="absolute top-20 right-4 z-10">
        <button
          onClick={() => setShowSoundPanel(!showSoundPanel)}
          className="p-2 rounded-full backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
          title="声音设置"
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5 text-white/60" />
          ) : (
            <Volume2 className="w-5 h-5 text-white" />
          )}
        </button>
      </div>

      {/* 声音设置面板 - 合并所有功能 */}
      {showSoundPanel && (
        <div className="absolute top-28 right-4 z-20 w-72 p-4 rounded-2xl backdrop-blur-md" style={{ backgroundColor: 'rgba(30, 30, 50, 0.95)' }}>
          {/* 顶部静音切换 */}
          {/* 静音控制 */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/80 text-sm">音频播放</span>
            <button
              onClick={() => {
                if (isMuted) {
                  setIsMuted(false);
                  // 恢复播放
                  if (audioTracks.length > 0) {
                    playTrack(audioTracks[currentTrackIndex]?.url);
                  }
                } else {
                  setIsMuted(true);
                  pauseTrack();
                }
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all"
              style={{
                backgroundColor: isMuted ? 'rgba(255, 255, 255, 0.1)' : 'rgba(225, 29, 72, 0.3)',
              }}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-white/60" />
              ) : isPlaying ? (
                <Volume2 className="w-4 h-4 text-white" />
              ) : (
                <Volume2 className="w-4 h-4 text-white/60" />
              )}
              <span className="text-xs text-white/70">
                {isMuted ? '静音' : isPlaying ? '播放中' : '已暂停'}
              </span>
            </button>
          </div>
          
          {/* 播放列表 */}
          <div className="border-t border-white/10 pt-3 mb-3">
            {/* 拖动手柄 */}
            <div 
              className="flex justify-center py-1 cursor-ns-resize mb-2"
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
            >
              <div className="w-8 h-1 rounded-full bg-white/30" />
            </div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-white/50 text-xs font-medium flex items-center gap-1">
                <ListMusic className="w-3.5 h-3.5" />
                播放列表
              </div>
              <span className="text-white/30 text-xs">{audioTracks.length} 首</span>
            </div>
            
            {audioTracks.length === 0 ? (
              <div className="text-white/30 text-xs text-center py-4">
                暂无音频，上传音频开始播放
              </div>
            ) : (
              <div className="overflow-y-auto space-y-1" style={{ maxHeight: panelHeight - 100 }}>
                {audioTracks.map((track, index) => (
                  <div
                    key={track.id}
                    className="flex items-center gap-2 p-2 rounded-lg transition-all"
                    style={{
                      backgroundColor: currentTrackIndex === index && isPlaying 
                        ? 'rgba(225, 29, 72, 0.2)' 
                        : 'rgba(255, 255, 255, 0.05)',
                      border: currentTrackIndex === index ? '1px solid rgba(225, 29, 72, 0.5)' : '1px solid transparent',
                    }}
                  >
                    <button
                      onClick={() => {
                        setCurrentTrackIndex(index);
                        if (!isMuted) {
                          playTrack(track.url);
                        }
                      }}
                      className="flex-1 text-left"
                    >
                      <div className="text-xs text-white/80 truncate">{track.name}</div>
                      {track.duration && (
                        <div className="text-xs text-white/40">
                          {Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2, '0')}
                        </div>
                      )}
                    </button>
                    {room?.creator_id === userId && (
                      <>
                        <button
                          onClick={() => setShowLyricsInput(track.id)}
                          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                          title="添加歌词"
                        >
                          <Music className="w-3.5 h-3.5 text-white/40" />
                        </button>
                        <button
                          onClick={() => deleteAudioTrack(track.id)}
                          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-white/40" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* 房主专属：上传音频 */}
          {room?.creator_id === userId && (
            <>
              <div className="border-t border-white/10 pt-3 mb-3">
                <input
                  type="file"
                  ref={audioUploadRef}
                  accept="audio/*"
                  multiple
                  onChange={handleAudioUpload}
                  className="hidden"
                />
                <button
                  onClick={() => audioUploadRef.current?.click()}
                  disabled={uploadingAudio}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-all"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    opacity: uploadingAudio ? 0.6 : 1,
                  }}
                >
                  <Upload className="w-4 h-4 text-white" />
                  <span className="text-white/70">
                    {uploadingAudio ? uploadProgress || '上传中...' : '上传音频文件'}
                  </span>
                </button>
              </div>
              
              {/* 解散房间按钮（房主专属，红色文字） */}
              <div className="border-t border-white/10 pt-3">
                <button
                  onClick={() => setShowDisbandConfirm(true)}
                  className="w-full py-2 text-sm text-red-400 hover:text-red-300 transition-colors"
                >
                  解散房间
                </button>
              </div>
            </>
          )}
          
          {/* 歌词输入弹窗 */}
          {showLyricsInput && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
              <div className="w-80 p-4 rounded-2xl" style={{ backgroundColor: 'rgba(30, 30, 50, 0.98)' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white text-sm font-medium">添加歌词</span>
                  <button onClick={() => { setShowLyricsInput(null); setLyricsText(''); }}>
                    <X className="w-4 h-4 text-white/40" />
                  </button>
                </div>
                <textarea
                  value={lyricsText}
                  onChange={e => setLyricsText(e.target.value)}
                  placeholder="粘贴歌词文本..."
                  className="w-full h-32 p-2 rounded-lg text-sm resize-none"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => { setShowLyricsInput(null); setLyricsText(''); }}
                    className="flex-1 py-2 rounded-lg text-sm text-white/60"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                  >
                    取消
                  </button>
                  <button
                    onClick={() => addLyricsToTrack(showLyricsInput, lyricsText)}
                    className="flex-1 py-2 rounded-lg text-sm text-white"
                    style={{ backgroundColor: '#E11D48' }}
                  >
                    保存
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* 关闭按钮 */}
          <button
            onClick={() => setShowSoundPanel(false)}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>
      )}

      {/* 解散房间确认对话框 */}
      {showDisbandConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-80 p-6 rounded-2xl backdrop-blur-md" style={{ backgroundColor: 'rgba(30, 30, 50, 0.95)' }}>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(220, 38, 38, 0.2)' }}>
                <Power className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-white text-lg font-medium mb-2">解散房间</h3>
              <p className="text-white/60 text-sm mb-6">
                确定要解散这个房间吗？<br/>
                此操作不可恢复，所有数据将被删除。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDisbandConfirm(false)}
                  className="flex-1 py-2.5 rounded-full text-sm text-white/70 hover:bg-white/10 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={disbandRoom}
                  disabled={isDisbanding}
                  className="flex-1 py-2.5 rounded-full text-sm text-white transition-colors"
                  style={{ backgroundColor: '#DC2626' }}
                >
                  {isDisbanding ? '解散中...' : '确定解散'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 歌词 marquee 动画样式 */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
      `}</style>

      {/* 底部操作栏 - 音乐控制和轻语合并 */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4 pb-8">
        <div className="max-w-md mx-auto">
          {/* 状态选择器 - 只显示图标，不滑动 */}
          <div className="flex justify-center gap-3 mb-4">
            {STATUS_OPTIONS.map(status => (
              <button
                key={status.value}
                onClick={() => updateStatus(status.value)}
                className="w-10 h-10 rounded-full transition-all flex items-center justify-center"
                title={status.label}
                style={{
                  backgroundColor: currentStatus === status.value ? 'color-mix(in srgb, var(--theme-primary) 20%, transparent)' : 'rgba(255, 255, 255, 0.1)',
                  color: currentStatus === status.value ? 'var(--theme-primary)' : 'rgba(255, 255, 255, 0.6)',
                  border: currentStatus === status.value ? '1.5px solid var(--theme-primary)' : '1.5px solid transparent',
                }}
              >
                <status.Icon className="w-4 h-4" />
              </button>
            ))}
          </div>

          {/* 合并的音乐控制和轻语输入行 */}
          <div className="flex items-center gap-2">
            {/* 左侧：音乐控制按钮组（仅房主可见且有音频时） */}
            {audioTracks.length > 0 && room?.creator_id === userId && (
              <>
                <div className="flex items-center gap-1 px-3 py-2 rounded-full" style={{ backgroundColor: 'rgba(30, 30, 50, 0.9)' }}>
                  <button
                    onClick={playPrevious}
                    className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
                  >
                    <SkipBack className="w-4 h-4 text-white/70" />
                  </button>
                  <button
                    onClick={togglePlayPause}
                    className="p-2 rounded-full" 
                    style={{ backgroundColor: '#E11D48' }}
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 text-white" />
                    ) : (
                      <Play className="w-4 h-4 text-white" />
                    )}
                  </button>
                  <button
                    onClick={playNext}
                    className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
                  >
                    <SkipForward className="w-4 h-4 text-white/70" />
                  </button>
                  <div className="w-px h-5 bg-white/20 mx-1" />
                  <div className="text-xs text-white/80 max-w-24 truncate">
                    {audioTracks[currentTrackIndex]?.name || '未选择'}
                  </div>
                </div>
                <div className="w-px h-8 bg-white/20" />
              </>
            )}
            
            {/* 右侧：轻语输入框 */}
            {showSentenceInput ? (
              <div className="flex-1 flex flex-col gap-1">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={sentenceText}
                    onChange={e => setSentenceText(e.target.value.slice(0, 60))}
                    placeholder="轻轻留下一句话..."
                    maxLength={60}
                    className="flex-1 h-11 px-4 rounded-full text-sm backdrop-blur-sm"
                    style={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      color: 'white',
                      border: sentenceText.length >= 60 ? '2px solid #ef4444' : '2px solid transparent',
                    }}
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && sendSentence()}
                  />
                  <button
                    onClick={sendSentence}
                    disabled={!sentenceText.trim()}
                    className="h-11 px-5 rounded-full text-sm font-medium text-white disabled:opacity-50"
                    style={{ backgroundColor: '#E11D48' }}
                  >
                    发送
                  </button>
                  <button
                    onClick={() => { setShowSentenceInput(false); setSentenceText(''); }}
                    className="h-11 px-3 rounded-full backdrop-blur-sm"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                  >
                    <span className="text-white/60">×</span>
                  </button>
                </div>
                <div className="flex justify-end px-1">
                  <span 
                    className="text-xs px-2 py-0.5 rounded-full backdrop-blur-sm"
                    style={{ 
                      backgroundColor: sentenceText.length >= 60 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                      color: sentenceText.length >= 60 ? '#fca5a5' : 'rgba(255, 255, 255, 0.5)',
                    }}
                  >
                    {sentenceText.length}/60
                  </span>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowSentenceInput(true)}
                className="flex-1 h-11 rounded-full text-sm font-medium text-white/80 backdrop-blur-sm transition-all hover:bg-white/10 flex items-center justify-center gap-2"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
              >
                <Sparkles className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} /> 
                轻语
              </button>
            )}
          </div>

          {/* 退出房间 */}
          <button
            onClick={() => { leaveRoom(); navigate('/'); }}
            className="w-full mt-3 py-2 text-sm text-white/40"
          >
            退出房间
          </button>
        </div>
      </div>

      {/* 呼吸动画样式 */}
      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}

export default SilentRoom;
