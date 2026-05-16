import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Volume2, VolumeX, Moon, Music, BookOpen, Brain, Flower2, HeartHandshake, Sparkles, Upload, X, Power, SkipBack, SkipForward, Play, Pause, Repeat, Repeat1, Shuffle, ListMusic, Trash2, GripVertical, Type, Search } from 'lucide-react';
import * as mm from 'music-metadata';

// Service Role Key
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';
const SUPABASE_URL = 'https://rdhwmeittgdosmkxtpak.supabase.co';

// 从音频文件提取歌词
const extractLyricsFromFile = async (file: File): Promise<string> => {
  try {
    const metadata = await mm.parseBlob(file);
    
    // 1. 优先尝试SYLT标签（同步歌词，带时间戳）
    const syltTag3 = metadata.native?.['ID3v2.3']?.find((tag: any) => tag.id === 'SYLT');
    const syltTag4 = metadata.native?.['ID3v2.4']?.find((tag: any) => tag.id === 'SYLT');
    const syltTag = syltTag3 || syltTag4;
    
    if (syltTag?.value) {
      // SYLT格式: [{text, time}...] 转为LRC格式
      const syltData = syltTag.value;
      if (Array.isArray(syltData) && syltData.length > 0) {
        const lrcLines = syltData.map((item: any) => {
          const seconds = item.time || 0;
          const mins = Math.floor(seconds / 60);
          const secs = Math.floor(seconds % 60);
          const ms = Math.floor((seconds % 1) * 100);
          const text = item.text || '';
          return `[${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}]${text}`;
        });
        return lrcLines.join('\n');
      }
    }
    
    // 2. 尝试USLT标签
    let lyrics: any = 
      metadata.native?.['ID3v2.3']?.find((tag: any) => tag.id === 'USLT')?.value?.lyrics
      || metadata.native?.['ID3v2.4']?.find((tag: any) => tag.id === 'USLT')?.value?.lyrics
      || metadata.common.lyrics?.[0]
      || '';
    
    // musicmetadata 可能返回对象 {text, language, variant} 而非纯字符串
    if (lyrics && typeof lyrics === 'object') {
      lyrics = lyrics.text || lyrics.lyrics || JSON.stringify(lyrics);
    }
    return typeof lyrics === 'string' ? lyrics : String(lyrics || '');
  } catch (err) {
    console.warn('Failed to parse audio metadata:', err);
    return '';
  }
};

// 从Python dict格式字符串中提取text字段
const extractTextFromDictFormat = (text: string): string => {
  if (!text || typeof text !== 'string') return text;
  
  // 检查是否是Python dict格式: {'text': "...", 'language': 'eng', ...}
  const dictPattern = /\{'text':\s*'([\s\S]*?)'(?:,\s*'language'|\s*\})/;
  const match = text.match(dictPattern);
  
  if (match && match[1]) {
    // 将Python转义字符转换为正常字符
    return match[1]
      .replace(/\\n/g, '\n')
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }
  
  // 也检查双引号格式: {"text": "...", ...}
  const jsonPattern = /\{"text":\s*"([\s\S]*?)"(?:,\s*"language"|\s*\})/;
  const jsonMatch = text.match(jsonPattern);
  if (jsonMatch && jsonMatch[1]) {
    return jsonMatch[1]
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"');
  }
  
  return text;
};

// LRC歌词行类型
interface LrcLine {
  time: number; // 秒
  text: string;
}

// 解析LRC格式歌词
const parseLrc = (lrcText: string): LrcLine[] => {
  const lines = lrcText.split('\n');
  const result: LrcLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;
  
  for (const line of lines) {
    const timestamps: number[] = [];
    let match;
    while ((match = timeRegex.exec(line)) !== null) {
      const min = parseInt(match[1]);
      const sec = parseInt(match[2]);
      const ms = match[3] ? parseInt(match[3].padEnd(3, '0')) : 0;
      timestamps.push(min * 60 + sec + ms / 1000);
    }
    const text = line.replace(/\[\d{2}:\d{2}(?:\.\d{2,3})?\]/g, '').trim();
    if (timestamps.length > 0 && text) {
      for (const t of timestamps) {
        result.push({ time: t, text });
      }
    }
  }
  
  result.sort((a, b) => a.time - b.time);
  return result;
};

