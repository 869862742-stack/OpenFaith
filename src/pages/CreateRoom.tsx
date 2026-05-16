import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, Upload, Music, Moon, VolumeX, CloudRain, Waves, TreePine, Wind, Piano, Play, Square } from 'lucide-react';

// Service Role Key
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';
const SUPABASE_URL = 'https://rdhwmeittgdosmkxtpak.supabase.co';

// 宗教标签列表
const RELIGION_TAGS = [
  '基督教', '天主教', '伊斯兰教', '犹太教', '佛教', '印度教', '道教', '锡克教',
  '巴哈伊教', '摩门教', '耶和华见证人', '琐罗亚斯德教', '诺斯替',
  '卡巴拉', '神道教', '耆那教', '德鲁兹教', '约鲁巴教', '伏都教',
  '雅兹迪', '曼达安', '玛雅/阿兹特克', '毛利宗教', '天理教', '天道教', '高台教'
];

// 环境音选项
const AMBIENT_SOUNDS = [
  { value: 'silence', label: '静音', Icon: VolumeX },
  { value: 'rain', label: '雨声', Icon: CloudRain },
  { value: 'ocean', label: '海浪', Icon: Waves },
  { value: 'forest', label: '森林', Icon: TreePine },
  { value: 'wind', label: '风声', Icon: Wind },
  { value: 'piano', label: '钢琴', Icon: Piano },
];

