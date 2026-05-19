// 共境管理页面 - 管理世界呼吸时刻主题、音乐和静默同行房间

import React, { useState, useEffect, useRef } from 'react';
import { getSupabaseUrl } from '../supabase/client';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Upload,
  Music,
  Play,
  Pause,
  Globe,
  Clock,
  Users,
  X,
  Check,
  Loader2,
  AlertCircle,
  Eye,
} from 'lucide-react';

// Service Role Key for bypassing RLS
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';

function GongjingManagement() {
  // ============ 状态定义 ============
  const [activeTab, setActiveTab] = useState<'breathing' | 'music' | 'rooms'>('breathing');

  // 世界呼吸时刻主题状态
  const [breathingMoments, setBreathingMoments] = useState<any[]>([]);
  const [breathingLoading, setBreathingLoading] = useState(false);
  const [breathingPage, setBreathingPage] = useState(1);
  const [breathingTotal, setBreathingTotal] = useState(0);
  const [breathingSearch, setBreathingSearch] = useState('');
  const [breathingForm, setBreathingForm] = useState({
    theme: '',
    music_url: '',
    music_name: '',
    scheduled_time: '',
  });
  const [editingBreathing, setEditingBreathing] = useState<any>(null);
  const [showBreathingModal, setShowBreathingModal] = useState(false);

  // 背景音乐状态
  const [musicFiles, setMusicFiles] = useState<any[]>([]);
  const [musicLoading, setMusicLoading] = useState(false);
  const [uploadingMusic, setUploadingMusic] = useState(false);
  const [playingMusic, setPlayingMusic] = useState<string | null>(null);
  const [activeMusicUrl, setActiveMusicUrl] = useState<string | null>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);

  // 静默同行房间状态
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsPage, setRoomsPage] = useState(1);
  const [roomsTotal, setRoomsTotal] = useState(0);

  const pageSize = 10;
  const supabaseUrl = getSupabaseUrl();
  const headers = {
    'apikey': SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  };

  // ============ 世界呼吸时刻主题管理 ============

  // 获取主题列表
  const fetchBreathingMoments = async () => {
    setBreathingLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('select', '*');
      params.append('order', 'created_at.desc');
      params.append('offset', String((breathingPage - 1) * pageSize));
      params.append('limit', String(pageSize));

      if (breathingSearch) {
        params.append('theme.ilike', `%${breathingSearch}%`);
      }

      const res = await fetch(`${supabaseUrl}/rest/v1/breathing_moments?${params.toString()}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setBreathingMoments(Array.isArray(data) ? data : []);
      }

      // 获取总数
      const countRes = await fetch(`${supabaseUrl}/rest/v1/breathing_moments?select=id`, { headers });
      if (countRes.ok) {
        const countData = await countRes.json();
        setBreathingTotal(Array.isArray(countData) ? countData.length : 0);
      }
    } catch (err) {
      console.error('获取主题失败:', err);
    }
    setBreathingLoading(false);
  };

  // 保存主题
  const saveBreathingMoment = async () => {
    if (!breathingForm.theme.trim()) {
      alert('请输入今晚主题');
      return;
    }

    try {
      let musicUrl = breathingForm.music_url;
      let musicName = breathingForm.music_name;

      // 如果选中了活跃音乐
      if (activeMusicUrl && !breathingForm.music_url) {
        musicUrl = activeMusicUrl;
        musicName = musicFiles.find(f => f.url === activeMusicUrl)?.name || '背景音乐';
      }

      const body: any = {
        theme: breathingForm.theme.trim(),
        music_url: musicUrl || null,
        music_name: musicName || null,
        scheduled_time: breathingForm.scheduled_time || null,
        status: 'pending',
      };

      if (editingBreathing) {
        // 更新
        const res = await fetch(`${supabaseUrl}/rest/v1/breathing_moments?id=eq.${editingBreathing.id}`, {
          method: 'PATCH',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('更新失败');
        alert('主题更新成功！');
      } else {
        // 新增
        const res = await fetch(`${supabaseUrl}/rest/v1/breathing_moments`, {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('创建失败');
        alert('主题创建成功！');
      }

      setShowBreathingModal(false);
      setEditingBreathing(null);
      resetBreathingForm();
      fetchBreathingMoments();
    } catch (err: any) {
      alert(`保存失败: ${err.message}`);
    }
  };

  // 删除主题
  const deleteBreathingMoment = async (id: string) => {
    if (!confirm('确定要删除这个主题吗？')) return;

    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/breathing_moments?id=eq.${id}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) throw new Error('删除失败');
      alert('删除成功！');
      fetchBreathingMoments();
    } catch (err: any) {
      alert(`删除失败: ${err.message}`);
    }
  };

  // 重置表单
  const resetBreathingForm = () => {
    setBreathingForm({
      theme: '',
      music_url: '',
      music_name: '',
      scheduled_time: '',
    });
  };

  // ============ 背景音乐管理 ============

  // 获取音乐文件列表
  const fetchMusicFiles = async () => {
    setMusicLoading(true);
    try {
      const res = await fetch('/sb-storage/v1/object/list/room-music', {
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        // 过滤出目录，只取文件名
        const files = (Array.isArray(data) ? data : []).map((f: any) => ({
          name: f.name,
          url: `${supabaseUrl}/storage/v1/object/public/room-music/${f.name}`,
          size: f.metadata?.size || 0,
          created_at: f.created_at,
        }));
        setMusicFiles(files);
      }
    } catch (err) {
      console.error('获取音乐列表失败:', err);
    }
    setMusicLoading(false);
  };

  // 上传音乐文件
  const handleUploadMusic = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      alert('音频文件不能超过20MB');
      return;
    }
    if (!file.type.startsWith('audio/')) {
      alert('请上传音频文件');
      return;
    }

    setUploadingMusic(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const fileName = `admin/${Date.now()}_${file.name}`;

      const res = await fetch(
        `/sb-storage/v1/object/room-music/${fileName}`,
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

      if (!res.ok) throw new Error('上传失败');
      alert('音乐上传成功！');
      fetchMusicFiles();
    } catch (err: any) {
      alert(`上传失败: ${err.message}`);
    }
    setUploadingMusic(false);
    if (musicInputRef.current) {
      musicInputRef.current.value = '';
    }
  };

  // 删除音乐文件
  const deleteMusicFile = async (fileName: string) => {
    if (!confirm('确定要删除这个音乐文件吗？')) return;

    try {
      const res = await fetch(`/sb-storage/v1/object/room-music/${fileName}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
      });
      if (!res.ok) throw new Error('删除失败');
      alert('删除成功！');
      fetchMusicFiles();
    } catch (err: any) {
      alert(`删除失败: ${err.message}`);
    }
  };

  // 播放/暂停音乐
  const togglePlayMusic = (url: string) => {
    const audio = document.getElementById('music-player') as HTMLAudioElement;
    if (!audio) return;

    if (playingMusic === url) {
      audio.pause();
      setPlayingMusic(null);
    } else {
      audio.src = url;
      audio.play();
      setPlayingMusic(url);
    }
  };

  // 设置活跃音乐（用于创建主题时快速选择）
  const setActiveMusic = (url: string, name: string) => {
    setActiveMusicUrl(url);
    setBreathingForm(prev => ({
      ...prev,
      music_url: url,
      music_name: name,
    }));
  };

  // ============ 静默同行房间管理 ============

  // 获取房间列表
  const fetchRooms = async () => {
    setRoomsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('select', '*,room_participants(count)');
      params.append('order', 'created_at.desc');
      params.append('offset', String((roomsPage - 1) * pageSize));
      params.append('limit', String(pageSize));

      const res = await fetch(`${supabaseUrl}/rest/v1/rooms?type=eq.silent_companion&${params.toString()}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setRooms(Array.isArray(data) ? data : []);
      }

      // 获取总数
      const countRes = await fetch(`${supabaseUrl}/rest/v1/rooms?type=eq.silent_companion&select=id`, { headers });
      if (countRes.ok) {
        const countData = await countRes.json();
        setRoomsTotal(Array.isArray(countData) ? countData.length : 0);
      }
    } catch (err) {
      console.error('获取房间失败:', err);
    }
    setRoomsLoading(false);
  };

  // 结束房间
  const endRoom = async (roomId: string) => {
    if (!confirm('确定要结束这个房间吗？')) return;

    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/rooms?id=eq.${roomId}`, {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'completed',
          ended_at: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error('操作失败');
      alert('房间已结束！');
      fetchRooms();
    } catch (err: any) {
      alert(`操作失败: ${err.message}`);
    }
  };

  // 格式化时间
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  // 格式化文件大小
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // 初始化加载
  useEffect(() => {
    fetchBreathingMoments();
    fetchMusicFiles();
    fetchRooms();
  }, [breathingPage, roomsPage]);

  // ============ 渲染 ============

  return (
    <div className="max-w-7xl mx-auto">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">共境管理</h1>
        <p className="text-gray-500 text-sm mt-1">管理世界呼吸时刻主题、背景音乐和静默同行房间</p>
      </div>

      {/* Tab切换 */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('breathing')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'breathing'
              ? 'border-rose-500 text-rose-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Globe className="w-4 h-4 inline mr-2" />
          世界呼吸时刻
        </button>
        <button
          onClick={() => setActiveTab('music')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'music'
              ? 'border-rose-500 text-rose-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Music className="w-4 h-4 inline mr-2" />
          背景音乐
        </button>
        <button
          onClick={() => setActiveTab('rooms')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'rooms'
              ? 'border-rose-500 text-rose-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          静默同行房间
        </button>
      </div>

      {/* 世界呼吸时刻主题管理 */}
      {activeTab === 'breathing' && (
        <div>
          {/* 工具栏 */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索主题..."
                  value={breathingSearch}
                  onChange={(e) => {
                    setBreathingSearch(e.target.value);
                    setBreathingPage(1);
                  }}
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              </div>
            </div>
            <button
              onClick={() => {
                setEditingBreathing(null);
                resetBreathingForm();
                setShowBreathingModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              新增主题
            </button>
          </div>

          {/* 主题列表 */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      今晚主题
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      背景音乐
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      计划时间
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      创建时间
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {breathingLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                        加载中...
                      </td>
                    </tr>
                  ) : breathingMoments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        暂无主题记录
                      </td>
                    </tr>
                  ) : (
                    breathingMoments.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <span className="text-gray-900 font-medium">{item.theme || '-'}</span>
                        </td>
                        <td className="px-6 py-4">
                          {item.music_name ? (
                            <div className="flex items-center gap-2">
                              <Music className="w-4 h-4 text-rose-500" />
                              <span className="text-gray-600 text-sm">{item.music_name}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">无</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-600 text-sm">
                            {item.scheduled_time ? formatDate(item.scheduled_time) : '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              item.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : item.status === 'completed'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {item.status === 'active'
                              ? '进行中'
                              : item.status === 'completed'
                              ? '已结束'
                              : '待发布'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-500 text-sm">{formatDate(item.created_at)}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingBreathing(item);
                                setBreathingForm({
                                  theme: item.theme || '',
                                  music_url: item.music_url || '',
                                  music_name: item.music_name || '',
                                  scheduled_time: item.scheduled_time ? item.scheduled_time.slice(0, 16) : '',
                                });
                                setShowBreathingModal(true);
                              }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="编辑"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteBreathingMoment(item.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            {breathingTotal > pageSize && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                <span className="text-sm text-gray-500">
                  共 {breathingTotal} 条记录，第 {breathingPage} / {Math.ceil(breathingTotal / pageSize)} 页
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setBreathingPage(p => Math.max(1, p - 1))}
                    disabled={breathingPage === 1}
                    className="px-3 py-1 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一页
                  </button>
                  <button
                    onClick={() => setBreathingPage(p => Math.min(Math.ceil(breathingTotal / pageSize), p + 1))}
                    disabled={breathingPage >= Math.ceil(breathingTotal / pageSize)}
                    className="px-3 py-1 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 背景音乐管理 */}
      {activeTab === 'music' && (
        <div>
          {/* 工具栏 */}
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">上传的音频文件将用于世界呼吸时刻的背景音乐</p>
            <div>
              <input
                ref={musicInputRef}
                type="file"
                accept="audio/*"
                onChange={handleUploadMusic}
                className="hidden"
              />
              <button
                onClick={() => musicInputRef.current?.click()}
                disabled={uploadingMusic}
                className="flex items-center gap-2 px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors disabled:opacity-50"
              >
                {uploadingMusic ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    上传中...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    上传音乐
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 音乐列表 */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {musicLoading ? (
              <div className="p-12 text-center text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                加载中...
              </div>
            ) : musicFiles.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Music className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>暂无音乐文件</p>
                <p className="text-sm mt-1">点击上方按钮上传音乐文件</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {musicFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-4 hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => togglePlayMusic(file.url)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                          playingMusic === file.url
                            ? 'bg-rose-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-rose-100 hover:text-rose-600'
                        }`}
                      >
                        {playingMusic === file.url ? (
                          <Pause className="w-5 h-5" />
                        ) : (
                          <Play className="w-5 h-5 ml-0.5" />
                        )}
                      </button>
                      <div>
                        <p className="text-gray-900 font-medium">{file.name.split('/').pop()?.replace(/^\d+_/, '')}</p>
                        <p className="text-gray-500 text-sm">
                          {formatSize(file.size)} · {formatDate(file.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveMusic(file.url, file.name.split('/').pop()?.replace(/^\d+_/, '') || '音乐')}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                          activeMusicUrl === file.url
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700'
                        }`}
                      >
                        {activeMusicUrl === file.url ? (
                          <>
                            <Check className="w-4 h-4 inline mr-1" />
                            已设为活跃
                          </>
                        ) : (
                          '设为活跃'
                        )}
                      </button>
                      <button
                        onClick={() => deleteMusicFile(file.name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 静默同行房间管理 */}
      {activeTab === 'rooms' && (
        <div>
          {/* 房间列表 */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      房间标题
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      参与者
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      时长
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      创建时间
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {roomsLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                        加载中...
                      </td>
                    </tr>
                  ) : rooms.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        暂无静默同行房间
                      </td>
                    </tr>
                  ) : (
                    rooms.map((room) => (
                      <tr key={room.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-900">{room.title}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              room.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : room.status === 'completed'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {room.status === 'active' ? '进行中' : room.status === 'completed' ? '已结束' : '等待中'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-600">
                            {room.current_participants || 0} / {room.max_participants || 2}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-600">{room.duration || 30}分钟</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-500 text-sm">{formatDate(room.created_at)}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {room.status === 'active' && (
                            <button
                              onClick={() => endRoom(room.id)}
                              className="px-3 py-1.5 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                            >
                              结束房间
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            {roomsTotal > pageSize && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                <span className="text-sm text-gray-500">
                  共 {roomsTotal} 条记录，第 {roomsPage} / {Math.ceil(roomsTotal / pageSize)} 页
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRoomsPage(p => Math.max(1, p - 1))}
                    disabled={roomsPage === 1}
                    className="px-3 py-1 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一页
                  </button>
                  <button
                    onClick={() => setRoomsPage(p => Math.min(Math.ceil(roomsTotal / pageSize), p + 1))}
                    disabled={roomsPage >= Math.ceil(roomsTotal / pageSize)}
                    className="px-3 py-1 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 隐藏的音频播放器 */}
      <audio id="music-player" className="hidden" onEnded={() => setPlayingMusic(null)} />

      {/* 主题编辑弹窗 */}
      {showBreathingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingBreathing ? '编辑主题' : '新增主题'}
              </h3>
              <button
                onClick={() => {
                  setShowBreathingModal(false);
                  setEditingBreathing(null);
                  resetBreathingForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* 主题输入 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  今晚主题 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={breathingForm.theme}
                  onChange={(e) => setBreathingForm({ ...breathingForm, theme: e.target.value })}
                  placeholder="例如：为世界和平祈祷"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              </div>

              {/* 计划时间 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  计划发送时间
                </label>
                <input
                  type="datetime-local"
                  value={breathingForm.scheduled_time}
                  onChange={(e) => setBreathingForm({ ...breathingForm, scheduled_time: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              </div>

              {/* 背景音乐选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  背景音乐
                </label>
                {musicFiles.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    <div
                      onClick={() => setBreathingForm({ ...breathingForm, music_url: '', music_name: '' })}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        !breathingForm.music_url
                          ? 'bg-rose-50 border border-rose-200'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <Music className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">不使用音乐</span>
                    </div>
                    {musicFiles.map((file, index) => (
                      <div
                        key={index}
                        onClick={() =>
                          setBreathingForm({
                            ...breathingForm,
                            music_url: file.url,
                            music_name: file.name.split('/').pop()?.replace(/^\d+_/, '') || '音乐',
                          })
                        }
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                          breathingForm.music_url === file.url
                            ? 'bg-rose-50 border border-rose-200'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <Music className="w-4 h-4 text-rose-500" />
                        <span className="text-sm text-gray-600 truncate flex-1">
                          {file.name.split('/').pop()?.replace(/^\d+_/, '')}
                        </span>
                        {breathingForm.music_url === file.url && (
                          <Check className="w-4 h-4 text-rose-500" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
                    <AlertCircle className="w-4 h-4 inline mr-2" />
                    暂无音乐文件，请先在「背景音乐」标签页上传
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowBreathingModal(false);
                  setEditingBreathing(null);
                  resetBreathingForm();
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={saveBreathingMoment}
                className="px-4 py-2 bg-rose-500 text-white hover:bg-rose-600 rounded-lg transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GongjingManagement;
