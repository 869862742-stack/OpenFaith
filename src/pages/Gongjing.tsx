// Build: 20250519 - 共境(静默同行/世界呼吸时刻/树洞回声/跨信圆桌)入口页面

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Music, Loader2, Moon, BookOpen, Heart, Brain, Hand, Sparkles, Send, X, Volume2, MessageCircle, Globe, MessagesSquare, Users, Clock, AlertTriangle, UserPlus, Mic, MicOff, Download, Flag, ChevronRight } from 'lucide-react';
import { checkBadWords } from '../utils/badWordFilter/index';

// Service Role Key
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';
const SUPABASE_URL = 'https://rdhwmeittgdosmkxtpak.supabase.co';
const API_PREFIX = '/sb-api/';

// 状态选项（静默同行）
const primaryColor = '#3B82F6';
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

// 洲和国家数据
const CONTINENTS_DATA = {
  '亚洲': {
    countries: [
      { name: '中国', flag: '🇨🇳' },
      { name: '日本', flag: '🇯🇵' },
      { name: '韩国', flag: '🇰🇷' },
      { name: '印度', flag: '🇮🇳' },
      { name: '泰国', flag: '🇹🇭' },
      { name: '菲律宾', flag: '🇵🇭' },
    ]
  },
  '欧洲': {
    countries: [
      { name: '英国', flag: '🇬🇧' },
      { name: '法国', flag: '🇫🇷' },
      { name: '德国', flag: '🇩🇪' },
      { name: '意大利', flag: '🇮🇹' },
      { name: '西班牙', flag: '🇪🇸' },
      { name: '荷兰', flag: '🇳🇱' },
    ]
  },
  '非洲': {
    countries: [
      { name: '南非', flag: '🇿🇦' },
      { name: '尼日利亚', flag: '🇳🇬' },
      { name: '肯尼亚', flag: '🇰🇪' },
      { name: '埃及', flag: '🇪🇬' },
      { name: '加纳', flag: '🇬🇭' },
    ]
  },
  '北美洲': {
    countries: [
      { name: '美国', flag: '🇺🇸' },
      { name: '加拿大', flag: '🇨🇦' },
      { name: '墨西哥', flag: '🇲🇽' },
    ]
  },
  '南美洲': {
    countries: [
      { name: '巴西', flag: '🇧🇷' },
      { name: '阿根廷', flag: '🇦🇷' },
      { name: '智利', flag: '🇨🇱' },
    ]
  },
  '大洋洲': {
    countries: [
      { name: '澳大利亚', flag: '🇦🇺' },
      { name: '新西兰', flag: '🇳🇿' },
    ]
  },
};

// 类型定义
type TabType = 'silent' | 'breathing' | 'echo' | 'roundtable';

// 跨信圆桌相关类型
interface Roundtable {
  id: string;
  topic: string;
  moderator_id: string;
  moderator_name?: string;
  status: 'waiting' | 'active' | 'ended';
  max_speaking_time: number;
  current_speaker_index: number;
  current_round: number;
  participant_count: number;
  audience_count: number;
  created_at: string;
  ended_at?: string;
}

interface RoundtableParticipant {
  id: string;
  roundtable_id: string;
  team_name: string;
  captain_id: string;
  captain_name?: string;
  members: string[];
  member_count: number;
  speaking_order: number;
}

interface RoundtableSpeech {
  id: string;
  roundtable_id: string;
  participant_id?: string;
  speaker_id: string;
  speaker_name: string;
  content: string;
  round_number: number;
  duration: number;
  created_at: string;
}

interface EchoShare {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  author_name: string | null;
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

// 模拟等待人数生成函数
let participantCountGlobal = 0;
const generateMockWaitingCounts = () => {
  const counts: Record<string, Record<string, number>> = {};
  let remaining = participantCountGlobal;
  
  Object.keys(CONTINENTS_DATA).forEach(continent => {
    counts[continent] = {};
    const countryCount = CONTINENTS_DATA[continent as keyof typeof CONTINENTS_DATA].countries.length;
    const baseCount = Math.floor(remaining / (7 - Object.keys(counts).length));
    const count = Math.max(0, Math.min(baseCount + Math.floor(Math.random() * 5), remaining));
    remaining -= count;
    
    let countryRemaining = count;
    CONTINENTS_DATA[continent as keyof typeof CONTINENTS_DATA].countries.forEach((country, idx) => {
      if (idx === CONTINENTS_DATA[continent as keyof typeof CONTINENTS_DATA].countries.length - 1) {
        counts[continent][country.name] = countryRemaining;
      } else {
        const c = Math.floor(countryRemaining / (CONTINENTS_DATA[continent as keyof typeof CONTINENTS_DATA].countries.length - idx));
        counts[continent][country.name] = c;
        countryRemaining -= c;
      }
    });
  });
  
  return counts;
};

export default function Gongjing() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Tab状态
  const [activeTab, setActiveTab] = useState<TabType>('silent');
  
