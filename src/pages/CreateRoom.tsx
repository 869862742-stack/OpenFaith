import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, Upload, Music, Moon } from 'lucide-react';

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





interface CreateRoomProps {
  onClose: () => void;
}

function CreateRoom({ onClose }: CreateRoomProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [customAudio, setCustomAudio] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const customAudioRef = useRef<HTMLAudioElement | null>(null);

  // 切换标签选择
  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };





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
        ambient_sound: 'custom',
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

        {/* 音频上传说明 */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>
            <Music className="inline w-4 h-4 mr-1" />
            音频（可选）
          </label>
          <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
            可以在创建房间后上传音频文件到播放列表
          </p>
        </div>

        {/* 自定义音频上传（保留可选功能） */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-color)' }}>
            <Upload className="inline w-4 h-4 mr-1" />
            上传初始音频（可选）
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
                <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-secondary)' }}>已选择</span>
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
