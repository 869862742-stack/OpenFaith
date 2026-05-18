import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, Send, Loader2, Mic, Smile, Plus, 
  Image, Camera, FileText, BookOpen,
  X, ChevronDown, Volume2, Heart, Laugh, Frown, Angry, Sun, Moon, CloudRain, Wind, Star, ThumbsUp, Flame, MessageCircle, Sparkles,
  Landmark, Bird, Award, HeartHandshake, Mountain, Compass, Shield, GitBranch,
  Cross, Church, Feather, Scroll, Footprints, Globe, Eye, Lightbulb, Key, 
  Sunrise, CloudSun, CloudMoon, Snowflake, Flower2, TreePine, Scale, Waves,
  Signpost, Gift, Route, Flag
} from 'lucide-react';
import { checkBadWords, loadBannedWordsFromDatabase } from '../utils/badWordFilter';

const PRIMARY_COLOR = '#E11D48';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';

// 表情列表（简笔画风格，发送 [emoji:label] 格式，消息中渲染为主题色lucide图标）
const EMOJI_ICONS = [
  // 基础情感
  { icon: <Smile className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'smile', label: '微笑' },
  { icon: <Laugh className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'laugh', label: '大笑' },
  { icon: <Frown className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'frown', label: '难过' },
  { icon: <ThumbsUp className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'thumbsup', label: '赞同' },
  { icon: <Heart className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'heart', label: '爱心' },
  { icon: <Angry className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'angry', label: '义怒' },
  
  // ✝️ 信仰核心
  { icon: <Cross className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'cross', label: '十字架' },
  { icon: <Church className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'church', label: '教堂' },
  { icon: <BookOpen className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'bookopen', label: '经文' },
  { icon: <Scroll className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'scroll', label: '卷轴' },
  { icon: <Feather className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'feather', label: '笔录' },
  { icon: <Key className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'key', label: '天国钥匙' },
  
  // 🕊️ 灵性体验
  { icon: <Bird className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'bird', label: '和平' },
  { icon: <Sparkles className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'sparkles', label: '恩典' },
  { icon: <Flame className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'flame', label: '圣火' },
  { icon: <Wind className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'wind', label: '圣灵' },
  { icon: <Lightbulb className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'lightbulb', label: '启示' },
  { icon: <Eye className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'eye', label: '看见' },
  { icon: <Waves className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'waves', label: '活水' },
  
  // 🌿 生命与自然
  { icon: <Sun className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'sun', label: '真光' },
  { icon: <Sunrise className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'sunrise', label: '新生' },
  { icon: <Moon className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'moon', label: '沉思' },
  { icon: <CloudSun className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'cloudsun', label: '应许' },
  { icon: <CloudMoon className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'cloudmoon', label: '守望' },
  { icon: <Star className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'star', label: '引导星' },
  { icon: <Flower2 className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'flower', label: '绽放' },
  { icon: <TreePine className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'treepine', label: '生命树' },
  { icon: <Snowflake className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'snowflake', label: '纯净' },
  { icon: <CloudRain className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'cloudrain', label: '试炼' },
  
  // 🤝 关系与使命
  { icon: <HeartHandshake className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'hearthandshake', label: '和解' },
  { icon: <HeartHandshake className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'fellowship', label: '团契' },
  { icon: <MessageCircle className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'message', label: '对话' },
  { icon: <Globe className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'globe', label: '普世' },
  { icon: <Scale className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'scale', label: '公义' },
  { icon: <Shield className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'shield', label: '庇护' },
  { icon: <Gift className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'gift', label: '恩赐' },
  
  // 🏔️ 旅途与成长
  { icon: <Footprints className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'footprints', label: '足迹' },
  { icon: <Mountain className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'mountain', label: '坚定' },
  { icon: <Route className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'route', label: '天路' },
  { icon: <Compass className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'compass', label: '指引' },
  { icon: <Signpost className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'signpost', label: '方向' },
  { icon: <Flag className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'flag', label: '旗帜' },
  { icon: <Award className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'award', label: '冠冕' },
  { icon: <Landmark className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />, code: 'landmark', label: '圣殿' },
];

// 表情code到lucide组件的映射
const EMOJI_ICON_MAP: Record<string, React.ReactNode> = {};
EMOJI_ICONS.forEach(item => {
  EMOJI_ICON_MAP[item.code] = item.icon;
});

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type: string;
  is_read: boolean;
  created_at: string;
}

interface UserProfile {
  id: string;
  user_id?: string;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
}

interface NoteItem {
  id: string;
  title: string;
  content: string;
  cover_image: string | null;
}

interface ChapterItem {
  id: string;
  chapter_title: string;
  book_title: string;
  book_id: string;
  content?: string;
}