  // 静默同行状态
  const [selectedStatus, setSelectedStatus] = useState<string>('安静中');
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicName, setMusicName] = useState<string>('');
  
  // 世界呼吸时刻状态
  const [breathingStatus, setBreathingStatus] = useState<string>('安静中');
  const [breathingTheme, setBreathingTheme] = useState<string>('');
  const [participantCount, setParticipantCount] = useState<number>(0);
  const [isInBreathing, setIsInBreathing] = useState(false);
  const [showContinentList, setShowContinentList] = useState(false);
  const [selectedContinent, setSelectedContinent] = useState<string | null>(null);
  const [waitingCounts, setWaitingCounts] = useState<Record<string, Record<string, number>>>({});
  
  // 树洞回声状态
  const [echoContent, setEchoContent] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean>(true);
  const [echoList, setEchoList] = useState<EchoShare[]>([]);
  const [echoLoading, setEchoLoading] = useState(false);
  const [echoSubmitting, setEchoSubmitting] = useState(false);
  const [echoError, setEchoError] = useState('');
  const [expandedEchoId, setExpandedEchoId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState<string>('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [userReactions, setUserReactions] = useState<Record<string, string[]>>({});
  const [isNightMode, setIsNightMode] = useState(false);
  
  // 跨信圆桌状态
  const [roundtables, setRoundtables] = useState<Roundtable[]>([]);
  const [roundtablesLoading, setRoundtablesLoading] = useState(false);
  const [isInRoundtable, setIsInRoundtable] = useState(false);
  const [currentRoundtable, setCurrentRoundtable] = useState<Roundtable | null>(null);
  const [roundtableParticipants, setRoundtableParticipants] = useState<RoundtableParticipant[]>([]);
  const [roundtableSpeeches, setRoundtableSpeeches] = useState<RoundtableSpeech[]>([]);
  const [showModeratorApplication, setShowModeratorApplication] = useState(false);
  const [moderatorForm, setModeratorForm] = useState({ nickname: '', bio: '', reason: '' });
  const [submittingApplication, setSubmittingApplication] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [speakingTime, setSpeakingTime] = useState(60);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechContent, setSpeechContent] = useState('');
  const [isUserParticipant, setIsUserParticipant] = useState(false);
  const [userParticipantInfo, setUserParticipantInfo] = useState<RoundtableParticipant | null>(null);
  const [showModeratorPanel, setShowModeratorPanel] = useState(false);
  const [moderatorActions, setModeratorActions] = useState({ extendTime: 0, nextSpeaker: false, endRoundtable: false });
  
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
        `${API_PREFIX}rest/v1/echo_shares?select=*,echo_echoes(*),echo_reactions(*)&order=created_at.desc&limit=30`,
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
          `${API_PREFIX}rest/v1/breathing_moments?select=*&order=created_at.desc&limit=1`,
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
          `${API_PREFIX}rest/v1/rooms?type=eq.world_breathing&status=eq.active&select=id`,
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
          participantCountGlobal = simulatedCount;
          // 更新等待人数
          setWaitingCounts(generateMockWaitingCounts());
        }
      } catch (err) {
        console.warn('获取参与人数失败:', err);
        const count = Math.floor(Math.random() * 30) + 5;
        setParticipantCount(count);
        participantCountGlobal = count;
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

  // ============ 跨信圆桌相关函数 ============

  // 加载圆桌列表
  const loadRoundtables = async () => {
    setRoundtablesLoading(true);
    try {
      const res = await fetch(
        `${API_PREFIX}rest/v1/roundtables?select=*&order=created_at.desc`,
        {
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setRoundtables(data || []);
      }
    } catch (err) {
      console.warn('加载圆桌列表失败:', err);
    } finally {
      setRoundtablesLoading(false);
    }
  };

  // 加载圆桌数据
  const loadRoundtableData = async (roundtableId: string) => {
    try {
      // 加载圆桌信息
      const rtRes = await fetch(
        `${API_PREFIX}rest/v1/roundtables?id=eq.${roundtableId}&select=*`,
        {
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          },
        }
      );
      if (rtRes.ok) {
        const rtData = await rtRes.json();
        if (rtData && rtData.length > 0) {
          setCurrentRoundtable(rtData[0]);
        }
      }

      // 加载参与者
      const participantsRes = await fetch(
        `${API_PREFIX}rest/v1/roundtable_participants?roundtable_id=eq.${roundtableId}&select=*&order=speaking_order.asc`,
        {
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          },
        }
      );
      if (participantsRes.ok) {
        const participantsData = await participantsRes.json();
        setRoundtableParticipants(participantsData || []);
      }

      // 加载发言记录
      const speechesRes = await fetch(
        `${API_PREFIX}rest/v1/roundtable_speeches?roundtable_id=eq.${roundtableId}&select=*&order=created_at.asc`,
        {
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          },
        }
      );
      if (speechesRes.ok) {
        const speechesData = await speechesRes.json();
        setRoundtableSpeeches(speechesData || []);
      }

      // 检查当前用户是否为参与者
      const userInfo = localStorage.getItem('user_info');
      if (userInfo) {
        const parsed = JSON.parse(userInfo);
        const userId = parsed.user_id || parsed.id;
        const userAsParticipant = (await fetch(
          `${API_PREFIX}rest/v1/roundtable_participants?roundtable_id=eq.${roundtableId}&captain_id=eq.${userId}&select=*`,
          {
            headers: {
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            },
          }
        ).then(r => r.json()));
        
        if (userAsParticipant && userAsParticipant.length > 0) {
          setIsUserParticipant(true);
          setUserParticipantInfo(userAsParticipant[0]);
        } else {
          setIsUserParticipant(false);
          setUserParticipantInfo(null);
        }
      }
    } catch (err) {
      console.warn('加载圆桌数据失败:', err);
    }
  };

  // 进入圆桌（观众身份）
  const enterRoundtable = async (roundtableId: string) => {
    setIsInRoundtable(true);
    await loadRoundtableData(roundtableId);
  };

  // 退出圆桌
  const exitRoundtable = () => {
    setIsInRoundtable(false);
    setCurrentRoundtable(null);
    setRoundtableParticipants([]);
    setRoundtableSpeeches([]);
    setIsUserParticipant(false);
    setUserParticipantInfo(null);
    setShowModeratorPanel(false);
  };

  // 提交主持人申请
  const submitModeratorApplication = async () => {
    if (!moderatorForm.nickname.trim() || !moderatorForm.reason.trim()) {
      setError('请填写昵称和申请理由');
      return;
    }

    setSubmittingApplication(true);
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

      const res = await fetch(`${API_PREFIX}rest/v1/moderator_applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          user_id: userId,
          nickname: moderatorForm.nickname.trim(),
          bio: moderatorForm.bio.trim(),
          reason: moderatorForm.reason.trim(),
          status: 'pending',
        }),
      });

      if (!res.ok) {
        throw new Error('提交申请失败');
      }

      setShowModeratorApplication(false);
      setModeratorForm({ nickname: '', bio: '', reason: '' });
      alert('申请已提交，请等待管理员审核');
    } catch (err: any) {
      setError(err.message || '提交申请失败');
    } finally {
      setSubmittingApplication(false);
    }
  };

  // 提交举报
  const submitReport = async () => {
    if (!reportReason.trim()) {
      setError('请填写举报原因');
      return;
    }

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

      const res = await fetch(`${API_PREFIX}rest/v1/roundtable_reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          roundtable_id: currentRoundtable?.id,
          reporter_id: userId,
          reason: reportReason.trim(),
          status: 'pending',
        }),
      });

      if (!res.ok) {
        throw new Error('提交举报失败');
      }

      setShowReportModal(false);
      setReportReason('');
      alert('举报已提交，管理员会尽快处理');
    } catch (err: any) {
      setError(err.message || '提交举报失败');
    }
  };

  // 发言计时器
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSpeaking && speakingTime > 0) {
      timer = setInterval(() => {
        setSpeakingTime(prev => {
          if (prev <= 1) {
            setIsSpeaking(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isSpeaking, speakingTime]);

  // 刷新圆桌数据
  useEffect(() => {
    if (activeTab === 'roundtable' && !isInRoundtable) {
      loadRoundtables();
      const interval = setInterval(loadRoundtables, 30000);
      return () => clearInterval(interval);
    }
  }, [activeTab, isInRoundtable]);

  // 刷新圆桌内数据
  useEffect(() => {
    if (isInRoundtable && currentRoundtable) {
      loadRoundtableData(currentRoundtable.id);
      const interval = setInterval(() => loadRoundtableData(currentRoundtable.id), 10000);
      return () => clearInterval(interval);
    }
  }, [isInRoundtable, currentRoundtable]);

  // 下载讨论内容
  const downloadRoundtableContent = () => {
    if (!currentRoundtable) return;

    let content = `# 跨信圆桌讨论记录\n\n`;
    content += `## 话题\n${currentRoundtable.topic}\n\n`;
    content += `## 主持人\n${currentRoundtable.moderator_name || '未知'}\n\n`;
    content += `## 参与方\n`;
    roundtableParticipants.forEach(p => {
      content += `- ${p.team_name}（队长: ${p.captain_name || '未知'}，队员: ${p.member_count - 1}人）\n`;
    });
    content += `\n## 讨论记录\n\n`;

    let currentRound = 0;
    roundtableSpeeches.forEach(speech => {
      if (speech.round_number !== currentRound) {
        currentRound = speech.round_number;
        content += `\n### 第${currentRound}轮\n\n`;
      }
      content += `**${speech.speaker_name}** (${speech.duration}秒):\n${speech.content}\n\n`;
    });

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `圆桌讨论_${currentRoundtable.topic}_${new Date().toLocaleDateString()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

  // 移除音乐
  const removeMusic = () => {
    setMusicFile(null);
    setMusicName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

      const res = await fetch(`${API_PREFIX}rest/v1/rooms`, {
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

  // 进入世界呼吸时刻 - 不再创建房间，直接进入沉浸界面
  const handleEnterBreathing = () => {
    setIsInBreathing(true);
    setShowContinentList(false);
    setSelectedContinent(null);
    setWaitingCounts(generateMockWaitingCounts());
  };

  // 退出世界呼吸时刻
  const handleExitBreathing = () => {
    setIsInBreathing(false);
    setShowContinentList(false);
    setSelectedContinent(null);
  };

  // 点击地球展开洲列表
  const handleEarthClick = () => {
    setShowContinentList(true);
    setSelectedContinent(null);
  };

  // 点击洲展开国家列表
  const handleContinentClick = (continent: string) => {
    setSelectedContinent(continent);
  };

  // 返回洲列表
  const handleBackToContinents = () => {
    setSelectedContinent(null);
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

      // 获取用户昵称
      let authorName: string | null = null;
      if (!isAnonymous && parsed.nickname) {
        authorName = parsed.nickname;
      }

      const res = await fetch(`${API_PREFIX}rest/v1/echo_shares`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          content: echoContent.trim(),
          user_id: userId,
          author_name: authorName,
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

      const res = await fetch(`${API_PREFIX}rest/v1/echo_echoes`, {
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
          `${API_PREFIX}rest/v1/echo_reactions?share_id=eq.${shareId}&user_id=eq.${userId}&reaction_type=eq.${reactionType}`,
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
        await fetch(`${API_PREFIX}rest/v1/echo_reactions`, {
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
        `${API_PREFIX}rest/v1/echo_shares?id=eq.${shareId}&user_id=eq.${userId}`,
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

  // 获取显示名称
  const getDisplayName = (share: EchoShare) => {
    if (share.author_name) {
      return share.author_name;
    }
    return 'Anonymous Soul';
  };

  // 格式化秒为 mm:ss
  const formatSpeakingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
      style={{
        background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a15 100%)',
        ...nightModeStyle
      }}
    >
      {/* 星空背景 */}
      {(
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
            onClick={() => { setActiveTab('silent'); setIsInBreathing(false); }}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all duration-300 ${
              activeTab === 'silent'
                ? 'bg-white/15 text-white shadow-lg'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            静默同行
          </button>
          <button
            onClick={() => { setActiveTab('breathing'); setIsInBreathing(false); }}
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
            onClick={() => { setActiveTab('echo'); setIsInBreathing(false); }}
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
            树洞回声
          </button>
          {/* 跨信圆桌 Tab */}
          <button
            onClick={() => { setActiveTab('roundtable'); setIsInBreathing(false); }}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all duration-300 ${
              activeTab === 'roundtable'
                ? 'text-white shadow-lg'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
            style={{
              background: activeTab === 'roundtable' ? `${primaryColor}30` : undefined,
              border: activeTab === 'roundtable' ? `1px solid ${primaryColor}50` : 'none',
            }}
          >
            跨信圆桌
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
                      onClick={(e) => { e.stopPropagation(); removeMusic(); }}
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
            {/* 进入世界呼吸时刻后的沉浸界面 */}
            {isInBreathing ? (
              <div className="min-h-[70vh] flex flex-col items-center justify-center">
                {/* 退出按钮 */}
                <button
                  onClick={handleExitBreathing}
                  className="absolute top-24 right-4 px-4 py-2 rounded-full bg-white/10 text-white/70 text-sm hover:bg-white/20 transition-colors"
                >
                  退出
                </button>

                {/* 呼吸地球动画 */}
                <div className="flex flex-col items-center gap-6">
                  {/* 地球主体 - 可点击 */}
                  <div 
                    className="relative cursor-pointer"
                    onClick={handleEarthClick}
                  >
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
                      className="relative w-40 h-40 rounded-full"
                      style={{
                        background: 'radial-gradient(circle at 30% 30%, #60a5fa 0%, #3b82f6 40%, #1d4ed8 70%, #1e3a8a 100%)',
                        animation: 'earthBreathing 4s ease-in-out infinite',
                        boxShadow: '0 0 60px rgba(59, 130, 246, 0.4)',
                      }}
                    >
                      {/* 地球上的光点 */}
                      {[...Array(12)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute w-2 h-2 rounded-full bg-white/80"
                          style={{
                            left: `${15 + Math.random() * 70}%`,
                            top: `${15 + Math.random() * 70}%`,
                            animation: `floatParticle ${2 + Math.random() * 2}s ease-in-out infinite`,
                            animationDelay: `${Math.random() * 2}s`,
                          }}
                        />
                      ))}
                    </div>
                    {/* 浮动粒子 */}
                    {[...Array(16)].map((_, i) => (
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

                  {/* 参与人数 */}
                  <div className="text-center">
                    <p className="text-white text-2xl font-light mb-1">
                      🌍 {participantCount} 人此刻同行
                    </p>
                    <p className="text-white/50 text-sm italic">
                      点击地球查看各洲分布
                    </p>
                  </div>

                  {/* 洲/国家列表 */}
                  {showContinentList && (
                    <div className="w-full max-w-md mt-4 space-y-3 animate-fadeIn">
                      {/* 返回按钮 */}
                      {selectedContinent && (
                        <button
                          onClick={handleBackToContinents}
                          className="flex items-center gap-2 text-white/60 hover:text-white text-sm mb-2 transition-colors"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          返回洲列表
                        </button>
                      )}

                      {/* 洲列表 */}
                      {!selectedContinent ? (
                        Object.entries(CONTINENTS_DATA).map(([continent, data]) => (
                          <button
                            key={continent}
                            onClick={() => handleContinentClick(continent)}
                            className="w-full p-4 rounded-xl backdrop-blur-md transition-all duration-300 hover:bg-white/10"
                            style={{
                              background: 'rgba(59, 130, 246, 0.1)',
                              border: '1px solid rgba(59, 130, 246, 0.2)',
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Globe className="w-5 h-5" style={{ color: '#3b82f6' }} />
                                <span className="text-white text-sm">{continent}</span>
                              </div>
                              <span className="text-white/50 text-sm">
                                {waitingCounts[continent] ? Object.values(waitingCounts[continent]).reduce((a, b) => a + b, 0) : 0} 人
                              </span>
                            </div>
                          </button>
                        ))
                      ) : (
                        // 国家列表
                        <div className="space-y-2">
                          <h3 className="text-white/80 text-sm mb-3">{selectedContinent} - 国家分布</h3>
                          {CONTINENTS_DATA[selectedContinent as keyof typeof CONTINENTS_DATA].countries.map((country) => (
                            <div
                              key={country.name}
                              className="flex items-center justify-between p-3 rounded-xl backdrop-blur-md"
                              style={{
                                background: 'rgba(59, 130, 246, 0.05)',
                                border: '1px solid rgba(59, 130, 246, 0.1)',
                              }}
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-lg">{country.flag}</span>
                                <span className="text-white/80 text-sm">{country.name}</span>
                              </div>
                              <span className="text-white/50 text-sm">
                                {waitingCounts[selectedContinent]?.[country.name] || 0} 人
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 当前状态 */}
                  {breathingTheme && (
                    <div 
                      className="mt-6 p-4 rounded-xl backdrop-blur-md text-center"
                      style={{
                        background: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                      }}
                    >
                      <p className="text-white/60 text-xs mb-1">此刻主题</p>
                      <p className="text-white text-lg font-light">{breathingTheme}</p>
                    </div>
                  )}

                  {/* 状态选择 */}
                  <div className="mt-4 w-full max-w-md">
                    <h3 className="text-white/80 text-sm mb-3 text-center">此刻你的状态</h3>
                    <div className="flex flex-wrap justify-center gap-2">
                      {BREATHING_STATUS_OPTIONS.map((status) => (
                        <button
                          key={status.id}
                          onClick={() => setBreathingStatus(status.id)}
                          className={`px-3 py-2 rounded-xl backdrop-blur-md transition-all duration-300 ${
                            breathingStatus === status.id ? 'scale-105' : 'hover:scale-105'
                          }`}
                          style={{
                            background: breathingStatus === status.id 
                              ? `${status.color || primaryColor}30` 
                              : 'rgba(255, 255, 255, 0.05)',
                            border: breathingStatus === status.id 
                              ? `1px solid ${status.color || primaryColor}50` 
                              : '1px solid rgba(255, 255, 255, 0.1)',
                          }}
                        >
                          <div className="flex flex-col items-center gap-1">
                            {status.emoji ? (
                              <span className="text-lg">{status.emoji}</span>
                            ) : (
                              (() => {
                                const Icon = ICON_MAP[status.icon];
                                return Icon ? (
                                  <Icon 
                                    className="w-5 h-5" 
                                    style={{ 
                                      color: breathingStatus === status.id 
                                        ? (status.color || primaryColor) 
                                        : 'rgba(255,255,255,0.5)' 
                                    }} 
                                  />
                                ) : null;
                              })()
                            )}
                            <span className="text-white/90 text-xs">{status.label}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // 未进入前的准备界面
              <>
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
                      <Globe className="w-8 h-8" style={{ color: '#3b82f6' }} />
                    </div>
                  </div>
                  <h2 className="text-white text-xl font-light mb-2">世界呼吸时刻</h2>
                  <p className="text-white/40 text-xs mt-2">与世界各地的人一起静默</p>
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

                {/* 主题未发布时的等待界面 */}
                {!breathingTheme ? (
                  <div 
                    className="mb-8 p-6 rounded-2xl backdrop-blur-md text-center"
                    style={{
                      background: 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                    }}
                  >
                    <p className="text-white/60 text-sm mb-4">主题暂未发布，请等待</p>
                    <p className="text-white text-lg mb-4">
                      🌍 {participantCount} 人正在等待
                    </p>
                    <button
                      onClick={handleEarthClick}
                      className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                    >
                      点击查看各洲分布
                    </button>

                    {/* 洲列表 */}
                    {showContinentList && (
                      <div className="mt-4 space-y-2 animate-fadeIn">
                        <button
                          onClick={() => setShowContinentList(false)}
                          className="text-white/40 hover:text-white/60 text-xs transition-colors"
                        >
                          点击收起
                        </button>
                        {Object.entries(CONTINENTS_DATA).map(([continent, data]) => (
                          <button
                            key={continent}
                            onClick={() => handleContinentClick(continent)}
                            className="w-full p-3 rounded-xl backdrop-blur-md transition-all duration-300 hover:bg-white/10"
                            style={{
                              background: 'rgba(59, 130, 246, 0.05)',
                              border: '1px solid rgba(59, 130, 246, 0.1)',
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Globe className="w-4 h-4" style={{ color: '#3b82f6' }} />
                                <span className="text-white/80 text-sm">{continent}</span>
                              </div>
                              <span className="text-white/50 text-sm">
                                {waitingCounts[continent] ? Object.values(waitingCounts[continent]).reduce((a, b) => a + b, 0) : 0} 人
                              </span>
                            </div>
                          </button>
                        ))}

                        {/* 国家列表 */}
                        {selectedContinent && (
                          <div className="mt-2 pl-4 space-y-1">
                            <button
                              onClick={handleBackToContinents}
                              className="flex items-center gap-1 text-white/40 hover:text-white/60 text-xs mb-2 transition-colors"
                            >
                              <ArrowLeft className="w-3 h-3" />
                              返回
                            </button>
                            {CONTINENTS_DATA[selectedContinent as keyof typeof CONTINENTS_DATA].countries.map((country) => (
                              <div
                                key={country.name}
                                className="flex items-center justify-between p-2 rounded-lg"
                                style={{
                                  background: 'rgba(59, 130, 246, 0.03)',
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{country.flag}</span>
                                  <span className="text-white/70 text-xs">{country.name}</span>
                                </div>
                                <span className="text-white/40 text-xs">
                                  {waitingCounts[selectedContinent]?.[country.name] || 0} 人
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  // 主题已发布时的显示
                  <>
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
                      <p className="text-white text-lg font-light">{breathingTheme}</p>
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
                              {status.emoji ? (
                                <span className="text-lg">{status.emoji}</span>
                              ) : (
                                (() => {
                                  const Icon = ICON_MAP[status.icon];
                                  return Icon ? (
                                    <Icon 
                                      className="w-6 h-6" 
                                      style={{ 
                                        color: selectedBreathingStatus === status.id 
                                          ? (status.color || primaryColor) 
                                          : 'rgba(255,255,255,0.5)' 
                                      }} 
                                    />
                                  ) : null;
                                })()
                              )}
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
                  </>
                )}

                {/* 进入按钮 */}
                <button
                  onClick={handleEnterBreathing}
                  className="w-full py-5 rounded-2xl backdrop-blur-md text-white font-medium transition-all duration-300 relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(37, 99, 235, 0.4) 100%)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    boxShadow: '0 0 30px rgba(59, 130, 246, 0.3)',
                  }}
                >
                  <span className="relative z-10">进入世界呼吸时刻</span>
                  <div
                    className="absolute inset-0 opacity-30"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                      animation: 'shimmer 3s infinite',
                    }}
                  />
                </button>

                {/* 底部提示 */}
                <div className="mt-16 text-center">
                  <p className="text-white/40 text-sm italic" style={{ animation: 'fadeInUp 1s ease-out 0.5s both' }}>
                    Tonight, the world slowed down together.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* 树洞回声 Tab */}
        {activeTab === 'echo' && (
          <div className="space-y-6" style={{ animation: 'fadeIn 0.3s ease-out' }}>
            {/* 标题区域 */}
            <div className="text-center mb-8" style={{ animation: 'fadeInUp 0.5s ease-out' }}>
              <div className="inline-flex items-center gap-2 mb-4">
                <MessageCircle className="w-8 h-8" style={{ color: primaryColor }} />
              </div>
              <h2 className="text-white text-xl font-light mb-2">树洞回声</h2>
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
              {/* 匿名/公开选择 */}
              <div className="flex items-center justify-center gap-3 mb-4">
                <span className="text-white/50 text-sm">发布身份</span>
                <div 
                  className="flex rounded-full p-1"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(245, 158, 11, 0.15)',
                  }}
                >
                  <button
                    onClick={() => setIsAnonymous(true)}
                    className={`px-4 py-1.5 rounded-full text-sm transition-all duration-300 ${
                      isAnonymous ? 'text-white' : 'text-white/50'
                    }`}
                    style={{
                      background: isAnonymous ? `${primaryColor}30` : 'transparent',
                      border: isAnonymous ? `1px solid ${primaryColor}50` : '1px solid transparent',
                    }}
                  >
                    匿名
                  </button>
                  <button
                    onClick={() => setIsAnonymous(false)}
                    className={`px-4 py-1.5 rounded-full text-sm transition-all duration-300 ${
                      !isAnonymous ? 'text-white' : 'text-white/50'
                    }`}
                    style={{
                      background: !isAnonymous ? `${primaryColor}30` : 'transparent',
                      border: !isAnonymous ? `1px solid ${primaryColor}50` : '1px solid transparent',
                    }}
                  >
                    公开
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <Moon className="w-4 h-4" style={{ color: primaryColor }} />
                <span className="text-white/70 text-sm">
                  {isAnonymous ? 'Anonymous Soul' : '你的昵称'}
                </span>
              </div>
              <textarea
                value={echoContent}
                onChange={(e) => setEchoContent(e.target.value)}
                placeholder={isAnonymous ? "在这里说出你的心里话..." : "以真实身份分享..."}
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
                  <Moon className="w-10 h-10 text-amber-400/30 mx-auto mb-4" style={{ color: primaryColor }} />
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
                        <Moon className="w-4 h-4" style={{ color: primaryColor }} />
                        <span className="text-white/60 text-sm">{getDisplayName(share)}</span>
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
                              <Sparkles className="w-3 h-3" style={{ color: primaryColor }} />
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

        {/* 跨信圆桌 Tab */}
        {activeTab === 'roundtable' && !isInRoundtable && (
          <div className="space-y-6" style={{ animation: 'fadeIn 0.3s ease-out' }}>
            {/* 标题区域 */}
            <div className="text-center mb-8" style={{ animation: 'fadeInUp 0.5s ease-out' }}>
              <div className="inline-flex items-center gap-2 mb-4">
                <MessagesSquare className="w-8 h-8" style={{ color: primaryColor }} />
              </div>
              <h2 className="text-white text-xl font-light mb-2">跨信圆桌</h2>
              <p className="text-white/50 text-sm" style={{ animation: 'fadeInUp 0.5s ease-out 0.2s both' }}>
                哲思与信仰的对话场
              </p>
            </div>

            {/* 圆桌列表 */}
            <div className="space-y-4">
              {roundtablesLoading ? (
                <div className="text-center py-10">
                  <Loader2 className="w-8 h-8 text-rose-400/50 animate-spin mx-auto" />
                  <p className="text-white/40 text-sm mt-3">加载中...</p>
                </div>
              ) : roundtables.length === 0 ? (
                <div className="text-center py-10">
                  <MessagesSquare className="w-10 h-10 text-rose-400/30 mx-auto mb-4" style={{ color: primaryColor }} />
                  <p className="text-white/40 text-sm">暂无进行中的圆桌</p>
                  <p className="text-white/30 text-xs mt-2">成为第一个创建者吧</p>
                </div>
              ) : (
                roundtables.map((rt, index) => (
                  <div
                    key={rt.id}
                    className="p-5 rounded-2xl backdrop-blur-md cursor-pointer transition-all duration-300 hover:scale-[1.02]"
                    style={{
                      background: 'rgba(225, 29, 72, 0.08)',
                      border: '1px solid rgba(225, 29, 72, 0.2)',
                      animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`,
                    }}
                    onClick={() => enterRoundtable(rt.id)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-white text-lg font-medium mb-1">{rt.topic}</h3>
                        <p className="text-white/50 text-sm">
                          主持人: {rt.moderator_name || '未知'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            rt.status === 'active'
                              ? 'bg-green-500/20 text-green-400'
                              : rt.status === 'waiting'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}
                        >
                          {rt.status === 'active' ? '进行中' : rt.status === 'waiting' ? '等待开始' : '已结束'}
                        </span>
                        {rt.status !== 'ended' && (
                          <ChevronRight className="w-5 h-5 text-white/30" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-white/40 text-xs">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{rt.participant_count} 方</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        <span>{rt.audience_count} 观众</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{formatTime(rt.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 底部按钮 */}
            <div className="space-y-3 mt-8">
              {/* 申请成为主持人 */}
              <button
                onClick={() => setShowModeratorApplication(true)}
                className="w-full py-4 rounded-2xl backdrop-blur-md text-white font-medium transition-all duration-300 flex items-center justify-center gap-2"
                style={{
                  background: 'rgba(225, 29, 72, 0.1)',
                  border: '1px solid rgba(225, 29, 72, 0.3)',
                }}
              >
                <UserPlus className="w-5 h-5" style={{ color: primaryColor }} />
                <span>申请成为主持人</span>
              </button>

              {/* 创建圆桌（暂时隐藏，后续开放） */}
              {/* 创建圆桌按钮暂时隐藏，后续开放 */}
            </div>

            {/* 底部提示 */}
            <div className="mt-8 text-center">
              <p className="text-white/30 text-xs italic">
                Where wisdom meets across faiths.
              </p>
              <p className="text-white/20 text-xs mt-2">
                哲思与信仰，在对话中相遇
              </p>
            </div>
          </div>
        )}

        {/* 圆桌详情页 */}
        {activeTab === 'roundtable' && isInRoundtable && currentRoundtable && (
          <div className="space-y-6" style={{ animation: 'fadeIn 0.3s ease-out' }}>
            {/* 返回按钮 */}
            <button
              onClick={exitRoundtable}
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">返回圆桌列表</span>
            </button>

            {/* 圆桌信息 */}
            <div
              className="p-5 rounded-2xl backdrop-blur-md"
              style={{
                background: 'rgba(225, 29, 72, 0.08)',
                border: '1px solid rgba(225, 29, 72, 0.2)',
              }}
            >
              <h2 className="text-white text-xl font-medium mb-3">{currentRoundtable.topic}</h2>
              <div className="flex items-center gap-4 text-white/50 text-sm mb-4">
                <span>主持人: {currentRoundtable.moderator_name || '未知'}</span>
                <span className="px-2 py-0.5 rounded-full text-xs"
                  style={{
                    background: currentRoundtable.status === 'active' 
                      ? 'rgba(34, 197, 94, 0.2)' 
                      : currentRoundtable.status === 'waiting'
                      ? 'rgba(234, 179, 8, 0.2)'
                      : 'rgba(156, 163, 175, 0.2)',
                    color: currentRoundtable.status === 'active' 
                      ? '#22c55e' 
                      : currentRoundtable.status === 'waiting'
                      ? '#eab308'
                      : '#9ca3af',
                  }}
                >
                  {currentRoundtable.status === 'active' ? '进行中' : currentRoundtable.status === 'waiting' ? '等待开始' : '已结束'}
                </span>
              </div>

              {/* 参与方列表 */}
              <div className="space-y-2 mb-4">
                <h3 className="text-white/70 text-sm font-medium">参与方 ({roundtableParticipants.length})</h3>
                {roundtableParticipants.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-xl"
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-rose-400/50" />
                      <div>
                        <p className="text-white/90 text-sm">{p.team_name}</p>
                        <p className="text-white/40 text-xs">队长: {p.captain_name || '未知'}</p>
                      </div>
                    </div>
                    <span className="text-white/40 text-xs">{p.member_count - 1} 名队员</span>
                  </div>
                ))}
              </div>

              {/* 当前轮次 */}
              <div className="flex items-center gap-4 text-sm">
                <span className="text-white/50">当前轮次: 第 {currentRoundtable.current_round} 轮</span>
                <span className="text-white/50">发言时间: {currentRoundtable.max_speaking_time}秒</span>
              </div>
            </div>

            {/* 观众提示 */}
            {!isUserParticipant && currentRoundtable.status !== 'ended' && (
              <div
                className="p-4 rounded-xl backdrop-blur-md text-center"
                style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                }}
              >
                <p className="text-blue-300 text-sm">👁️ 您正在旁听</p>
              </div>
            )}

            {/* 发言区域（仅参与者可见） */}
            {isUserParticipant && currentRoundtable.status === 'active' && (
              <div
                className="p-5 rounded-2xl backdrop-blur-md"
                style={{
                  background: 'rgba(34, 197, 94, 0.08)',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white/80 text-sm font-medium">发言区域</h3>
                  <div className="flex items-center gap-2">
                    <Mic className="w-5 h-5" style={{ color: isSpeaking ? '#22c55e' : '#6b7280' }} />
                    <span className={`text-lg font-mono ${isSpeaking ? 'text-green-400' : 'text-white/50'}`}>
                      {formatSpeakingTime(speakingTime)}
                    </span>
                  </div>
                </div>

                <textarea
                  value={speechContent}
                  onChange={(e) => setSpeechContent(e.target.value)}
                  placeholder="在此输入您的发言..."
                  maxLength={500}
                  rows={4}
                  className="w-full bg-white/5 text-white placeholder-white/30 rounded-xl p-3 resize-none focus:outline-none text-sm"
                  style={{
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                  }}
                  disabled={isSpeaking}
                />

                <div className="flex items-center justify-between mt-3">
                  <span className="text-white/30 text-xs">{speechContent.length}/500</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSpeakingTime(currentRoundtable?.max_speaking_time || 60);
                        setIsSpeaking(true);
                      }}
                      disabled={isSpeaking || !speechContent.trim()}
                      className="px-4 py-2 rounded-full text-white text-sm font-medium transition-all duration-300 flex items-center gap-2"
                      style={{
                        background: isSpeaking || !speechContent.trim()
                          ? 'rgba(255, 255, 255, 0.1)'
                          : 'rgba(34, 197, 94, 0.3)',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        opacity: isSpeaking || !speechContent.trim() ? 0.5 : 1,
                      }}
                    >
                      <Mic className="w-4 h-4" />
                      开始发言
                    </button>
                    <button
                      onClick={() => setIsSpeaking(false)}
                      disabled={!isSpeaking}
                      className="px-4 py-2 rounded-full text-white text-sm font-medium transition-all duration-300 flex items-center gap-2"
                      style={{
                        background: isSpeaking
                          ? 'rgba(239, 68, 68, 0.3)'
                          : 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        opacity: isSpeaking ? 1 : 0.5,
                      }}
                    >
                      <MicOff className="w-4 h-4" />
                      结束发言
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 讨论记录 */}
            <div
              className="p-5 rounded-2xl backdrop-blur-md"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <h3 className="text-white/70 text-sm font-medium mb-4">讨论记录</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {roundtableSpeeches.length === 0 ? (
                  <p className="text-white/30 text-sm text-center py-4">暂无发言记录</p>
                ) : (
                  roundtableSpeeches.map((speech, index) => (
                    <div
                      key={speech.id}
                      className="p-3 rounded-xl"
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderLeft: '2px solid rgba(225, 29, 72, 0.3)',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-rose-400 text-sm font-medium">{speech.speaker_name}</span>
                        <span className="text-white/30 text-xs">·</span>
                        <span className="text-white/40 text-xs">第{speech.round_number}轮 · {speech.duration}秒</span>
                      </div>
                      <p className="text-white/80 text-sm leading-relaxed">{speech.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3">
              {/* 举报按钮 */}
              <button
                onClick={() => setShowReportModal(true)}
                className="flex-1 py-3 rounded-xl backdrop-blur-md text-white/70 text-sm transition-all duration-300 flex items-center justify-center gap-2 hover:bg-white/5"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <Flag className="w-4 h-4" />
                <span>举报主持人</span>
              </button>

              {/* 下载按钮（圆桌结束后可用） */}
              {currentRoundtable.status === 'ended' && (
                <button
                  onClick={downloadRoundtableContent}
                  className="flex-1 py-3 rounded-xl backdrop-blur-md text-white text-sm transition-all duration-300 flex items-center justify-center gap-2"
                  style={{
                    background: `rgba(225, 29, 72, 0.2)`,
                    border: `1px solid rgba(225, 29, 72, 0.3)`,
                  }}
                >
                  <Download className="w-4 h-4" />
                  <span>下载讨论内容</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 主持人申请弹窗 */}
      {showModeratorApplication && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">申请成为主持人</h3>
              <button
                onClick={() => setShowModeratorApplication(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* 昵称 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  昵称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={moderatorForm.nickname}
                  onChange={(e) => setModeratorForm({ ...moderatorForm, nickname: e.target.value })}
                  placeholder="请输入您的昵称"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              </div>

              {/* 个人简介 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  个人简介
                </label>
                <textarea
                  value={moderatorForm.bio}
                  onChange={(e) => setModeratorForm({ ...moderatorForm, bio: e.target.value })}
                  placeholder="简单介绍一下自己（可选）"
                  maxLength={200}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
                />
                <p className="text-gray-400 text-xs mt-1">{moderatorForm.bio.length}/200</p>
              </div>

              {/* 申请理由 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  申请理由 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={moderatorForm.reason}
                  onChange={(e) => setModeratorForm({ ...moderatorForm, reason: e.target.value })}
                  placeholder="为什么想成为主持人？"
                  maxLength={500}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
                />
                <p className="text-gray-400 text-xs mt-1">{moderatorForm.reason.length}/500</p>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                  {error}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowModeratorApplication(false);
                  setModeratorForm({ nickname: '', bio: '', reason: '' });
                  setError('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={submitModeratorApplication}
                disabled={submittingApplication}
                className="px-4 py-2 bg-rose-500 text-white hover:bg-rose-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {submittingApplication && <Loader2 className="w-4 h-4 animate-spin" />}
                提交申请
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 举报弹窗 */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">举报主持人</h3>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div
                className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 mb-4"
              >
                <div className="flex items-center gap-2 text-yellow-800 mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">举报须知</span>
                </div>
                <p className="text-yellow-700 text-sm">
                  如果您认为主持人在圆桌讨论中存在偏袒或其他违规行为，请在此举报。管理员会尽快审核处理。
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  举报原因 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="请详细描述举报原因..."
                  maxLength={500}
                  rows={5}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
                />
                <p className="text-gray-400 text-xs mt-1">{reportReason.length}/500</p>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                  {error}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowReportModal(false);
                  setReportReason('');
                  setError('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={submitReport}
                className="px-4 py-2 bg-rose-500 text-white hover:bg-rose-600 rounded-lg transition-colors flex items-center gap-2"
              >
                <Flag className="w-4 h-4" />
                提交举报
              </button>
            </div>
          </div>
        </div>
      )}

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
