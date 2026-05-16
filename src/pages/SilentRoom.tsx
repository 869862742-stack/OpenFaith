import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Volume2, VolumeX, Moon, CloudRain, Waves, TreePine, Wind, Piano, Music, BookOpen, Brain, Flower2, HeartHandshake, Sparkles, Upload, X, Power } from 'lucide-react';

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

// 环境音配置
const AMBIENT_SOUNDS: Record<string, { label: string; Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; url?: string }> = {
  silence: { label: '静音', Icon: VolumeX },
  rain: { label: '雨声', Icon: CloudRain, url: '' },
  ocean: { label: '海浪', Icon: Waves, url: '' },
  forest: { label: '森林', Icon: TreePine, url: '' },
  wind: { label: '风声', Icon: Wind, url: '' },
  piano: { label: '钢琴', Icon: Piano, url: '' },
  custom: { label: '自定义', Icon: Music },
};

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
}

// 星空 Canvas 组件

// 房间环境音合成 - 重新设计，更安静、柔和、舒适
function createRoomAmbientSound(type: string): { start: () => void; stop: () => void } {
  let ctx: AudioContext | null = null;
  let nodes: AudioNode[] = [];
  let oscillators: OscillatorNode[] = [];
  let stopped = false;

  const stop = () => {
    stopped = true;
    oscillators.forEach(o => { try { o.stop(); } catch {} });
    nodes.forEach(n => { try { (n as any).disconnect(); } catch {} });
    oscillators = [];
    nodes = [];
    if (ctx) { try { ctx.close(); } catch {} ctx = null; }
  };

  // 生成棕噪声（更柔和温暖）
  const createBrownNoise = (ctx: AudioContext, bufferSize: number): AudioBufferSourceNode => {
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 1.5;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    return source;
  };

  // 生成粉红噪声（比白噪声更柔和）
  const createPinkNoise = (ctx: AudioContext, bufferSize: number): AudioBufferSourceNode => {
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    return source;
  };

  const start = () => {
    if (stopped) return;
    ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.gain.value = 0.0;
    gain.connect(ctx.destination);
    nodes.push(gain);

    switch (type) {
      case 'rain': {
        // 棕噪声 + 低通滤波 → 远处温柔的淅沥雨声
        const bufferSize = ctx.sampleRate * 10;
        const source = createBrownNoise(ctx, bufferSize);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 300; // 切掉高频，变成远处温柔的雨声
        filter.Q.value = 0.3;
        
        // 极慢的音量起伏，模拟远处的阵雨
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.02;
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.05; // 极慢 LFO
        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);
        
        source.connect(filter);
        filter.connect(gain);
        source.start();
        lfo.start();
        gain.gain.setValueAtTime(0.06, ctx.currentTime); // 极低音量
        oscillators.push(lfo);
        nodes.push(source, filter, lfo, lfoGain);
        break;
      }
      case 'ocean': {
        // 棕噪声 + 低通滤波 → 远处温柔的潮汐
        const bufferSize = ctx.sampleRate * 10;
        const source = createBrownNoise(ctx, bufferSize);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 350;
        filter.Q.value = 0.3;
        
        // 极慢的音量起伏，模拟远处温柔的潮汐
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.02;
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.04; // 更慢的LFO
        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);
        
        source.connect(filter);
        filter.connect(gain);
        source.start();
        lfo.start();
        gain.gain.setValueAtTime(0.05, ctx.currentTime); // 极低音量
        oscillators.push(lfo);
        nodes.push(source, filter, lfo, lfoGain);
        break;
      }
      case 'forest': {
        // 极轻的棕噪声底噪模拟树叶沙沙
        const bufferSize = ctx.sampleRate * 10;
        const source = createBrownNoise(ctx, bufferSize);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 600;
        filter.Q.value = 0.5;
        const subGain = ctx.createGain();
        subGain.gain.value = 0.03; // 极低音量
        source.connect(filter);
        filter.connect(subGain);
        subGain.connect(gain);
        source.start();
        
        // 偶尔播放一个极柔和的单音（像远处的风铃）
        const playChime = () => {
          if (stopped || !ctx) return;
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          const freq = 600 + Math.random() * 300; // 600-900Hz，柔和的音高
          osc.frequency.value = freq;
          const chimeGain = ctx.createGain();
          chimeGain.gain.setValueAtTime(0, ctx.currentTime);
          chimeGain.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 0.5); // 极低音量
          chimeGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2); // 8秒缓慢衰减
          osc.connect(chimeGain);
          chimeGain.connect(gain);
          osc.start();
          osc.stop(ctx.currentTime + 2);
          // 8-15秒后再次播放
          setTimeout(playChime, 8000 + Math.random() * 7000);
        };
        setTimeout(playChime, 2000);
        gain.gain.setValueAtTime(0.03, ctx.currentTime);
        nodes.push(source, filter, subGain);
        break;
      }
      case 'wind': {
        // 粉红噪声 + 极低低通滤波
        const bufferSize = ctx.sampleRate * 10;
        const source = createPinkNoise(ctx, bufferSize);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 200; // 极低截止频率
        filter.Q.value = 0.3;
        
        // 极慢的呼吸感
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.02;
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.03; // 极慢LFO
        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);
        
        source.connect(filter);
        filter.connect(gain);
        source.start();
        lfo.start();
        gain.gain.setValueAtTime(0.05, ctx.currentTime); // 极低音量
        oscillators.push(lfo);
        nodes.push(source, filter, lfo, lfoGain);
        break;
      }
      case 'piano': {
        // 更安静的钢琴设计：低八度和弦 + 三角波 + 极慢衰减
        const playChord = () => {
          if (stopped || !ctx) return;
          // 使用小调和弦营造安静冥想感（降低八度）
          const chords = [
            [130.81, 164.81, 196.00],  // C3/E3/G3 - Am chord 低八度
            [146.83, 174.61, 220.00],  // D3/F3/A3 - Dm chord
            [164.81, 196.00, 246.94],  // E3/G3/B3 - Em chord
            [174.61, 220.00, 261.63],  // F3/A3/C4 - Fm chord (用F大调感觉)
          ];
          const chordIdx = Math.floor(Math.random() * chords.length);
          const freqs = chords[chordIdx];
          freqs.forEach(freq => {
            const osc = ctx!.createOscillator();
            osc.type = 'triangle'; // 三角波更温暖
            osc.frequency.value = freq;
            const oscGain = ctx!.createGain();
            oscGain.gain.setValueAtTime(0, ctx!.currentTime);
            oscGain.gain.linearRampToValueAtTime(0.03, ctx!.currentTime + 0.5); // 慢起
            oscGain.gain.exponentialRampToValueAtTime(0.001, ctx!.currentTime + 8); // 8秒衰减
            osc.connect(oscGain);
            oscGain.connect(gain);
            osc.start();
            osc.stop(ctx!.currentTime + 8.5);
            oscillators.push(osc);
            nodes.push(oscGain);
          });
          // 和弦间隔拉长到8-12秒
          setTimeout(playChord, 8000 + Math.random() * 4000);
        };
        playChord();
        gain.gain.setValueAtTime(0.03, ctx.currentTime); // 极低音量
        break;
      }
    }
  };

  return { start, stop };
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
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [showSoundPanel, setShowSoundPanel] = useState(false);
  const [showDisbandConfirm, setShowDisbandConfirm] = useState(false);
  const [isDisbanding, setIsDisbanding] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const audioUploadRef = useRef<HTMLInputElement>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ambientNodesRef = useRef<{ start: () => void; stop: () => void } | null>(null);

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
      setRoom(data[0]);
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

  // 播放环境音 - 使用 Web Audio API 合成 + 循环播放
  const playAmbientSound = useCallback((soundType: string, customUrl?: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    // 停止之前的合成音
    if (ambientNodesRef.current) {
      try { ambientNodesRef.current.stop(); } catch {}
      ambientNodesRef.current = null;
    }

    if (soundType === 'silence' || isMuted) return;

    // 自定义音频：使用 HTML Audio 元素播放
    if (soundType === 'custom' && customUrl) {
      const audio = new Audio(customUrl);
      audio.loop = true; // 单曲循环
      audio.volume = 0.3;
      audio.play().catch(() => {});
      audioRef.current = audio;
      setCurrentAudio(audio);
      return;
    }

    // 内置音效：使用 Web Audio API 合成（无限循环直到离开房间）
    const preview = createRoomAmbientSound(soundType);
    ambientNodesRef.current = preview;
    preview.start();
  }, [isMuted]);

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

    // 每60秒心跳
    const heartbeatInterval = setInterval(sendHeartbeat, 60000);

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
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (ambientNodesRef.current) {
        ambientNodesRef.current.stop();
      }
    };
  }, [roomId, userId]);

  // 播放环境音
  useEffect(() => {
    if (room) {
      try {
        playAmbientSound(room.ambient_sound, room.custom_audio_url);
      } catch (err) {
        console.error('Failed to play ambient sound:', err);
      }
    }
  }, [room, playAmbientSound]);

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

  // 切换房间环境音（房主专属）
  const changeRoomSound = async (soundType: string, customUrl?: string) => {
    if (!roomId || room?.creator_id !== userId) return;
    
    try {
      await fetch(`/sb-api/rest/v1/rooms?id=eq.${roomId}`, {
        method: 'PATCH',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ambient_sound: soundType,
          custom_audio_url: customUrl || null,
        }),
      });
      
      setRoom(prev => prev ? { ...prev, ambient_sound: soundType, custom_audio_url: customUrl || null } : null);
      setShowSoundPanel(false);
    } catch (err) {
      console.error('Failed to change room sound:', err);
    }
  };

  // 上传自定义音频
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !roomId || room?.creator_id !== userId) return;
    
    if (file.size > 10 * 1024 * 1024) {
      alert('音频文件不能超过10MB');
      return;
    }
    
    setUploadingAudio(true);
    try {
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
        throw new Error('音频上传失败');
      }

      const customAudioUrl = `${SUPABASE_URL}/storage/v1/object/public/room-audio/${roomId}/${fileName}`;
      await changeRoomSound('custom', customAudioUrl);
    } catch (err) {
      console.error('Failed to upload audio:', err);
      alert('音频上传失败');
    } finally {
      setUploadingAudio(false);
    }
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
          <h1 className="text-white font-medium">{room?.name || '静默房间'}</h1>
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
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/80 text-sm">声音</span>
            <button
              onClick={() => setIsMuted(!isMuted)}
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
              <span className="text-xs text-white/70">{isMuted ? '静音' : '开启'}</span>
            </button>
          </div>
          
          {/* 房主专属功能 */}
          {room?.creator_id === userId && (
            <>
              <div className="border-t border-white/10 pt-3 mb-3">
                <div className="text-white/50 text-xs mb-2 font-medium">选择环境音</div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'silence', label: '静音', Icon: VolumeX },
                    { value: 'rain', label: '雨声', Icon: CloudRain },
                    { value: 'ocean', label: '海浪', Icon: Waves },
                    { value: 'forest', label: '森林', Icon: TreePine },
                    { value: 'wind', label: '风声', Icon: Wind },
                    { value: 'piano', label: '钢琴', Icon: Piano },
                  ].map(sound => (
                    <button
                      key={sound.value}
                      onClick={() => changeRoomSound(sound.value)}
                      className="flex flex-col items-center gap-1 p-2 rounded-xl transition-all"
                      style={{
                        backgroundColor: room.ambient_sound === sound.value ? 'rgba(225, 29, 72, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                        border: room.ambient_sound === sound.value ? '1px solid #E11D48' : '1px solid transparent',
                      }}
                    >
                      <sound.Icon className="w-5 h-5 text-white" />
                      <span className="text-xs text-white/70">{sound.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="border-t border-white/10 pt-3 mb-3">
                <input
                  type="file"
                  ref={audioUploadRef}
                  accept="audio/*"
                  onChange={handleAudioUpload}
                  className="hidden"
                />
                <button
                  onClick={() => audioUploadRef.current?.click()}
                  disabled={uploadingAudio}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm transition-all"
                  style={{
                    backgroundColor: room.ambient_sound === 'custom' ? 'rgba(225, 29, 72, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                    border: room.ambient_sound === 'custom' ? '1px solid #E11D48' : '1px solid transparent',
                    opacity: uploadingAudio ? 0.6 : 1,
                  }}
                >
                  <Upload className="w-4 h-4 text-white" />
                  <span className="text-white/70">{uploadingAudio ? '上传中...' : '上传自定义音频'}</span>
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

      {/* 底部操作栏 */}
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

          {/* 说一句话按钮 */}
          <div className="flex gap-3">
            {showSentenceInput ? (
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={sentenceText}
                    onChange={e => setSentenceText(e.target.value.slice(0, 30))}
                    placeholder="轻轻留下一句话..."
                    maxLength={30}
                    className="flex-1 h-12 px-4 rounded-full text-sm backdrop-blur-sm"
                    style={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      color: 'white',
                      border: sentenceText.length >= 30 ? '2px solid #ef4444' : '2px solid transparent',
                    }}
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && sendSentence()}
                  />
                  <button
                    onClick={sendSentence}
                    disabled={!sentenceText.trim()}
                    className="h-12 px-6 rounded-full text-sm font-medium text-white disabled:opacity-50"
                    style={{ backgroundColor: '#E11D48' }}
                  >
                    发送
                  </button>
                  <button
                    onClick={() => { setShowSentenceInput(false); setSentenceText(''); }}
                    className="h-12 px-4 rounded-full backdrop-blur-sm"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                  >
                    <span className="text-white/60">×</span>
                  </button>
                </div>
                <div className="flex justify-end">
                  <span 
                    className="text-xs px-2 py-0.5 rounded-full backdrop-blur-sm"
                    style={{ 
                      backgroundColor: sentenceText.length >= 30 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                      color: sentenceText.length >= 30 ? '#fca5a5' : 'rgba(255, 255, 255, 0.5)',
                    }}
                  >
                    {sentenceText.length}/30
                  </span>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowSentenceInput(true)}
                className="flex-1 h-12 rounded-full text-sm font-medium text-white/80 backdrop-blur-sm transition-all hover:bg-white/10"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
              >
                <Sparkles className="w-4 h-4 inline" style={{ color: 'var(--theme-primary)' }} /> 说一句话
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