function PrivateChat() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [friendProfile, setFriendProfile] = useState<UserProfile | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [currentUserProfileId, setCurrentUserProfileId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tableExists, setTableExists] = useState(true);
  
  // 小红书风格功能状态
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  // 分享选择器
  const [showNotePicker, setShowNotePicker] = useState(false);
  const [showScripturePicker, setShowScripturePicker] = useState(false);
  const [myNotes, setMyNotes] = useState<NoteItem[]>([]);
  const [scriptures, setScriptures] = useState<ChapterItem[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [isLoadingScriptures, setIsLoadingScriptures] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // 夜间模式颜色
  const bgColor = 'var(--bg-color)';
  const cardBg = 'var(--card-bg)';
  const cardBgSecondary = 'var(--bg-secondary)';
  const textColor = 'var(--text-color)';
  const textSecondary = 'var(--text-secondary)';
  const borderColor = 'var(--border-color)';

  // 表情列表（简笔画风格）
  const quickEmojis = EMOJI_ICONS;

  // 获取当前用户信息并查询 profiles.id
  useEffect(() => {
    const fetchCurrentUserProfile = async () => {
      const userInfo = localStorage.getItem('user_info');
      if (!userInfo) {
        console.warn('[Chat] No user_info in localStorage');
        return;
      }
      
      try {
        const parsed = JSON.parse(userInfo);
        const authUserId = parsed.user_id || parsed.id;
        
        if (!authUserId) {
          console.warn('[Chat] No authUserId found in user_info');
          return;
        }
        
        console.log('[Chat] Fetching profile for authUserId:', authUserId);
        
        const res = await fetch(`/sb-api/rest/v1/profiles?user_id=eq.${authUserId}&select=id,username,nickname,avatar_url,user_id&limit=1`, {
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          console.log('[Chat] Profile query result:', data);
          
          if (Array.isArray(data) && data.length > 0) {
            const profile = data[0];
            setCurrentUserProfile(profile);
            setCurrentUserProfileId(profile.id);
            console.log('[Chat] Set currentUserProfileId to profiles.id:', profile.id);
          } else {
            // ⚠️ 关键修复：不要用 authUserId 作为 fallback！
            // 如果没有 profile 记录，应该提示用户重新登录，而不是用 auth UUID
            console.error('[Chat] CRITICAL: No profile found for user, auth UUID will not work for messages!');
            setError('用户资料异常，请重新登录');
            
            // 仍然设置但加上标记，方便排查
            setCurrentUserProfile({
              id: authUserId,
              user_id: authUserId,
              username: parsed.username || 'Unknown',
              nickname: parsed.nickname || null,
              avatar_url: parsed.avatar_url || null,
            });
            // 不要设置 currentUserProfileId！这样消息就发不出去，防止数据混乱
            // setCurrentUserProfileId(authUserId); // 注释掉这个危险的 fallback
          }
        } else {
          console.error('[Chat] Failed to query profile:', res.status);
        }
      } catch (e) {
        console.error('[Chat] Error fetching current user profile:', e);
      }
    };
    
    fetchCurrentUserProfile();
  }, []);

  // 获取好友信息 - 兼容两种 ID 格式（auth UUID 和 profiles.id）
  useEffect(() => {
    const fetchFriendProfile = async () => {
      if (!userId) return;
      
      console.log('[Chat] Fetching friend profile for userId:', userId);
      
      try {
        // 先尝试用 user_id 查询（auth UUID）
        let res = await fetch(`/sb-api/rest/v1/profiles?user_id=eq.${userId}&select=id,username,nickname,avatar_url,user_id&limit=1`, {
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          }
        });

        if (res.ok) {
          let data = await res.json();
          console.log('[Chat] Query by user_id result:', data);
          
          // 如果没查到，尝试用 id 查询（profiles.id）
          if (!Array.isArray(data) || data.length === 0) {
            console.log('[Chat] No result by user_id, trying by id...');
            res = await fetch(`/sb-api/rest/v1/profiles?id=eq.${userId}&select=id,username,nickname,avatar_url,user_id&limit=1`, {
              headers: {
                'apikey': SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
              }
            });
            
            if (res.ok) {
              data = await res.json();
              console.log('[Chat] Query by id result:', data);
            }
          }
          
          if (Array.isArray(data) && data.length > 0) {
            setFriendProfile(data[0]);
          } else {
            console.error('[Chat] Friend profile not found for userId:', userId);
            setError('找不到对方用户信息');
          }
        }
      } catch (error) {
        console.error('[Chat] Error fetching friend profile:', error);
      }
    };

    fetchFriendProfile();
  }, [userId]);

  // 加载消息
  const loadMessages = async () => {
    if (!userId || !currentUserProfileId || !friendProfile?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      // 查询双方之间的所有消息：(A发B) OR (B发A)
      const orFilter = `(and(sender_id.eq.${currentUserProfileId},receiver_id.eq.${friendProfile.id}),and(sender_id.eq.${friendProfile.id},receiver_id.eq.${currentUserProfileId}))`;
      const params = new URLSearchParams();
      params.append('select', 'id,sender_id,receiver_id,content,message_type,is_read,created_at');
      params.append('or', orFilter);
      params.append('order', 'created_at.asc');
      params.append('limit', '200');

      const res = await fetch(`/sb-api/rest/v1/private_messages?${params.toString()}`, {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        }
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.error('[Chat] Load failed:', res.status, errText);
        if (res.status === 404) {
          setTableExists(false);
          setError('私聊功能即将上线');
        }
        return;
      }

      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data);
        
        // 标记消息为已读
        const unreadMessages = data.filter(
          (m: Message) => m.receiver_id === currentUserProfileId && !m.is_read
        );
        if (unreadMessages.length > 0) {
          markMessagesAsRead(unreadMessages.map((m: Message) => m.id));
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setError('加载消息失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 标记消息为已读
  const markMessagesAsRead = async (messageIds: string[]) => {
    if (messageIds.length === 0) return;
    try {
      const params = new URLSearchParams();
      params.append('id', `in.(${messageIds.join(',')})`);
      
      await fetch(`/sb-api/rest/v1/private_messages?${params.toString()}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ is_read: true }),
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  useEffect(() => {
    if (currentUserProfileId && friendProfile?.id) {
      loadMessages();
    }
  }, [userId, currentUserProfileId, friendProfile?.id]);

  // 消息轮询（每5秒检查新消息，仅在有变化时更新，避免闪烁）
  useEffect(() => {
    if (!currentUserProfileId || !friendProfile?.id || !tableExists) return;
    
    pollingRef.current = setInterval(async () => {
      // 静默加载，不设 isLoading，避免UI闪烁
      try {
        const orFilter = `(and(sender_id.eq.${currentUserProfileId},receiver_id.eq.${friendProfile.id}),and(sender_id.eq.${friendProfile.id},receiver_id.eq.${currentUserProfileId}))`;
        const params = new URLSearchParams();
        params.append('select', 'id,sender_id,receiver_id,content,message_type,is_read,created_at');
        params.append('or', orFilter);
        params.append('order', 'created_at.asc');
        params.append('limit', '200');

        const res = await fetch(`/sb-api/rest/v1/private_messages?${params.toString()}`, {
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          }
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            // 只在有新消息时更新
            setMessages(prev => {
              if (prev.length === data.length && prev.length > 0 && prev[prev.length - 1]?.id === data[data.length - 1]?.id) {
                return prev; // 无变化，返回原引用避免re-render
              }
              return data;
            });
          }
        }
      } catch (err) {
        // 静默忽略轮询错误
      }
    }, 5000);
    
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [currentUserProfileId, friendProfile?.id, tableExists]);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 发送消息 - 包含详细日志和违规词检测
  const handleSendMessage = async (overrideContent?: string, overrideType?: string) => {
    const content = overrideContent || inputText.trim();
    const msgType = overrideType || 'text';
    
    // 详细日志帮助排查
    if (!content) {
      console.warn('[Chat] Empty content, skipping send');
      return;
    }
    if (!currentUserProfileId) {
      console.error('[Chat] currentUserProfileId is null, cannot send!', {
        currentUserProfile,
        error
      });
      setError('用户信息加载中，请稍后再试');
      return;
    }
    if (!friendProfile?.id) {
      console.error('[Chat] friendProfile.id is null, cannot send!', {
        friendProfile,
        userId
      });
      setError('对方信息加载中，请稍后再试');
      return;
    }
    if (isSending) return;

    // ========== 违规词检测 ==========
    // 获取当前语言设置
    const currentLang = localStorage.getItem('openfaith-language') || 'zh-CN';
    
    // 检查违规词（只检测文本类型消息）
    if (msgType === 'text' || msgType === 'faith_bubble') {
      const filterResult = checkBadWords(content, currentLang);
      if (filterResult.hasViolation) {
        setError(filterResult.message || '内容包含违规词汇，请修改后重新发送');
        // 显示错误提示后自动清除
        setTimeout(() => setError(null), 3000);
        return;
      }
    }
    // =================================

    setIsSending(true);
    const newMessage = {
      sender_id: currentUserProfileId,
      receiver_id: friendProfile.id,
      content: content,
      message_type: msgType,
    };

    console.log('[Chat] Sending message:', { 
      sender: currentUserProfileId, 
      receiver: friendProfile.id, 
      content: content.substring(0, 50),
      type: msgType 
    });

    try {
      const res = await fetch('/sb-api/rest/v1/private_messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify(newMessage),
      });

      if (res.ok) {
        console.log('[Chat] Message sent successfully!');
        if (!overrideContent) setInputText('');
        inputRef.current?.focus();
        loadMessages();
      } else {
        const errText = await res.text().catch(() => '');
        console.error('[Chat] Send failed:', res.status, errText);
        setError(`发送失败(${res.status})，请重试`);
      }
    } catch (error) {
      console.error('[Chat] Network error:', error);
      setError('网络错误，请重试');
    } finally {
      setIsSending(false);
    }
  };

  // 处理回车发送
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 快捷表情：添加 [emoji:code] 到输入框
  const handleQuickEmoji = (code: string) => {
    setInputText(prev => prev + `[emoji:${code}]`);
    inputRef.current?.focus();
  };

  // ========== 图片上传 ==========
  const handleImageSelect = () => {
    fileInputRef.current?.click();
  };

  const handleCameraSelect = () => {
    cameraInputRef.current?.click();
  };

  const uploadImageToStorage = async (file: File): Promise<string | null> => {
    try {
      const { supabase } = await import('../supabase/client');
      const fileName = `chat_${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')  // 复用 avatars bucket
        .upload(fileName, file, { upsert: true });
      
      if (uploadError) {
        console.error('[Chat] Image upload failed:', uploadError);
        return null;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      
      return publicUrl;
    } catch (e) {
      console.error('[Chat] Image upload error:', e);
      return null;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    
    // 先发送一条"图片消息"，内容为本地预览
    const localUrl = URL.createObjectURL(file);
    handleSendMessage(localUrl, 'image');
    
    // 异步上传到 Storage，成功后更新消息
    const publicUrl = await uploadImageToStorage(file);
    if (publicUrl) {
      // 发送一条带公开URL的图片消息（替换本地预览）
      handleSendMessage(publicUrl, 'image');
    }
  };

  // ========== 分享笔记 ==========
  const loadMyNotes = async () => {
    if (!currentUserProfileId) return;
    setIsLoadingNotes(true);
    try {
      const userInfo = localStorage.getItem('user_info');
      if (!userInfo) return;
      const parsed = JSON.parse(userInfo);
      const authUserId = parsed.user_id || parsed.id;
      
      const res = await fetch(
        `/sb-api/rest/v1/posts?user_id=eq.${authUserId}&status=eq.published&select=id,title,content,cover_image&order=created_at.desc&limit=20`,
        { headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` } }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setMyNotes(data);
      }
    } catch (e) {
      console.error('[Chat] Load notes failed:', e);
    } finally {
      setIsLoadingNotes(false);
    }
  };

  const handleShareNote = (note: NoteItem) => {
    const shareContent = `📖 ${note.title}\n\n${note.content?.substring(0, 100)}${note.content && note.content.length > 100 ? '...' : ''}\n\n🔗 查看完整笔记: #/note/${note.id}`;
    handleSendMessage(shareContent, 'text');
    setShowNotePicker(false);
    setShowMoreMenu(false);
  };

  // ========== 分享经文 ==========
  const loadScriptures = async () => {
    setIsLoadingScriptures(true);
    try {
      // 获取藏书列表
      const res = await fetch(
        `/sb-api/rest/v1/books?select=id,title&order=title.asc&limit=50`,
        { headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` } }
      );
      if (res.ok) {
        const books = await res.json();
        if (!Array.isArray(books) || books.length === 0) {
          setScriptures([]);
          return;
        }
        // 获取每本书的章节
        const allChapters: ChapterItem[] = [];
        for (const book of books.slice(0, 10)) {
          const chRes = await fetch(
            `/sb-api/rest/v1/chapters?book_id=eq.${book.id}&select=id,chapter_title,book_id,content&order=chapter_title.asc&limit=20`,
            { headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` } }
          );
          if (chRes.ok) {
            const chs = await chRes.json();
            if (Array.isArray(chs)) {
              chs.forEach((ch: any) => {
                allChapters.push({
                  id: ch.id,
                  chapter_title: ch.chapter_title,
                  book_title: book.title,
                  book_id: book.id,
                  content: ch.content || '',
                });
              });
            }
          }
        }
        setScriptures(allChapters);
      }
    } catch (e) {
      console.error('[Chat] Load scriptures failed:', e);
    } finally {
      setIsLoadingScriptures(false);
    }
  };

  const handleShareScripture = (chapter: ChapterItem) => {
    // 以信仰气泡格式发送，截取内容前100字
    const textPreview = chapter.content 
      ? chapter.content.substring(0, 100).replace(/\n/g, ' ') + (chapter.content.length > 100 ? '...' : '')
      : chapter.chapter_title;
    const bubbleData = JSON.stringify({
      text: textPreview,
      source: `${chapter.book_title} · ${chapter.chapter_title}`,
      link: `/book/${chapter.book_id}/chapter/${chapter.id}`,
    });
    handleSendMessage(bubbleData, 'faith_bubble');
    setShowScripturePicker(false);
    setShowMoreMenu(false);
  };

  // ========== 分享计划 ==========
  const handleSharePlan = () => {
    handleSendMessage('📋 [分享计划] 即将推出，敬请期待！', 'text');
    setShowMoreMenu(false);
  };

  // 更多菜单项
  const moreMenuItems = [
    { icon: Image, label: '相册', action: handleImageSelect },
    { icon: Camera, label: '拍照', action: handleCameraSelect },
    { icon: FileText, label: '分享笔记', action: () => { setShowNotePicker(true); loadMyNotes(); } },
    { icon: BookOpen, label: '分享经文', action: () => { setShowScripturePicker(true); loadScriptures(); } },
  ];

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return '今天';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '昨天';
    } else {
      return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' });
    }
  };

  // 判断是否显示日期分割线
  const shouldShowDateDivider = (index: number) => {
    if (index === 0) return true;
    const currentDate = new Date(messages[index].created_at).toDateString();
    const prevDate = new Date(messages[index - 1].created_at).toDateString();
    return currentDate !== prevDate;
  };

  // 渲染消息内容（支持图片、信仰气泡和文本）
  const renderMessageContent = (message: Message) => {
    if (message.message_type === 'image') {
      return (
        <img
          src={message.content}
          alt="图片"
          className="max-w-[200px] max-h-[200px] rounded-lg object-cover cursor-pointer"
          onClick={() => window.open(message.content, '_blank')}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
            (e.target as HTMLImageElement).parentElement!.innerHTML = `<span style="color:#999">图片加载失败</span>`;
          }}
        />
      );
    }
    
    // 信仰气泡
    if (message.message_type === 'faith_bubble') {
      try {
        const data = JSON.parse(message.content);
        const isOwn = isOwnMessage(message);
        return (
          <div
            className="rounded-2xl overflow-hidden max-w-[260px]"
            style={{
              backgroundColor: isOwn ? 'rgba(225,29,72,0.08)' : 'rgba(225,29,72,0.02)',
              border: `1px solid rgba(225,29,72,0.15)`,
            }}
          >
            {/* 气泡头部 */}
            <div className="px-3 py-1.5 flex items-center gap-1.5" style={{ backgroundColor: 'rgba(225,29,72,0.06)' }}>
              <span className="text-sm">📜</span>
              <span className="text-xs font-medium" style={{ color: PRIMARY_COLOR }}>信仰之光</span>
            </div>
            {/* 经文内容 */}
            <div className="px-3 py-2.5">
              <p className="text-sm leading-relaxed italic" style={{ color: textColor }}>
                "{data.text}"
              </p>
            </div>
            {/* 来源 */}
            <div className="px-3 py-1.5 flex items-center justify-between" style={{ borderTop: '1px solid rgba(225,29,72,0.08)' }}>
              <span className="text-xs" style={{ color: textSecondary }}>
                — {data.source}
              </span>
              {data.link && (
                <button
                  onClick={() => { window.location.hash = data.link; }}
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ color: PRIMARY_COLOR, backgroundColor: 'rgba(225,29,72,0.08)' }}
                >
                  阅读
                </button>
              )}
            </div>
          </div>
        );
      } catch {
        // JSON解析失败，按普通文本显示
        return <span>{message.content}</span>;
      }
    }
    
    // 文本消息：渲染 [emoji:code] 为主题色lucide图标
    const content = message.content;
    const parts = content.split('\n');
    return (
      <div className="whitespace-pre-wrap break-words">
        {parts.map((part, i) => {
          if (part.includes('🔗')) {
            const linkMatch = part.match(/🔗\s*(.*)/);
            if (linkMatch) {
              const linkText = linkMatch[1];
              const hashMatch = linkText.match(/(#\/.*)/);
              return (
                <span key={i}>
                  🔗{' '}
                  <span
                    className="underline cursor-pointer"
                    style={{ color: isOwnMessage(message) ? '#FFD700' : PRIMARY_COLOR }}
                    onClick={() => {
                      if (hashMatch) {
                        window.location.hash = hashMatch[1];
                      }
                    }}
                  >
                    {linkText}
                  </span>
                </span>
              );
            }
          }
          // 渲染 [emoji:code] 为主题色图标
          const emojiRegex = /\[emoji:(\w+)\]/g;
          const fragments: React.ReactNode[] = [];
          let lastIndex = 0;
          let match;
          while ((match = emojiRegex.exec(part)) !== null) {
            if (match.index > lastIndex) {
              fragments.push(part.substring(lastIndex, match.index));
            }
            const iconNode = EMOJI_ICON_MAP[match[1]];
            if (iconNode) {
              fragments.push(<span key={`e${i}-${match.index}`} className="inline-flex items-center align-middle mx-0.5">{iconNode}</span>);
            } else {
              fragments.push(match[0]);
            }
            lastIndex = match.index + match[0].length;
          }
          if (lastIndex < part.length) {
            fragments.push(part.substring(lastIndex));
          }
          // 如果整条消息只有emoji，放大显示
          const isOnlyEmoji = /^\[emoji:\w+\]$/.test(part);
          return <span key={i} className={isOnlyEmoji ? 'text-3xl' : ''}>{fragments}{i < parts.length - 1 ? '\n' : ''}</span>;
        })}
      </div>
    );
  };

  const isOwnMessage = (message: Message) => message.sender_id === currentUserProfileId;

  // 获取头像URL
  const getAvatarUrl = (profile: UserProfile | null) => {
    if (!profile) return null;
    return profile.avatar_url || null;
  };

  // 获取显示名称
  const getDisplayName = (profile: UserProfile | null) => {
    if (!profile) return '加载中...';
    return profile.nickname || profile.username || '未知用户';
  };

  // 获取默认头像
  const getDefaultAvatar = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div 
      className="flex flex-col h-screen"
      style={{ backgroundColor: bgColor }}
    >
      {/* 顶部导航栏 */}
      <div 
        className="flex items-center h-14 px-4 border-b shrink-0"
        style={{ backgroundColor: cardBg, borderColor }}
      >
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-black/5 active:bg-black/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" style={{ color: textColor }} />
        </button>
        
        <div className="flex-1 flex items-center justify-center gap-2">
          <button 
            onClick={() => navigate(`/profile/${userId}`)}
            className="flex items-center gap-2"
          >
            {getAvatarUrl(friendProfile) ? (
              <img
                src={getAvatarUrl(friendProfile)!}
                alt={getDisplayName(friendProfile)}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
                style={{ backgroundColor: PRIMARY_COLOR, color: 'white' }}
              >
                {getDefaultAvatar(getDisplayName(friendProfile))}
              </div>
            )}
            <h1 className="text-base font-medium" style={{ color: textColor }}>
              {getDisplayName(friendProfile)}
            </h1>
            <ChevronDown className="w-4 h-4" style={{ color: textSecondary }} />
          </button>
        </div>
        
        <div className="w-9" />
      </div>

      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto p-4 pb-2">
        {!tableExists ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-center">
              <div className="text-4xl mb-4">💬</div>
              <p className="text-base" style={{ color: textSecondary }}>
                私聊功能即将上线
              </p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: PRIMARY_COLOR }} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="mb-4"><HeartHandshake className="w-10 h-10" style={{ color: PRIMARY_COLOR }} /></div>
            <p className="text-base" style={{ color: textSecondary }}>
              You are already friends, let's start chatting
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message, index) => {
              const isOwn = isOwnMessage(message);
              const showDateDivider = shouldShowDateDivider(index);
              const senderProfile = isOwn ? currentUserProfile : friendProfile;

              return (
                <React.Fragment key={message.id}>
                  {showDateDivider && (
                    <div className="flex justify-center my-4">
                      <span 
                        className="text-xs px-3 py-1 rounded-full"
                        style={{ backgroundColor: cardBgSecondary, color: textSecondary }}
                      >
                        {formatDate(message.created_at)}
                      </span>
                    </div>
                  )}
                  
                  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    {/* 对方头像：在左边 */}
                    {!isOwn && (
                      <button 
                        onClick={() => navigate(`/profile/${userId}`)}
                        className="shrink-0 mr-2 self-end"
                      >
                        {getAvatarUrl(senderProfile) ? (
                          <img
                            src={getAvatarUrl(senderProfile)!}
                            alt={getDisplayName(senderProfile)}
                            className="w-9 h-9 rounded-full object-cover"
                          />
                        ) : (
                          <div 
                            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium"
                            style={{ backgroundColor: PRIMARY_COLOR, color: 'white' }}
                          >
                            {getDefaultAvatar(getDisplayName(senderProfile))}
                          </div>
                        )}
                      </button>
                    )}
                    
                    <div className="max-w-[70%]">
                      {/* 语音消息特殊渲染 */}
                      {message.message_type === 'voice' ? (
                        <div
                          className="px-4 py-2.5 rounded-2xl flex items-center gap-2 cursor-pointer"
                          style={{
                            backgroundColor: isOwn ? 'rgba(225,29,72,0.02)' : cardBgSecondary,
                            color: isOwn ? PRIMARY_COLOR : textColor,
                            borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            minWidth: '100px',
                          }}
                        >
                          <Volume2 className="w-4 h-4" />
                          <div className="flex gap-0.5">
                            {[1,2,3].map(i => (
                              <div key={i} className="w-0.5 rounded-full" style={{ 
                                height: `${8 + i * 4}px`, 
                                backgroundColor: isOwn ? 'rgba(225,29,72,0.2)' : 'rgba(0,0,0,0.3)' 
                              }} />
                            ))}
                          </div>
                          <span className="text-xs ml-1">{message.content}″</span>
                        </div>
                      ) : message.message_type === 'faith_bubble' ? (
                        /* 信仰气泡 — 自带边框和背景，不需要普通气泡包裹 */
                        <div>{renderMessageContent(message)}</div>
                      ) : (
                        <div
                          className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                          style={{
                            backgroundColor: isOwn ? 'rgba(225,29,72,0.02)' : cardBgSecondary,
                            color: isOwn ? textColor : textColor,
                            borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          }}
                        >
                          {renderMessageContent(message)}
                        </div>
                      )}
                      <div 
                        className={`text-xs mt-1 ${isOwn ? 'text-right' : 'text-left'}`}
                        style={{ color: textSecondary }}
                      >
                        {formatTime(message.created_at)}
                      </div>
                    </div>

                    {/* 我的头像：在右边 */}
                    {isOwn && (
                      <button 
                        onClick={() => {
                          const authUserId = JSON.parse(localStorage.getItem('user_info') || '{}').user_id || JSON.parse(localStorage.getItem('user_info') || '{}').id;
                          if (authUserId) navigate(`/profile/${authUserId}`);
                        }}
                        className="shrink-0 ml-2 self-end"
                      >
                        {getAvatarUrl(senderProfile) ? (
                          <img
                            src={getAvatarUrl(senderProfile)!}
                            alt={getDisplayName(senderProfile)}
                            className="w-9 h-9 rounded-full object-cover"
                          />
                        ) : (
                          <div 
                            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium"
                            style={{ backgroundColor: PRIMARY_COLOR, color: 'white' }}
                          >
                            {getDefaultAvatar(getDisplayName(senderProfile))}
                          </div>
                        )}
                      </button>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}

        {error && (
          <div className="text-center mt-4">
            <span className="text-sm" style={{ color: '#EF4444' }}>{error}</span>
          </div>
        )}
      </div>

      {/* 快捷表情栏 - 主题色图标+标签，可滚动 */}
      {showEmojiPicker && (
        <div 
          className="px-3 py-3 border-t max-h-[40vh] overflow-y-auto"
          style={{ backgroundColor: cardBg, borderColor }}
        >
          <div className="flex flex-wrap gap-2">
            {quickEmojis.map((item, index) => (
              <button
                key={index}
                onClick={() => handleQuickEmoji(item.code)}
                className="flex flex-col items-center justify-center w-12 py-1 hover:scale-110 transition-transform rounded-lg hover:bg-black/5"
                title={item.label}
              >
                <span style={{ color: PRIMARY_COLOR }}>{item.icon}</span>
                <span className="text-[9px] mt-0.5 truncate w-full text-center" style={{ color: textSecondary }}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 分享笔记选择器 */}
      {showNotePicker && (
        <div 
          className="border-t max-h-[50vh] overflow-y-auto"
          style={{ backgroundColor: cardBg, borderColor }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor }}>
            <span className="font-medium" style={{ color: textColor }}>选择笔记</span>
            <button onClick={() => setShowNotePicker(false)}>
              <X className="w-5 h-5" style={{ color: textSecondary }} />
            </button>
          </div>
          {isLoadingNotes ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: PRIMARY_COLOR }} />
            </div>
          ) : myNotes.length === 0 ? (
            <div className="text-center py-8" style={{ color: textSecondary }}>
              暂无已发布的笔记
            </div>
          ) : (
            myNotes.map(note => (
              <button
                key={note.id}
                onClick={() => handleShareNote(note)}
                className="w-full flex items-center gap-3 px-4 py-3 border-b text-left hover:bg-black/5"
                style={{ borderColor }}
              >
                {note.cover_image ? (
                  <img src={note.cover_image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: cardBgSecondary }}>
                    <FileText className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: textColor }}>{note.title}</div>
                  <div className="text-xs truncate mt-0.5" style={{ color: textSecondary }}>{note.content?.substring(0, 50) || '无内容'}</div>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* 分享经文选择器 */}
      {showScripturePicker && (
        <div 
          className="border-t max-h-[50vh] overflow-y-auto"
          style={{ backgroundColor: cardBg, borderColor }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor }}>
            <span className="font-medium" style={{ color: textColor }}>选择经文章节</span>
            <button onClick={() => setShowScripturePicker(false)}>
              <X className="w-5 h-5" style={{ color: textSecondary }} />
            </button>
          </div>
          {isLoadingScriptures ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: PRIMARY_COLOR }} />
            </div>
          ) : scriptures.length === 0 ? (
            <div className="text-center py-8" style={{ color: textSecondary }}>
              藏书暂无章节
            </div>
          ) : (
            scriptures.map(ch => (
              <button
                key={ch.id}
                onClick={() => handleShareScripture(ch)}
                className="w-full flex items-center gap-3 px-4 py-3 border-b text-left hover:bg-black/5"
                style={{ borderColor }}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: cardBgSecondary }}>
                  <BookOpen className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: textColor }}>{ch.chapter_title}</div>
                  <div className="text-xs mt-0.5" style={{ color: textSecondary }}>{ch.book_title}</div>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* 底部输入栏 - 小红书风格 */}
      <div 
        className="flex items-end gap-2 p-3 border-t shrink-0"
        style={{ backgroundColor: cardBg, borderColor }}
      >
        {/* 语音按钮 */}
        <button
          onClick={() => setIsVoiceMode(!isVoiceMode)}
          className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
          style={{ 
            backgroundColor: isVoiceMode ? PRIMARY_COLOR : cardBgSecondary,
            color: isVoiceMode ? 'white' : textColor,
          }}
        >
          {isVoiceMode ? (
            <X className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </button>
        
        {/* 输入框 / 语音模式 */}
        <div className="flex-1 relative">
          {isVoiceMode ? (
            <button
              className="w-full h-11 rounded-full flex items-center justify-center text-sm font-medium transition-colors"
              style={{ 
                backgroundColor: isRecording ? '#DC2626' : PRIMARY_COLOR,
                color: 'white',
                opacity: isRecording ? 0.8 : 1,
              }}
              onPointerDown={() => setIsRecording(true)}
              onPointerUp={() => {
                setIsRecording(false);
                // 模拟发送语音消息（实际录音需要原生支持）
                handleSendMessage('3', 'voice');
              }}
              onPointerLeave={() => {
                if (isRecording) setIsRecording(false);
              }}
            >
              {isRecording ? '松开发送' : '按住说话'}
            </button>
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息..."
              disabled={isSending || !tableExists}
              className="w-full px-4 py-2.5 rounded-2xl text-sm resize-none outline-none"
              style={{ 
                backgroundColor: cardBgSecondary, 
                color: textColor,
                border: `1px solid ${borderColor}`,
              }}
            />
          )}
        </div>
        
        {/* 表情按钮 */}
        <button
          onClick={() => {
            setShowEmojiPicker(!showEmojiPicker);
            setShowMoreMenu(false);
            setShowNotePicker(false);
            setShowScripturePicker(false);
          }}
          className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
          style={{ 
            backgroundColor: showEmojiPicker ? PRIMARY_COLOR : cardBgSecondary,
            color: showEmojiPicker ? 'white' : textColor,
          }}
        >
          <Smile className="w-5 h-5" />
        </button>
        
        {/* 加号按钮 / 发送按钮 */}
        {inputText.trim() && !isVoiceMode ? (
          <button
            onClick={() => handleSendMessage()}
            disabled={isSending}
            className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all"
            style={{ backgroundColor: PRIMARY_COLOR, color: 'white' }}
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        ) : (
          <button
            onClick={() => {
              setShowMoreMenu(!showMoreMenu);
              setShowEmojiPicker(false);
              setShowNotePicker(false);
              setShowScripturePicker(false);
            }}
            className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
            style={{ 
              backgroundColor: showMoreMenu ? PRIMARY_COLOR : cardBgSecondary,
              color: showMoreMenu ? 'white' : textColor,
            }}
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 更多功能菜单 */}
      {showMoreMenu && (
        <div 
          className="border-t p-4"
          style={{ backgroundColor: cardBg, borderColor }}
        >
          <div className="grid grid-cols-4 gap-4">
            {moreMenuItems.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  item.action();
                  if (item.label !== '分享笔记' && item.label !== '分享经文') {
                    setShowMoreMenu(false);
                  }
                }}
                className="flex flex-col items-center gap-2"
              >
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: cardBgSecondary }}
                >
                  <item.icon className="w-6 h-6" style={{ color: PRIMARY_COLOR }} />
                </div>
                <span className="text-xs" style={{ color: textColor }}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowMoreMenu(false)}
            className="absolute top-2 right-2 p-1 rounded-full"
            style={{ color: textSecondary }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* CSS 动画 */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

export default PrivateChat;
