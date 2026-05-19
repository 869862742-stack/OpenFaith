import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { useAuthStore } from '../stores/auth';
import { checkBadWords } from '../utils/badWordFilter';
import { getTagNames } from '../services/tagService';

const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';

// Fallback 笔记标签
const FALLBACK_NOTE_TAGS = [
  '基督教', '伊斯兰教', '犹太教', '佛教', '印度教', '道教', '锡克教',
  '巴哈伊教', '摩门教', '耶和华见证人', '琐罗亚斯德教', '诺斯替',
  '卡巴拉', '神道教', '耆那教', '德鲁兹教', '约鲁巴教', '伏都教',
  '雅兹迪', '曼达安', '玛雅/阿兹特克', '毛利宗教', '天理教', '天道教',
  '高台教'
];

// 从 profiles 获取每日笔记限制信息
interface DailyNoteLimit {
  daily_note_count: number;
  daily_note_date: string | null;
  extra_note_granted: number;
}

async function fetchDailyNoteLimit(userId: string): Promise<DailyNoteLimit | null> {
  try {
    const res = await fetch(
      `/sb-api/rest/v1/profiles?user_id=eq.${userId}&select=daily_note_count,daily_note_date,extra_note_granted`,
      {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        }
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.[0] ?? null;
  } catch {
    return null;
  }
}

function PublishNote() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 游客登录检查
  useEffect(() => {
    const auth = useAuthStore.getState();
    const token = auth.currentToken();
    const userId = auth.userInfo?.id;
    if (!token || !userId) {
      window.location.hash = '/login';
    }
  }, []);

  // 加载笔记标签
  useEffect(() => {
    const loadTags = async () => {
      try {
        const tags = await getTagNames('post');
        if (tags && tags.length > 0) {
          setNoteTags(tags);
        }
      } catch (error) {
        console.error('Failed to load post tags:', error);
      }
    };
    loadTags();
  }, []);

  const [images, setImages] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [noteTags, setNoteTags] = useState<string[]>(FALLBACK_NOTE_TAGS);
  const [showTagModal, setShowTagModal] = useState(false);
  const [customTag, setCustomTag] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  // ---- 每日笔记限制相关状态 ----
  const [showLimitModal, setShowLimitModal] = useState(false);    // "已达上限"弹窗
  const [showRequestModal, setShowRequestModal] = useState(false); // 申请表单弹窗
  const [requestReason, setRequestReason] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false); // 申请提交后提示

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).slice(0, 9 - images.length).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImages(prev => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const addCustomTag = () => {
    if (customTag && !selectedTags.includes(customTag)) {
      setSelectedTags(prev => [...prev, customTag]);
      setCustomTag('');
    }
  };

  // 检查是否使用了额外额度
  const checkUsedExtraGrant = async (userId: string): Promise<boolean> => {
    const limit = await fetchDailyNoteLimit(userId);
    if (!limit) return false;
    return limit.daily_note_count > 0 && limit.extra_note_granted > 0;
  };

  // 每日笔记限制检查
  const checkDailyNoteLimit = async (): Promise<{ allowed: boolean; usedExtra?: boolean }> => {
    const auth = useAuthStore.getState();
    const userId = auth.userInfo?.id;
    if (!userId) return { allowed: false };

    const limit = await fetchDailyNoteLimit(userId);
    const today = new Date().toISOString().split('T')[0];

    // 日期不同 → 重置计数（不写回服务端，由服务端触发器或应用层处理）
    if (limit && limit.daily_note_date !== today) {
      // 今天第一次发布，直接放行
      return { allowed: true };
    }

    // 检查是否已达上限
    const maxCount = 1 + (limit?.extra_note_granted ?? 0);
    if (limit && limit.daily_note_count >= maxCount) {
      return { allowed: false };
    }

    return { allowed: true };
  };

  // 提交申请
  const submitNoteRequest = async () => {
    if (!requestReason.trim()) {
      alert('请填写申请理由');
      return;
    }
    setIsSubmittingRequest(true);
    try {
      const auth = useAuthStore.getState();
      const userId = auth.userInfo?.id;
      if (!userId) {
        alert('请先登录');
        return;
      }

      const res = await fetch('/sb-api/rest/v1/note_requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          user_id: userId,
          reason: requestReason.trim(),
          status: 'pending',
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || '提交失败');
      }

      setShowRequestModal(false);
      setRequestSubmitted(true);
      setRequestReason('');
    } catch (err: any) {
      alert(`提交失败: ${err.message}`);
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // 添加经验值的辅助函数 - 支持每日上限
  const EXP_KEY = 'of_exp_today';
  const VIP_MULTIPLIER = 2;
  const MAX_PUBLISH_PER_DAY = 3;

  const getTodayStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const stored = localStorage.getItem(EXP_KEY);
    if (!stored) return { date: today, publish: 0, heat_given: 0, comment_made: 0, comment_received: 0, collected: 0, collected_by_others: 0, shared: 0 };
    const stats = JSON.parse(stored);
    if (stats.date !== today) return { date: today, publish: 0, heat_given: 0, comment_made: 0, comment_received: 0, collected: 0, collected_by_others: 0, shared: 0 };
    return stats;
  };

  const saveTodayStats = (stats: any) => {
    localStorage.setItem(EXP_KEY, JSON.stringify(stats));
  };

  const addExperience = async (userId: string, baseAmount: number, type: 'publish' | 'heat_given' | 'comment_made' | 'comment_received' = 'publish') => {
    try {
      const userInfo = localStorage.getItem('user_info');
      if (!userInfo) return;

      const parsed = JSON.parse(userInfo);
      const profileId = parsed.id || userId;

      // 检查每日上限
      const stats = getTodayStats();
      const maxLimits: Record<string, number> = {
        publish: MAX_PUBLISH_PER_DAY,
        heat_given: 10,
        comment_made: 20,
        comment_received: 15,
        collected: 10,
        collected_by_others: 20,
        shared: 5,
      };
      
      if ((stats[type] || 0) >= maxLimits[type]) {
        console.log(`[PublishNote] 今日${type}已达上限`);
        return;
      }

      // 获取当前 profile 数据
      const response = await fetch(
        `/sb-api/rest/v1/profiles?user_id=eq.${profileId}&select=experience,level,is_vip`,
        {
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const profile = data[0];
          // VIP 用户经验加成 2 倍（向上取整）
          const multiplier = profile.is_vip ? VIP_MULTIPLIER : 1;
          const expAmount = Math.ceil(baseAmount * multiplier);
          const newExp = (profile.experience || 0) + expAmount;
          const newLevel = Math.min(
            (() => {
              const LEVEL_THRESHOLDS = [0, 1000, 5000, 25000, 125000, 250000, 500000, 1000000, 2000000, 5000000];
              for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
                if (newExp >= LEVEL_THRESHOLDS[i]) return i + 1;
              }
              return 1;
            })(), 10
          );

          // 更新经验值和等级
          await fetch(
            `/sb-api/rest/v1/profiles?user_id=eq.${profileId}`,
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SERVICE_ROLE_KEY,
                'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
              },
              body: JSON.stringify({
                experience: newExp,
                level: newLevel,
              }),
            }
          );

          // 更新每日统计
          stats[type] = (stats[type] || 0) + 1;
          saveTodayStats(stats);

          console.log(`[PublishNote] Added ${expAmount} exp (base: ${baseAmount}, multiplier: ${multiplier}, ${type}: ${stats[type]}/${maxLimits[type]})`);
        }
      }
    } catch (err) {
      console.error('[PublishNote] addExperience error:', err);
    }
  };

  // 发布成功后更新每日笔记计数
  const updateDailyNoteCount = async (userId: string, usedExtra: boolean) => {
    const today = new Date().toISOString().split('T')[0];
    const patchBody: Record<string, any> = {
      daily_note_count: 1, // 增量由服务端计算，这里传增量值
      daily_note_date: today,
    };
    // 获取当前值再+1
    const limit = await fetchDailyNoteLimit(userId);
    if (!limit) return;
    patchBody.daily_note_count = (limit.daily_note_count || 0) + 1;
    if (usedExtra && limit.extra_note_granted > 0) {
      patchBody.extra_note_granted = limit.extra_note_granted - 1;
    }
    await fetch(
      `/sb-api/rest/v1/profiles?user_id=eq.${userId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify(patchBody),
      }
    );
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      alert('请填写标题');
      return;
    }
    
    // ========== 违规词检测 ==========
    const currentLang = localStorage.getItem('openfaith-language') || 'zh-CN';
    
    // 检查标题
    const titleFilterResult = checkBadWords(title.trim(), currentLang);
    if (titleFilterResult.hasViolation) {
      alert(`标题${titleFilterResult.message || '包含违规词汇，请修改后重新发布'}`);
      return;
    }
    
    // 检查内容
    const contentFilterResult = checkBadWords(content.trim(), currentLang);
    if (contentFilterResult.hasViolation) {
      alert(`内容${contentFilterResult.message || '包含违规词汇，请修改后重新发布'}`);
      return;
    }
    // =================================
    
    // ---- 每日笔记限制检查 ----
    const auth = useAuthStore.getState();
    const userId = auth.userInfo?.id;
    if (!userId) {
      alert('请先登录');
      navigate('/login');
      return;
    }

    const { allowed } = await checkDailyNoteLimit();
    if (!allowed) {
      setShowLimitModal(true);
      return;
    }

    // 判断是否使用了额外额度（如果今天已有发布且有额外额度，说明用了）
    const limitBefore = await fetchDailyNoteLimit(userId);
    const usedExtra = limitBefore
      ? (limitBefore.daily_note_count > 0 && limitBefore.extra_note_granted > 0)
      : false;

    setIsPublishing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      
      if (!user) {
        alert('请先登录');
        navigate('/login');
        return;
      }

      // 使用 Supabase SDK 发布笔记（需要审核）
      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          title: title.trim(),
          content: content.trim(),
          cover_image: images[0] || null,
          images: images.length > 0 ? images : [],
          tags: selectedTags.length > 0 ? selectedTags : [],
          status: 'pending',
        })
        .select()
        .single();
      
      if (error) {
        throw new Error(error.message);
      }
      
      // 发布成功后添加经验值
      await addExperience(user.id, 10, 'publish');
      
      // 更新每日笔记计数
      await updateDailyNoteCount(user.id, usedExtra);
      
      alert('发布成功！等待审核后将在首页显示\n\n+10 经验值（发布笔记）');
      navigate('/');
    } catch (err: any) {
      console.error(err);
      alert(`发布失败: ${err.message || '请重试'}`);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: 'var(--bg-color)' }}>
      {/* Header */}
      <div 
        className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between backdrop-blur-md"
        style={{ backgroundColor: 'var(--bg-color)/90' }}
      >
        <button 
          onClick={() => navigate(-1)}
          className="p-2 -ml-2"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--text-color)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="font-bold" style={{ color: 'var(--text-color)' }}>发布笔记</h1>
        <button
          onClick={handlePublish}
          disabled={isPublishing || !title.trim()}
          className="px-4 py-1.5 rounded-full text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: '#2563EB', color: 'white' }}
        >
          {isPublishing ? '发布中...' : '发布'}
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* 图片上传 */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((img, idx) => (
            <div key={idx} className="relative flex-shrink-0">
              <img 
                src={img} 
                alt="" 
                className="w-24 h-24 object-cover rounded-xl"
              />
              <button
                onClick={() => removeImage(idx)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          {images.length < 9 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 flex-shrink-0 rounded-xl border-2 border-dashed flex items-center justify-center"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        {/* 标题 */}
        <div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="添加标题会有更多赞哦~"
            className="w-full text-lg font-bold bg-transparent outline-none"
            style={{ color: 'var(--text-color)' }}
          />
        </div>

        {/* 内容 */}
        <div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="分享你的信仰故事..."
            rows={8}
            className="w-full bg-transparent outline-none resize-none"
            style={{ color: 'var(--text-color)' }}
          />
        </div>

        {/* 标签 */}
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 rounded-full text-sm"
              style={{ backgroundColor: '#2563EB', color: 'white' }}
            >
              #{tag}
              <button
                onClick={() => toggleTag(tag)}
                className="ml-1"
              >
                ×
              </button>
            </span>
          ))}
          <button
            onClick={() => setShowTagModal(true)}
            className="px-3 py-1 rounded-full text-sm border"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
          >
            + 添加标签
          </button>
        </div>
      </div>

      {/* 标签选择弹窗 */}
      {showTagModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end z-50"
          onClick={() => setShowTagModal(false)}
        >
          <div
            className="w-full rounded-t-2xl p-4 max-h-[70vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--card-bg)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold" style={{ color: 'var(--text-color)' }}>选择标签</h3>
              <button onClick={() => setShowTagModal(false)}>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--text-color)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 自定义标签 */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                placeholder="输入自定义标签"
                className="flex-1 px-3 py-2 rounded-lg border outline-none"
                style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-color)' }}
                onKeyPress={(e) => e.key === 'Enter' && addCustomTag()}
              />
              <button
                onClick={addCustomTag}
                className="px-4 py-2 rounded-lg font-medium"
                style={{ backgroundColor: '#2563EB', color: 'white' }}
              >
                添加
              </button>
            </div>

            {/* 预设标签 */}
            <div className="flex flex-wrap gap-2">
              {noteTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    selectedTags.includes(tag) ? 'text-white' : ''
                  }`}
                  style={{
                    backgroundColor: selectedTags.includes(tag) ? '#2563EB' : 'var(--bg-secondary)',
                    color: selectedTags.includes(tag) ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowTagModal(false)}
              className="w-full mt-4 py-3 rounded-xl font-medium"
              style={{ backgroundColor: '#2563EB', color: 'white' }}
            >
              确定 ({selectedTags.length})
            </button>
          </div>
        </div>
      )}

      {/* ============================================================
          每日笔记限制提示弹窗
      ============================================================ */}
      {showLimitModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowLimitModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 text-center"
            style={{ backgroundColor: 'var(--card-bg)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 图标 */}
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#2563EB/10' }}>
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="#2563EB" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            {requestSubmitted ? (
              // 申请已提交提示
              <>
                <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--text-color)' }}>
                  申请已提交
                </h3>
                <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                  管理员审核通过后，你会收到通知消息
                </p>
                <button
                  onClick={() => {
                    setShowLimitModal(false);
                    setRequestSubmitted(false);
                  }}
                  className="w-full py-3 rounded-xl font-medium"
                  style={{ backgroundColor: '#2563EB', color: 'white' }}
                >
                  我知道了
                </button>
              </>
            ) : (
              // 达限提示
              <>
                <h3 className="font-bold text-lg mb-2" style={{ color: 'var(--text-color)' }}>
                  今日笔记已达上限
                </h3>
                <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                  每天只能发布一条笔记哦
                </p>
                <button
                  onClick={() => {
                    setShowLimitModal(false);
                    setShowRequestModal(true);
                    setRequestReason('');
                  }}
                  className="w-full py-3 rounded-xl font-medium mb-3"
                  style={{ backgroundColor: '#2563EB', color: 'white' }}
                >
                  申请再发一条
                </button>
                <button
                  onClick={() => setShowLimitModal(false)}
                  className="w-full py-3 rounded-xl font-medium"
                  style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                >
                  我知道了
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          申请再发一条表单弹窗
      ============================================================ */}
      {showRequestModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowRequestModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6"
            style={{ backgroundColor: 'var(--card-bg)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold" style={{ color: 'var(--text-color)' }}>申请再发一条</h3>
              <button onClick={() => setShowRequestModal(false)}>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--text-secondary)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              请填写申请理由，管理员审核通过后可获得额外发布机会
            </p>

            <textarea
              value={requestReason}
              onChange={(e) => setRequestReason(e.target.value)}
              placeholder="请输入申请理由..."
              rows={4}
              className="w-full px-3 py-3 rounded-xl border outline-none resize-none text-sm"
              style={{
                borderColor: 'var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-color)',
              }}
            />

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowRequestModal(false)}
                className="flex-1 py-3 rounded-xl font-medium"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
              >
                取消
              </button>
              <button
                onClick={submitNoteRequest}
                disabled={isSubmittingRequest || !requestReason.trim()}
                className="flex-1 py-3 rounded-xl font-medium disabled:opacity-50"
                style={{ backgroundColor: '#2563EB', color: 'white' }}
              >
                {isSubmittingRequest ? '提交中...' : '提交申请'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PublishNote;