// 判断是否为LRC格式歌词
const isLrcFormat = (text: string): boolean => {
  return /\[\d{2}:\d{2}/.test(text);
};

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
  cachedLrc?: string | null; // 缓存的在线LRC歌词
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



// 漂浮句子组件
// 注入 float-up CSS 动画样式
const FLOAT_UP_STYLE_ID = 'float-up-keyframes-style';
if (typeof document !== 'undefined' && !document.getElementById(FLOAT_UP_STYLE_ID)) {
  const style = document.createElement('style');
  style.id = FLOAT_UP_STYLE_ID;
  style.textContent = `
    @keyframes float-up {
      0% { transform: translateX(-50%) translateY(0); opacity: 0; }
      5% { opacity: 1; }
      95% { opacity: 1; }
      100% { transform: translateX(-50%) translateY(-200px); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

function FloatingSentence({ sentence, onFadeOut }: { sentence: Sentence; onFadeOut: () => void }) {
  // 只在mount时计算一次位置，避免播放音乐时气泡跳动
  const [position] = useState(() => ({
    x: Math.random() * (window.innerWidth - 240) + 120,
    y: window.innerHeight * 0.55 + Math.random() * 100,
  }));

  const username = '';

  return (
    <div
      className="absolute px-4 py-2 rounded-2xl backdrop-blur-sm"
      style={{
        left: position.x,
        top: position.y,
        maxWidth: '300px',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        animation: 'float-up 30s linear forwards',
      }}
      onAnimationEnd={onFadeOut}
    >
      <div className="text-sm text-white/90 leading-relaxed overflow-y-auto" style={{ maxHeight: '100px' }}>
        {sentence.content}
      </div>
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
  const [panelHeight, setPanelHeight] = useState(200);
  const [isDragging, setIsDragging] = useState(false);
  
  // 新增状态
  const [showLyrics, setShowLyrics] = useState(false);
  const [currentPlayTime, setCurrentPlayTime] = useState(0);
  const [panelPos, setPanelPos] = useState({ x: Math.round((window.innerWidth - 360) / 2), y: Math.round(window.innerHeight - 280) });
  const [isPanelDragging, setIsPanelDragging] = useState(false);
  const [isSearchingLyrics, setIsSearchingLyrics] = useState(false);
  const [lyricsSearchFailed, setLyricsSearchFailed] = useState(false);
  
  // 音频播放状态
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playMode, setPlayMode] = useState<'list' | 'single' | 'shuffle'>('list');
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUploadRef = useRef<HTMLInputElement>(null);
  const playerRef = useRef<HTMLAudioElement | null>(null);


  // 获取当前用户ID（需要auth UUID，不是profiles.id）
  useEffect(() => {
    // room_sentences等表的外键关联的是profiles.user_id（auth UUID），不是profiles.id
    // 优先从user_info的session.user.id获取（这是auth UUID）
    const userInfo = localStorage.getItem('user_info');
    if (userInfo) {
      try {
        const parsed = JSON.parse(userInfo);
        // session.user.id 是 auth UUID
        if (parsed.id) {
          setUserId(parsed.id);
          return;
        }
      } catch {}
    }
    // 兜底：localStorage的user_id可能是profiles.id，需要查profiles表转换
    const savedUserId = localStorage.getItem('user_id');
    if (savedUserId) {
      // 查profiles表获取对应的auth UUID (user_id列)
      fetch(`/sb-api/rest/v1/profiles?id=eq.${savedUserId}&select=user_id`, {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
      })
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0 && data[0].user_id) {
            setUserId(data[0].user_id);
          } else {
            // 如果profiles.id查不到，可能user_id存的就是auth UUID
            setUserId(savedUserId);
          }
        })
        .catch(() => setUserId(savedUserId));
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

  // 音频播放控制 - 根据轨道列表播放（创建新Audio从头播放）
  const playTrack = useCallback((trackUrl?: string) => {
    if (audioTracks.length === 0) return;
    
    const url = trackUrl || audioTracks[currentTrackIndex]?.url;
    if (!url) return;
    
    // 停止之前的播放
    if (playerRef.current) {
      playerRef.current.pause();
      playerRef.current = null;
    }
    
    const audio = new Audio(url);
    // 根据静音状态设置音量
    audio.volume = isMuted ? 0 : 0.5;
    
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
        playTrack(audioTracks[nextIndex].url);
      }
    };
    
    audio.onerror = () => {
      console.error('Audio playback error');
      setIsPlaying(false);
    };
    
    playerRef.current = audio;
    audio.play().catch(() => {});
    setIsPlaying(true);
  }, [audioTracks, currentTrackIndex, playMode, isMuted]);

  // 暂停（保留Audio对象，可恢复播放）
  const pauseTrack = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.pause();
    }
    setIsPlaying(false);
  }, []);

  // 追踪音频播放时间（用于歌词同步）
  useEffect(() => {
    const tick = setInterval(() => {
      if (playerRef.current && !playerRef.current.paused) {
        setCurrentPlayTime(playerRef.current.currentTime);
      }
    }, 200);
    return () => clearInterval(tick);
  }, []);

  // 恢复播放（不重新创建Audio，继续当前进度）
  const resumeTrack = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.volume = isMuted ? 0 : 0.5;
      playerRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else if (audioTracks.length > 0) {
      // 没有Audio对象时才重新创建
      playTrack();
    }
  }, [isMuted, audioTracks, playTrack]);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pauseTrack();
    } else {
      resumeTrack();
    }
  }, [isPlaying, pauseTrack, resumeTrack]);

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

  // 静音切换：只切换音量，不暂停
  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (playerRef.current) {
      playerRef.current.volume = newMuted ? 0 : 0.5;
    }
  }, [isMuted]);

  // 播放/暂停：真正控制播放状态（暂停后恢复不从头开始）
  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pauseTrack();
    } else {
      resumeTrack();
    }
  }, [isPlaying, pauseTrack, resumeTrack]);

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

  // 可拖动面板位置控制
  const handlePanelDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsPanelDragging(true);
    
    const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const startPanelX = panelPos.x;
    const startPanelY = panelPos.y;
    
    const handleDragMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in moveEvent ? (moveEvent as TouchEvent).touches[0].clientX : (moveEvent as MouseEvent).clientX;
      const currentY = 'touches' in moveEvent ? (moveEvent as TouchEvent).touches[0].clientY : (moveEvent as MouseEvent).clientY;
      
      let newX = startPanelX + (currentX - startX);
      let newY = startPanelY + (currentY - startY);
      
      // 限制在屏幕范围内
      const panelWidth = 320;
      const panelHeight = 60;
      newX = Math.max(0, Math.min(window.innerWidth - panelWidth, newX));
      newY = Math.max(0, Math.min(window.innerHeight - panelHeight, newY));
      
      setPanelPos({ x: newX, y: newY });
    };
    
    const handleDragEnd = () => {
      setIsPanelDragging(false);
      document.removeEventListener('mousemove', handleDragMove);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('touchmove', handleDragMove);
      document.removeEventListener('touchend', handleDragEnd);
    };
    
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleDragMove);
    document.addEventListener('touchend', handleDragEnd);
  }, [panelPos]);

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
    if (!sentenceText.trim()) return;
    
    // 获取auth UUID（room_sentences外键需要）
    let uid = userId;
    if (!uid) {
      // 从user_info获取（格式: {id: authUUID, email: "..."}）
      const userInfo = localStorage.getItem('user_info');
      if (userInfo) {
        try { const p = JSON.parse(userInfo); uid = p.id || ''; } catch {}
      }
    }
    if (!uid) {
      uid = localStorage.getItem('user_id') || '';
    }
    if (uid) setUserId(uid);
    
    console.log('[sendSentence] uid:', uid, 'roomId:', roomId);
    
    if (!roomId || !uid) {
      alert('发送失败：用户信息异常 (uid=' + uid + ', roomId=' + roomId + ')，请重新登录');
      return;
    }
    
    const body = JSON.stringify({
      room_id: roomId,
      user_id: uid,
      content: sentenceText.trim().slice(0, 200),
    });
    console.log('[sendSentence] request body:', body);
    
    try {
      const res = await fetch('/sb-api/rest/v1/room_sentences', {
        method: 'POST',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body,
      });
      
      console.log('[sendSentence] response status:', res.status);
      
      if (res.ok) {
        setSentenceText('');
        setShowSentenceInput(false);
        fetchSentences();
      } else {
        const errText = await res.text();
        console.error('[sendSentence] failed:', res.status, errText);
        alert('发送失败 ' + res.status + ': ' + errText.slice(0, 200));
      }
    } catch (err) {
      console.error('[sendSentence] network error:', err);
      alert('发送失败：网络错误 ' + String(err));
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
        
        // 先解析歌词
        let lyrics = '';
        try {
          lyrics = await extractLyricsFromFile(file);
        } catch (err) {
          console.warn('Failed to extract lyrics:', err);
        }
        
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
          lyrics: lyrics || '',
          uploaded_at: new Date().toISOString(),
        });
      }
      
      if (newTracks.length > 0) {
        // 更新音频轨道列表
        const updatedTracks = [...audioTracks, ...newTracks];
        setAudioTracks(updatedTracks);
        await updateAudioTracksInRoom(updatedTracks);
        
        // 自动播放第一首（如果没有正在播放）
        if (!isPlaying && audioTracks.length === 0) {
          setCurrentTrackIndex(0);
          if (!isMuted) {
            setTimeout(() => playTrack(newTracks[0].url), 500);
          }
        }
      }
    } catch (err) {
      console.error('Failed to upload audio:', err);
      alert('上传失败，请重试');
    } finally {
      setUploadingAudio(false);
      setUploadProgress('');
      if (audioUploadRef.current) {
        audioUploadRef.current.value = '';
      }
    }
  };

  // 更新房间的音频轨道列表
  const updateAudioTracksInRoom = async (updatedTracks: AudioTrack[]) => {
    if (!roomId) return;
    
    try {
      await fetch(`/sb-api/rest/v1/rooms?id=eq.${roomId}`, {
        method: 'PATCH',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio_tracks: updatedTracks,
        }),
      });
    } catch (err) {
      console.error('Failed to update audio tracks:', err);
    }
  };

  // 搜索在线LRC歌词 (LRCLIB API)
  const searchLrcLyrics = useCallback(async (trackName: string, trackId?: string) => {
    if (!trackName || isSearchingLyrics) return;
    
    setIsSearchingLyrics(true);
    setLyricsSearchFailed(false);
    
    try {
      // 清理曲名用于搜索
      const searchQuery = trackName
        .replace(/\.(mp3|flac|wav|m4a|ogg)$/i, '') // 移除文件扩展名
        .replace(/_?(full_)?lyrics$/i, '') // 移除 _lyrics / _full_lyrics 后缀
        .replace(/_?(with_)?lyrics$/i, '') // 移除 _with_lyrics 后缀
        .replace(/\[.*?\]/g, '') // 移除方括号内容
        .replace(/\(.*?\)/g, '') // 移除括号内容
        .replace(/_/g, ' ') // 下划线转空格，如 Beautiful_In_White → Beautiful In White
        .trim();
      
      if (!searchQuery) {
        setIsSearchingLyrics(false);
        return;
      }
      
      // 使用LRCLIB API搜索
      const response = await fetch(
        `https://lrclib.net/api/search?q=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            'User-Agent': 'OpenFaith/1.0',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const results = await response.json();
      
      if (Array.isArray(results) && results.length > 0) {
        // 优先选择完全匹配的结果，否则选择第一个
        const bestMatch = results.find((r: any) => 
          r.track_name?.toLowerCase() === searchQuery.toLowerCase()
        ) || results[0];
        
        // 优先使用syncedLyrics，否则使用plainLyrics
        const lrcText = bestMatch.syncedLyrics || bestMatch.plainLyrics;
        
        if (lrcText) {
          // 更新对应track的cachedLrc
          const targetTrackId = trackId || currentTrack?.id;
          if (targetTrackId) {
            setAudioTracks(prev => prev.map(track => 
              track.id === targetTrackId 
                ? { ...track, cachedLrc: lrcText }
                : track
            ));
          }
          setIsSearchingLyrics(false);
          return;
        }
      }
      
      // 没有找到同步歌词
      setLyricsSearchFailed(true);
      setIsSearchingLyrics(false);
    } catch (error) {
      console.warn('Failed to search lyrics:', error);
      setLyricsSearchFailed(true);
      setIsSearchingLyrics(false);
    }
  }, [isSearchingLyrics, currentTrack?.id]);

  // 手动触发歌词搜索
  const handleSearchLyrics = useCallback(() => {
    if (currentTrack) {
      searchLrcLyrics(currentTrack.name, currentTrack.id);
    }
  }, [currentTrack, searchLrcLyrics]);

  // 删除音频轨道
  const deleteAudioTrack = async (trackId: string) => {
    if (!window.confirm('确定要删除这首音乐吗？')) return;
    
    const updatedTracks = audioTracks.filter(t => t.id !== trackId);
    setAudioTracks(updatedTracks);
    
    // 如果删除的是当前播放的曲目
    if (audioTracks[currentTrackIndex]?.id === trackId) {
      if (playerRef.current) {
        playerRef.current.pause();
        playerRef.current = null;
      }
      setIsPlaying(false);
      
      if (updatedTracks.length > 0) {
        setCurrentTrackIndex(0);
      } else {
        setCurrentTrackIndex(0);
      }
    } else if (currentTrackIndex >= updatedTracks.length) {
      // 如果当前索引超出范围，调整到最后一首
      setCurrentTrackIndex(Math.max(0, updatedTracks.length - 1));
    }
    
    await updateAudioTracksInRoom(updatedTracks);
  };
  
  // 移除过期的句子
  const removeSentence = (id: string) => {
    setSentences(prev => prev.filter(s => s.id !== id));
  };

  // 获取当前播放的曲目
  const currentTrack = audioTracks[currentTrackIndex];

  // 解析歌词
  const parsedLyrics = useMemo(() => {
    // 优先使用缓存的在线LRC歌词
    if (currentTrack?.cachedLrc) {
      const isLrc = isLrcFormat(currentTrack.cachedLrc);
      const lines = isLrc ? parseLrc(currentTrack.cachedLrc) : [];
      return { isLrc, lines, rawText: currentTrack.cachedLrc, fromCache: true };
    }
    
    if (!currentTrack?.lyrics) return { isLrc: false, lines: [], rawText: '', fromCache: false };
    
    // 处理原始歌词文本
    let lyricsText = typeof currentTrack.lyrics === 'string' ? currentTrack.lyrics : JSON.stringify(currentTrack.lyrics);
    if (!lyricsText) return { isLrc: false, lines: [], rawText: '', fromCache: false };
    
    // 尝试从Python dict格式中提取text字段
    lyricsText = extractTextFromDictFormat(lyricsText);
    
    const isLrc = isLrcFormat(lyricsText);
    const lines = isLrc ? parseLrc(lyricsText) : [];
    return { isLrc, lines, rawText: lyricsText, fromCache: false };
  }, [currentTrack?.lyrics, currentTrack?.cachedLrc]);

  // 自动搜索歌词：当内嵌歌词不是LRC格式时自动搜索
  useEffect(() => {
    if (!currentTrack) return;
    
    // 只有当有原始歌词文本且不是LRC格式，且尚未缓存LRC歌词，且没有正在搜索且没有搜索失败过
    if (parsedLyrics.rawText && !parsedLyrics.isLrc && !currentTrack.cachedLrc && !isSearchingLyrics && !lyricsSearchFailed) {
      // 延迟搜索，避免过于频繁
      const timer = setTimeout(() => {
        searchLrcLyrics(currentTrack.name, currentTrack.id);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentTrack?.id, parsedLyrics.rawText, parsedLyrics.isLrc, currentTrack?.cachedLrc, isSearchingLyrics, lyricsSearchFailed, searchLrcLyrics]);

  // 当前高亮歌词行
  const activeLyricIndex = useMemo(() => {
    if (!parsedLyrics.isLrc || parsedLyrics.lines.length === 0) return -1;
    for (let i = parsedLyrics.lines.length - 1; i >= 0; i--) {
      if (currentPlayTime >= parsedLyrics.lines[i].time) return i;
    }
    return -1;
  }, [parsedLyrics, currentPlayTime]);

  // 获取播放模式图标
  const getPlayModeIcon = () => {
    switch (playMode) {
      case 'list':
        return <Repeat className="w-4 h-4" />;
      case 'single':
        return <Repeat1 className="w-4 h-4" />;
      case 'shuffle':
        return <Shuffle className="w-4 h-4" />;
    }
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

      {/* 在线用户头像行 - 渐入渐出从左往右循环 */}
      {participants.length > 0 && (
        <div className="absolute z-20 overflow-hidden" style={{ bottom: '180px', left: 0, right: 0, maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}>
          <div className="flex animate-marquee-horizontal">
            {[...participants, ...participants, ...participants].map((p, i) => (
              <div key={i} className="flex flex-col items-center mx-2 shrink-0">
                <div className="w-8 h-8 rounded-full overflow-hidden border-2" style={{ borderColor: '#E11D48' }}>
                  <img 
                    src={p.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.user_id}`} 
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.user_id}`; }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 漂浮句子 */}
      {sentences.map(sentence => (
        <FloatingSentence
          key={sentence.id}
          sentence={sentence}
          onFadeOut={() => removeSentence(sentence.id)}
        />
      ))}

      {/* 歌词显示区域 - 无背景，直接融入界面 */}
      {showLyrics && currentTrack && (
        <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-15 w-80 max-w-[90%] text-center">
          <div className="text-white/90 text-sm font-medium mb-2">{currentTrack?.name || '未知曲目'}</div>
          
          {/* 搜索歌词状态 */}
          {isSearchingLyrics && (
            <div className="text-white/50 text-xs py-2 animate-pulse">
              正在搜索歌词...
            </div>
          )}
          
          {/* 歌词内容 */}
          {!isSearchingLyrics && parsedLyrics.rawText ? (
            parsedLyrics.isLrc && parsedLyrics.lines.length > 0 ? (
              <div className="max-h-52 overflow-y-auto scroll-smooth scrollbar-hide">
                {parsedLyrics.lines.map((line, i) => (
                  <div
                    key={i}
                    ref={i === activeLyricIndex ? (el => { if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }) : undefined}
                    className="leading-relaxed py-0.5 transition-all duration-300"
                    style={{
                      color: i === activeLyricIndex ? 'white' : 'rgba(255,255,255,0.35)',
                      fontWeight: i === activeLyricIndex ? 600 : 400,
                      fontSize: i === activeLyricIndex ? '14px' : '11px',
                    }}
                  >
                    {line.text}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-white/60 text-xs leading-relaxed whitespace-pre-line max-h-32 overflow-y-auto scrollbar-hide">
                  {parsedLyrics.rawText}
                </div>
                {lyricsSearchFailed && (
                  <div className="text-white/40 text-xs">未找到同步歌词</div>
                )}
              </div>
            )
          ) : !isSearchingLyrics ? (
            <div className="text-white/30 text-xs py-2">暂无歌词</div>
          ) : null}
          
          {/* 底部搜索按钮 - 纯白图标 */}
          <div className="mt-2">
            <button 
              onClick={handleSearchLyrics}
              disabled={isSearchingLyrics}
              className="flex items-center justify-center gap-1 mx-auto px-3 py-1 rounded-full text-xs text-white/50 hover:text-white/70 transition-all disabled:opacity-50"
            >
              <Search className="w-3 h-3" />
              <span>{isSearchingLyrics ? '搜索中...' : '搜索歌词'}</span>
            </button>
          </div>
          
          <button 
            onClick={() => setShowLyrics(false)}
            className="absolute top-0 right-0 p-1 rounded-full hover:bg-white/10"
          >
            <X className="w-3 h-3 text-white/40" />
          </button>
        </div>
      )}

      {/* 环境音控制 - 右上角声音按钮 */}
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

      {/* 声音设置面板 - 修复：静音和播放/暂停分离 */}
      {showSoundPanel && (
        <div className="absolute top-28 right-4 z-20 w-72 p-4 rounded-2xl backdrop-blur-md" style={{ backgroundColor: 'rgba(30, 30, 50, 0.95)' }}>
          {/* 静音控制 - 只控制音量，不影响播放状态 */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/80 text-sm">音频播放</span>
            <button
              onClick={toggleMute}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all"
              style={{
                backgroundColor: isMuted ? 'rgba(255, 255, 255, 0.1)' : 'rgba(225, 29, 72, 0.3)',
              }}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-white/60" />
              ) : (
                <Volume2 className="w-4 h-4 text-white" />
              )}
              <span className="text-xs text-white/70">
                {isMuted ? '已静音' : '已开启'}
              </span>
            </button>
          </div>
          
          {/* 播放/暂停控制 - 独立于静音状态 */}
          <div className="flex items-center justify-between mb-4 border-t border-white/10 pt-3">
            <span className="text-white/80 text-sm">播放控制</span>
            <button
              onClick={handlePlayPause}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all"
              style={{
                backgroundColor: isPlaying ? 'rgba(225, 29, 72, 0.3)' : 'rgba(255, 255, 255, 0.1)',
              }}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 text-white" />
              ) : (
                <Play className="w-4 h-4 text-white" />
              )}
              <span className="text-xs text-white/70">
                {isPlaying ? '暂停' : '播放'}
              </span>
            </button>
          </div>
          
          {/* 播放模式控制 */}
          <div className="flex items-center justify-between mb-4 border-t border-white/10 pt-3">
            <span className="text-white/80 text-sm">播放模式</span>
            <button
              onClick={cyclePlayMode}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              }}
            >
              {getPlayModeIcon()}
              <span className="text-xs text-white/70">
                {playMode === 'list' ? '列表循环' : playMode === 'single' ? '单曲循环' : '随机播放'}
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
          
          {/* 关闭按钮 */}
          <button
            onClick={() => setShowSoundPanel(false)}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-white/40" />
          </button>
        </div>
      )}

      {/* 可拖动音乐控制面板 - 默认水平居中，可拖动 */}
      {audioTracks.length > 0 && room?.creator_id === userId && (
        <div
          className="fixed z-30 flex items-center gap-1 px-3 py-2 rounded-full backdrop-blur-md"
          style={{
            backgroundColor: 'rgba(30, 30, 50, 0.9)',
            left: isPanelDragging ? panelPos.x : '50%',
            top: panelPos.y,
            transform: isPanelDragging ? 'none' : 'translateX(-50%)',
            cursor: isPanelDragging ? 'grabbing' : 'grab',
          }}
        >
          <div
            className="p-1 cursor-grab active:cursor-grabbing"
            onMouseDown={handlePanelDragStart}
            onTouchStart={handlePanelDragStart}
            title="拖动面板"
          >
            <GripVertical className="w-4 h-4 text-white/50" />
          </div>
          <div className="w-px h-5 bg-white/20" />
          <button onClick={playPrevious} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
            <SkipBack className="w-4 h-4 text-white/70" />
          </button>
          <button onClick={handlePlayPause} className="p-2 rounded-full" style={{ backgroundColor: '#E11D48' }}>
            {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" />}
          </button>
          <button onClick={playNext} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
            <SkipForward className="w-4 h-4 text-white/70" />
          </button>
          <div className="w-px h-5 bg-white/20" />
          <button onClick={cyclePlayMode} className="flex items-center gap-1 px-2 py-1 rounded-full hover:bg-white/10 transition-colors"
            title={playMode === 'list' ? '列表循环' : playMode === 'single' ? '单曲循环' : '随机播放'}>
            {getPlayModeIcon()}
            <span className="text-xs text-white/70">{playMode === 'list' ? '列表' : playMode === 'single' ? '单曲' : '随机'}</span>
          </button>
          <div className="w-px h-5 bg-white/20" />
          <button onClick={() => setShowLyrics(!showLyrics)} className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
            title={showLyrics ? '隐藏歌词' : '显示歌词'}
            style={{ color: showLyrics ? 'var(--theme-primary)' : 'rgba(255,255,255,0.7)' }}>
            <Type className="w-4 h-4" />
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
        @keyframes lyricsMarquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
        @keyframes marquee-horizontal {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee-horizontal {
          animation: marquee-horizontal 20s linear infinite;
        }
      `}</style>

      {/* 底部操作栏 - 轻语输入 */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4 pb-8">
        <div className="max-w-md mx-auto">
          {/* 独立的轻语输入面板 */}
          <div className="w-full">
            {showSentenceInput ? (
              <div className="flex flex-col gap-1">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={sentenceText}
                    onChange={e => setSentenceText(e.target.value.slice(0, 200))}
                    placeholder="轻轻留下一句话..."
                    maxLength={200}
                    className="flex-1 h-11 px-4 rounded-full text-sm backdrop-blur-sm"
                    style={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      color: 'white',
                      border: sentenceText.length >= 200 ? '2px solid #ef4444' : '2px solid transparent',
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
                      backgroundColor: sentenceText.length >= 200 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                      color: sentenceText.length >= 200 ? '#fca5a5' : 'rgba(255, 255, 255, 0.5)',
                    }}
                  >
                    {sentenceText.length}/200
                  </span>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowSentenceInput(true)}
                className="w-full h-11 rounded-full text-sm font-medium text-white/80 backdrop-blur-sm transition-all hover:bg-white/10 flex items-center justify-center gap-2"
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