// 环境音预听 - 使用 Web Audio API 合成
function createAmbientPreview(type: string): { start: () => void; stop: () => void } {
  const ctx = new AudioContext();
  let nodes: AudioNode[] = [];
  let oscillators: OscillatorNode[] = [];
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const stop = () => {
    if (timeout) { clearTimeout(timeout); timeout = null; }
    oscillators.forEach(o => { try { o.stop(); } catch {} });
    nodes.forEach(n => { try { (n as any).disconnect(); } catch {} });
    oscillators = [];
    nodes = [];
    try { ctx.close(); } catch {}
  };

  const start = () => {
    stop(); // 清理之前的
    const newCtx = new AudioContext();
    (ctx as any) = newCtx;
    const gain = newCtx.createGain();
    gain.gain.value = 0.3;
    gain.connect(newCtx.destination);
    nodes.push(gain);

    switch (type) {
      case 'rain': {
        // 白噪声 + 带通滤波 → 雨声
        const bufferSize = newCtx.sampleRate * 5;
        const buffer = newCtx.createBuffer(1, bufferSize, newCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const source = newCtx.createBufferSource();
        source.buffer = buffer;
        const filter = newCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 3000;
        filter.Q.value = 0.5;
        source.connect(filter);
        filter.connect(gain);
        source.start();
        // 淡入淡出
        gain.gain.setValueAtTime(0, newCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, newCtx.currentTime + 0.3);
        gain.gain.linearRampToValueAtTime(0, newCtx.currentTime + 4.7);
        nodes.push(source, filter);
        break;
      }
      case 'ocean': {
        // 低频噪声 + LFO 调制 → 海浪
        const bufferSize = newCtx.sampleRate * 5;
        const buffer = newCtx.createBuffer(1, bufferSize, newCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const source = newCtx.createBufferSource();
        source.buffer = buffer;
        const filter = newCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 800;
        const lfoGain = newCtx.createGain();
        lfoGain.gain.value = 0.15;
        const lfo = newCtx.createOscillator();
        lfo.frequency.value = 0.15; // 缓慢起伏
        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);
        source.connect(filter);
        filter.connect(gain);
        lfo.start();
        source.start();
        gain.gain.setValueAtTime(0.15, newCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.35, newCtx.currentTime + 0.5);
        gain.gain.linearRampToValueAtTime(0.15, newCtx.currentTime + 4.5);
        oscillators.push(lfo);
        nodes.push(source, filter, lfoGain);
        break;
      }
      case 'forest': {
        // 中高频噪声（树叶）+ 鸟鸣感的高频脉冲
        const bufferSize = newCtx.sampleRate * 5;
        const buffer = newCtx.createBuffer(1, bufferSize, newCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const source = newCtx.createBufferSource();
        source.buffer = buffer;
        const filter = newCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2000;
        filter.Q.value = 1;
        const subGain = newCtx.createGain();
        subGain.gain.value = 0.15;
        source.connect(filter);
        filter.connect(subGain);
        subGain.connect(gain);
        source.start();
        // 鸟鸣：几个短促高频音
        const birdTimes = [0.8, 1.6, 2.3, 3.1, 3.9];
        birdTimes.forEach(t => {
          const osc = newCtx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(2200 + Math.random() * 800, newCtx.currentTime + t);
          osc.frequency.linearRampToValueAtTime(1800 + Math.random() * 600, newCtx.currentTime + t + 0.08);
          const birdGain = newCtx.createGain();
          birdGain.gain.setValueAtTime(0, newCtx.currentTime + t);
          birdGain.gain.linearRampToValueAtTime(0.12, newCtx.currentTime + t + 0.02);
          birdGain.gain.linearRampToValueAtTime(0, newCtx.currentTime + t + 0.1);
          osc.connect(birdGain);
          birdGain.connect(gain);
          osc.start(newCtx.currentTime + t);
          osc.stop(newCtx.currentTime + t + 0.12);
          oscillators.push(osc);
          nodes.push(birdGain);
        });
        gain.gain.setValueAtTime(0.2, newCtx.currentTime);
        nodes.push(source, filter, subGain);
        break;
      }
      case 'wind': {
        // 棕色噪声 + 低频调制 → 风声
        const bufferSize = newCtx.sampleRate * 5;
        const buffer = newCtx.createBuffer(1, bufferSize, newCtx.sampleRate);
        const data = buffer.getChannelData(0);
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = data[i];
          data[i] *= 3.5;
        }
        const source = newCtx.createBufferSource();
        source.buffer = buffer;
        const filter = newCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 500;
        const lfoGain = newCtx.createGain();
        lfoGain.gain.value = 0.1;
        const lfo = newCtx.createOscillator();
        lfo.frequency.value = 0.2;
        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);
        source.connect(filter);
        filter.connect(gain);
        lfo.start();
        source.start();
        gain.gain.setValueAtTime(0.2, newCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.4, newCtx.currentTime + 1);
        gain.gain.linearRampToValueAtTime(0.2, newCtx.currentTime + 4);
        oscillators.push(lfo);
        nodes.push(source, filter, lfoGain);
        break;
      }
      case 'piano': {
        // 简单和弦 C-E-G
        const freqs = [261.63, 329.63, 392.00];
        freqs.forEach(freq => {
          const osc = newCtx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = freq;
          const oscGain = newCtx.createGain();
          oscGain.gain.setValueAtTime(0, newCtx.currentTime);
          oscGain.gain.linearRampToValueAtTime(0.12, newCtx.currentTime + 0.05);
          oscGain.gain.exponentialRampToValueAtTime(0.01, newCtx.currentTime + 4.5);
          osc.connect(oscGain);
          oscGain.connect(gain);
          osc.start();
          oscillators.push(osc);
          nodes.push(oscGain);
        });
        // 二组和弦 A3-C4-E4 延迟进入
        setTimeout(() => {
          if (oscillators.length === 0) return;
          const freqs2 = [220.00, 261.63, 329.63];
          freqs2.forEach(freq => {
            const osc = newCtx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;
            const oscGain = newCtx.createGain();
            oscGain.gain.setValueAtTime(0, newCtx.currentTime);
            oscGain.gain.linearRampToValueAtTime(0.08, newCtx.currentTime + 0.05);
            oscGain.gain.exponentialRampToValueAtTime(0.01, newCtx.currentTime + 3);
            osc.connect(oscGain);
            oscGain.connect(gain);
            osc.start();
            oscillators.push(osc);
            nodes.push(oscGain);
          });
        }, 2500);
        gain.gain.setValueAtTime(0.5, newCtx.currentTime);
        break;
      }
    }
    // 5秒后自动停止
    timeout = setTimeout(stop, 5200);
  };

  return { start, stop };
}

