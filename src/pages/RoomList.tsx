import React, { useState, useEffect } from 'react';
import { Moon, CloudRain, Waves, TreePine, Wind, Piano, Music, Search, Plus, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';

interface Room {
  id: string;
  name: string;
  description: string;
  ambient_sound: string;
  user_count: number;
  room_code: number;
  tags: string[];
  created_at: string;
}

interface RoomListProps {
  onClose?: () => void;
  onCreateRoom?: () => void;
}

function RoomList({ onClose, onCreateRoom }: RoomListProps) {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // 获取所有房间
  const fetchRooms = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        '/sb-api/rest/v1/rooms?order=user_count.desc,last_activity_at.desc&limit=50&select=id,name,description,ambient_sound,user_count,room_code,tags,created_at',
        {
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setRooms(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    // 清理超时空房间（1小时无人）
    const cleanupStaleRooms = async () => {
      try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const res = await fetch(
          `/sb-api/rest/v1/rooms?user_count=eq.0&last_activity_at=lt.${oneHourAgo}&select=id`,
          {
            headers: {
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            },
          }
        );
        const staleRooms = await res.json();
        if (Array.isArray(staleRooms) && staleRooms.length > 0) {
          for (const room of staleRooms) {
            try {
              await fetch(`/sb-api/rest/v1/room_participants?room_id=eq.${room.id}`, { method: 'DELETE', headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` } });
              await fetch(`/sb-api/rest/v1/room_sentences?room_id=eq.${room.id}`, { method: 'DELETE', headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` } });
              await fetch(`/sb-api/rest/v1/rooms?id=eq.${room.id}`, { method: 'DELETE', headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` } });
            } catch {}
          }
          // 刷新房间列表
          fetchRooms();
        }
      } catch (err) {
        console.error('Failed to cleanup stale rooms:', err);
      }
    };
    cleanupStaleRooms();
  }, []);

  // 过滤房间
  const filteredRooms = rooms.filter(room => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const matchName = room.name?.toLowerCase().includes(query);
    const matchCode = room.room_code?.toString().includes(query);
    return matchName || matchCode;
  });

  // 进入房间
  const handleEnterRoom = (roomId: string) => {
    if (onClose) onClose();
    window.location.hash = `/room/${roomId}`;
  };

  // 获取音效图标
  const getSoundIcon = (sound: string) => {
    switch (sound) {
      case 'rain': return <CloudRain className="w-4 h-4" />;
      case 'ocean': return <Waves className="w-4 h-4" />;
      case 'forest': return <TreePine className="w-4 h-4" />;
      case 'wind': return <Wind className="w-4 h-4" />;
      case 'piano': return <Piano className="w-4 h-4" />;
      case 'custom': return <Music className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="p-4">
      {/* 搜索框 */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="搜索房间名或房间ID..."
          className="w-full h-11 pl-10 pr-4 rounded-xl border text-sm"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-color)',
          }}
        />
      </div>

      {/* 创建房间按钮 */}
      <button
        onClick={onCreateRoom}
        className="w-full mb-4 py-3 rounded-xl font-medium text-white flex items-center justify-center gap-2"
        style={{ backgroundColor: '#2563EB' }}
      >
        <Plus className="w-5 h-5" />
        创建房间
      </button>

      {/* 房间列表 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="text-center py-12">
          <Moon className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: 'var(--text-secondary)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>暂无房间</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>成为第一个创建者吧</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRooms.map(room => (
            <button
              key={room.id}
              onClick={() => handleEnterRoom(room.id)}
              className="w-full text-left p-4 rounded-xl transition-all hover:opacity-80"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            >
              <div className="flex items-start gap-3">
                {/* 房间图标 */}
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgba(225, 29, 72, 0.1)' }}
                >
                  <Moon className="w-6 h-6" style={{ color: '#2563EB' }} />
                </div>
                
                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span 
                      className="font-medium text-sm truncate"
                      style={{ color: 'var(--text-color)' }}
                    >
                      {room.name}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span 
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: 'rgba(225, 29, 72, 0.1)', color: '#2563EB' }}
                      >
                        ID: {room.room_code}
                      </span>
                    </div>
                  </div>
                  
                  {room.description && (
                    <p 
                      className="text-xs line-clamp-1 mb-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {room.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {room.user_count || 0}人在
                      </span>
                    </div>
                    
                    {room.ambient_sound && room.ambient_sound !== 'silence' && (
                      <div className="flex items-center gap-1">
                        {getSoundIcon(room.ambient_sound)}
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {room.ambient_sound === 'rain' && '雨声'}
                          {room.ambient_sound === 'ocean' && '海浪'}
                          {room.ambient_sound === 'forest' && '森林'}
                          {room.ambient_sound === 'wind' && '风声'}
                          {room.ambient_sound === 'piano' && '钢琴'}
                          {room.ambient_sound === 'custom' && '自定义'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default RoomList;