interface CreateRoomProps {
  onClose: () => void;
}

function CreateRoom({ onClose }: CreateRoomProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ambientSound, setAmbientSound] = useState('silence');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [customAudio, setCustomAudio] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [previewingSound, setPreviewingSound] = useState<string | null>(null);
  const previewRef = useRef<{ start: () => void; stop: () => void } | null>(null);
  const customAudioRef = useRef<HTMLAudioElement | null>(null);
  const customPreviewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 切换标签选择
  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // 停止所有预听
  const stopPreview = useCallback(() => {
    if (previewRef.current) {
      previewRef.current.stop();
      previewRef.current = null;
    }
    if (customAudioRef.current) {
      customAudioRef.current.pause();
      customAudioRef.current.currentTime = 0;
      customAudioRef.current = null;
    }
    if (customPreviewTimer.current) {
      clearTimeout(customPreviewTimer.current);
      customPreviewTimer.current = null;
    }
    setPreviewingSound(null);
  }, []);

  // 预听环境音
  const togglePreview = useCallback((soundType: string) => {
    stopPreview();
    if (previewingSound === soundType) {
      // 正在播放同一个，停止
      return;
    }
    if (soundType === 'silence') return; // 静音没有声音
    if (soundType === 'custom') {
      if (!customAudio) return;
      const url = URL.createObjectURL(customAudio);
      const audio = new Audio(url);
      customAudioRef.current = audio;
      audio.currentTime = 0;
      audio.volume = 0.5;
      audio.play().catch(() => {});
      setPreviewingSound('custom');
      customPreviewTimer.current = setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
        URL.revokeObjectURL(url);
        customAudioRef.current = null;
        setPreviewingSound(null);
      }, 5000);
      return;
    }
    const preview = createAmbientPreview(soundType);
    previewRef.current = preview;
    preview.start();
    setPreviewingSound(soundType);
  }, [previewingSound, customAudio, stopPreview]);

  // 添加自定义标签
  const addCustomTag = () => {
    if (customTag && !selectedTags.includes(customTag) && !RELIGION_TAGS.includes(customTag)) {
      setSelectedTags(prev => [...prev, customTag]);
      setCustomTag('');
    }
  };

  // 处理音频文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('音频文件不能超过10MB');
        return;
      }
      if (!file.type.startsWith('audio/')) {
        setError('请上传音频文件');
        return;
      }
      setCustomAudio(file);
      setAmbientSound('custom');
      setError('');
    }
  };

  // 创建房间
  const handleCreate = async () => {
    if (!name.trim()) {
      setError('请输入房间名称');
      return;
    }

    setUploading(true);
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

      let customAudioUrl = '';
      
      // 如果有自定义音频，上传到 Supabase Storage
      if (customAudio) {
        try {
          // Supabase Storage 需要文件内容作为 body，不是 FormData
          const arrayBuffer = await customAudio.arrayBuffer();
          const fileName = `${Date.now()}_${customAudio.name}`;
          
          const uploadRes = await fetch(
            `/sb-storage/v1/object/room-audio/${userId}/${fileName}`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                'Content-Type': customAudio.type || 'audio/mpeg',
                'x-upsert': 'true',
              },
              body: arrayBuffer,
            }
          );

          if (uploadRes.ok) {
            customAudioUrl = `${SUPABASE_URL}/storage/v1/object/public/room-audio/${userId}/${fileName}`;
          } else {
            const errData = await uploadRes.json().catch(() => ({}));
            console.error('Audio upload failed:', errData);
            // 上传失败不阻止创建房间
          }
        } catch (err) {
          console.error('Audio upload error:', err);
          // 上传失败不阻止创建房间
        }
      }

      // 生成唯一5位房间ID (10000-99999)
      const generateRoomCode = async () => {
        const generateCode = () => Math.floor(10000 + Math.random() * 90000);
        let code = generateCode();
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
          // 检查代码是否已存在
          try {
            const checkRes = await fetch(
              `/sb-api/rest/v1/rooms?room_code=eq.${code}&select=room_code`,
              {
                headers: {
                  'apikey': SERVICE_ROLE_KEY,
                  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
                },
              }
            );
            const existing = await checkRes.json();
            if (!Array.isArray(existing) || existing.length === 0) {
              return code;
            }
          } catch {
            // room_code列可能不存在，直接返回生成的code
            return code;
          }
          code = generateCode();
          attempts++;
        }
        // 如果都重复，使用时间戳后5位
        return parseInt(Date.now().toString().slice(-5));
      };

      const roomCode = await generateRoomCode();

      // 创建房间（room_code列可能尚未添加，先尝试带room_code，失败则不带）
      const roomData = {
        name: name.trim(),
        description: description.trim(),
        creator_id: userId,
        ambient_sound: ambientSound,
        custom_audio_url: customAudioUrl || null,
        tags: selectedTags,
        user_count: 1,
        last_activity_at: new Date().toISOString(),
        room_code: roomCode,
      };

      let res = await fetch('/sb-api/rest/v1/rooms', {
        method: 'POST',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(roomData),
      });

      // 如果 room_code 列不存在导致失败，去掉 room_code 重试
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (errData.message?.includes('room_code') || errData.message?.includes('column')) {
          const { room_code: _rc, ...dataWithoutCode } = roomData;
          res = await fetch('/sb-api/rest/v1/rooms', {
            method: 'POST',
            headers: {
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation',
            },
            body: JSON.stringify(dataWithoutCode),
          });
        } else {
          throw new Error(errData.message || '创建房间失败');
        }
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || '创建房间失败');
      }

      const rooms = await res.json();
      const newRoom = rooms[0];

      // 创建参与者记录（房主自动加入）- 忽略重复键错误
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
          }),
        });
      } catch {
        // 如果已存在则忽略
      }

      onClose();
      // 跳转到房间页面
      window.location.hash = `/room/${newRoom.id}`;
    } catch (err: any) {
      setError(err.message || '创建房间失败');
    } finally {
      setUploading(false);
    }
  };

  // 组件卸载时停止预听
  React.useEffect(() => {
    return () => { stopPreview(); };
  }, [stopPreview]);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-6"
        style={{ backgroundColor: 'var(--card-bg)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 标题 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-color)' }}>
            <Moon className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
            创建静默房间
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* 房间名称 */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>
            房间名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="给房间起个温暖的名字..."
            maxLength={30}
            className="w-full h-12 px-4 rounded-xl border text-sm"
            style={{ 
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-color)'
            }}
          />
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            {name.length}/30
          </p>
        </div>

        {/* 房间描述 */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>
            房间描述
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="这个房间想传达什么..."
            maxLength={100}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border text-sm resize-none"
            style={{ 
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-color)'
            }}
          />
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            {description.length}/100
          </p>
        </div>

        {/* 环境音选择 */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>
            <Music className="inline w-4 h-4 mr-1" />
            环境音
          </label>
          <div className="grid grid-cols-3 gap-2">
            {AMBIENT_SOUNDS.map(sound => (
              <button
                key={sound.value}
                onClick={() => {
                  setAmbientSound(sound.value);
                  if (sound.value !== 'custom') {
                    setCustomAudio(null);
                  }
                }}
                className="p-3 rounded-xl border-2 text-sm flex flex-col items-center gap-1 transition-all relative"
                style={{
                  backgroundColor: ambientSound === sound.value ? 'var(--theme-primary)15' : 'var(--bg-secondary)',
                  borderColor: ambientSound === sound.value ? 'var(--theme-primary)' : 'var(--border-color)',
                  color: ambientSound === sound.value ? 'var(--theme-primary)' : 'var(--text-color)',
                }}
              >
                <div className="flex items-center gap-1">
                  <sound.Icon className="w-6 h-6" style={{ color: ambientSound === sound.value ? 'var(--theme-primary)' : 'var(--text-color)' }} />
                  {sound.value !== 'silence' && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); togglePreview(sound.value); }}
                      className="w-5 h-5 rounded-full flex items-center justify-center transition-all"
                      style={{
                        backgroundColor: previewingSound === sound.value ? 'var(--theme-primary)' : 'var(--bg-secondary)',
                        color: previewingSound === sound.value ? 'white' : 'var(--text-secondary)',
                      }}
                    >
                      {previewingSound === sound.value ? <Square className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
                    </button>
                  )}
                </div>
                <span>{sound.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 自定义音频上传 */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>
            <Upload className="inline w-4 h-4 mr-1" />
            自定义音频（可选）
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full p-4 rounded-xl border-2 border-dashed flex flex-col items-center gap-2 transition-all"
            style={{
              borderColor: customAudio ? 'var(--theme-primary)' : 'var(--border-color)',
              backgroundColor: customAudio ? 'var(--theme-primary)10' : 'var(--bg-secondary)',
            }}
          >
            {customAudio ? (
              <div className="flex items-center gap-2 w-full">
                <Music className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--theme-primary)' }} />
                <span className="text-sm flex-1 truncate" style={{ color: 'var(--text-color)' }}>{customAudio.name}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); togglePreview('custom'); }}
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    backgroundColor: previewingSound === 'custom' ? 'var(--theme-primary)' : 'var(--bg-secondary)',
                    color: previewingSound === 'custom' ? 'white' : 'var(--theme-primary)',
                    border: '1px solid var(--theme-primary)',
                  }}
                >
                  {previewingSound === 'custom' ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                </button>
                <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>换</span>
              </div>
            ) : (
              <>
                <span className="text-2xl opacity-50">+</span>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>上传音频文件（mp3/wav/m4a）</span>
              </>
            )}
          </button>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            最大 10MB，仅支持 mp3/wav/m4a 格式
          </p>
        </div>

        {/* 宗教标签 */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>
            宗教标签（可多选）
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedTags.map(tag => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full text-xs flex items-center gap-1"
                style={{ backgroundColor: 'var(--theme-primary)15', color: 'var(--theme-primary)' }}
              >
                {tag}
                <button onClick={() => toggleTag(tag)} className="hover:opacity-70">×</button>
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {RELIGION_TAGS.filter(tag => !selectedTags.includes(tag)).map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className="px-3 py-1 rounded-full text-xs border transition-all"
                style={{
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-secondary)',
                }}
              >
                + {tag}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={customTag}
              onChange={e => setCustomTag(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCustomTag()}
              placeholder="添加自定义标签..."
              className="flex-1 h-10 px-3 rounded-xl border text-sm"
              style={{ 
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-color)'
              }}
            />
            <button
              onClick={addCustomTag}
              className="px-4 h-10 rounded-xl text-sm text-white"
              style={{ backgroundColor: 'var(--theme-primary)' }}
            >
              添加
            </button>
          </div>
        </div>

        {/* 创建按钮 */}
        <button
          onClick={handleCreate}
          disabled={uploading || !name.trim()}
          className="w-full py-4 rounded-xl font-medium text-white transition-all disabled:opacity-50"
          style={{ backgroundColor: 'var(--theme-primary)' }}
        >
          {uploading ? '创建中...' : '创建房间'}
        </button>

        <p className="text-xs text-center mt-4" style={{ color: 'var(--text-secondary)' }}>
          创建房间即表示你愿意在这个空间陪伴他人
        </p>
      </div>
    </div>
  );
}

export default CreateRoom;
