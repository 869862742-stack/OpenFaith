import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../supabase/client';
import { useThemeContext } from '../contexts/ThemeContext';
import { getTagNames } from '../services/tagService';

// Fallback 群聊标签
const FALLBACK_GROUP_TAGS = [
  '基督教', '伊斯兰教', '犹太教', '佛教', '印度教', '道教', '锡克教',
  '巴哈伊教', '摩门教', '耶和华见证人', '琐罗亚斯德教', '诺斯替',
  '卡巴拉', '神道教', '耆那教', '德鲁兹教', '约鲁巴教', '伏都教',
  '雅兹迪', '曼达安', '玛雅/阿兹特克', '毛利宗教', '天理教', '天道教',
  '高台教'
];

function AddGroup() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { primaryColor } = useThemeContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [customTag, setCustomTag] = useState('');
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('search');
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [groupTags, setGroupTags] = useState<string[]>(FALLBACK_GROUP_TAGS);

  // 夜间模式颜色
  const bgColor = 'var(--bg-color)';
  const cardBg = 'var(--card-bg)';
  const cardBgSecondary = 'var(--bg-secondary)';
  const textColor = 'var(--text-color)';
  const textSecondary = 'var(--text-secondary)';
  const borderColor = 'var(--border-color)';

  // 加载群聊标签
  useEffect(() => {
    const loadTags = async () => {
      try {
        const tags = await getTagNames('group');
        if (tags && tags.length > 0) {
          setGroupTags(tags);
        }
      } catch (error) {
        console.error('Failed to load group tags:', error);
      }
    };
    loadTags();
  }, []);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const addCustomTag = () => {
    if (!customTag.trim()) return;
    if (customTags.includes(customTag.trim()) || selectedTags.includes(customTag.trim())) {
      alert(t('common.tagAlreadyAdded'));
      return;
    }
    setCustomTags(prev => [...prev, customTag.trim()]);
    setSelectedTags(prev => [...prev, customTag.trim()]);
    setCustomTag('');
  };

  const handleSearch = () => {
    if (searchQuery) {
      alert(`${t('common.searchGroup')}: ${searchQuery}`);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      alert(t('common.pleaseEnterName'));
      return;
    }
    if (selectedTags.length === 0) {
      alert(t('common.pleaseSelectTag'));
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      
      if (!user) {
        alert(t('common.pleaseLogin'));
        navigate('/login');
        return;
      }

      // 检查是否有自定义标签
      const customSelectedTags = selectedTags.filter(tag => !groupTags.includes(tag));
      
      // Service Role Key 用于写入 tag_requests
      const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';
      
      // 首先写入 posts 表创建群聊记录（用 __group_chat__ 标签标记）
      const groupPost = {
        id: crypto.randomUUID(),
        user_id: user.id,
        title: groupName.trim(),
        content: groupDesc.trim(),
        tags: ['__group_chat__', `member_${user.id}`, ...selectedTags],
        status: 'published', // 直接发布，无需审核
        created_at: new Date().toISOString(),
        likes_count: 0,
        heat_count: 0,
        comments_count: 0,
      };

      const postRes = await fetch('/sb-api/rest/v1/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(groupPost),
      });

      if (!postRes.ok) {
        const errText = await postRes.text();
        throw new Error(`创建群聊失败: ${errText}`);
      }
      
      alert(`群聊「${groupName}」创建成功！`);
      
      // 延迟3秒后跳转
      setTimeout(() => {
        navigate('/messages');
      }, 3000);
    } catch (err: any) {
      console.error(err);
      alert(`${t('common.submitFailed')}${err.message ? ': ' + err.message : ''}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen theme-transition" style={{ backgroundColor: bgColor }}>
      <header 
        className="sticky top-0 z-40 px-4 py-3 border-b flex items-center gap-3 theme-transition" 
        style={{ backgroundColor: bgColor, borderColor }}
      >
        <button onClick={() => navigate(-1)} className="p-2 -ml-2" style={{ color: textColor }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-bold theme-transition" style={{ color: textColor }}>{t('sidebar.addGroup') || '添加群聊'}</h1>
      </header>

      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setActiveTab('search')}
            className="flex-1 h-10 rounded-xl text-sm font-medium transition-colors"
            style={{
              backgroundColor: activeTab === 'search' ? primaryColor : cardBgSecondary,
              color: activeTab === 'search' ? '#FFFFFF' : textSecondary
            }}
          >
            {t('common.searchGroup') || '搜索群聊'}
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className="flex-1 h-10 rounded-xl text-sm font-medium transition-colors"
            style={{
              backgroundColor: activeTab === 'create' ? primaryColor : cardBgSecondary,
              color: activeTab === 'create' ? '#FFFFFF' : textSecondary
            }}
          >
            {t('common.createGroup') || '创建群聊'}
          </button>
        </div>

        {activeTab === 'search' && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <div 
                className="flex-1 flex items-center h-11 px-4 rounded-xl theme-transition" 
                style={{ backgroundColor: cardBgSecondary }}
              >
                <svg className="w-4 h-4 mr-2 theme-transition" style={{ color: textSecondary }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('common.searchGroupPlaceholder') || '搜索群名或群ID'}
                  className="flex-1 bg-transparent text-sm outline-none theme-transition"
                  style={{ color: textColor }}
                />
              </div>
              <button
                onClick={handleSearch}
                className="px-4 h-11 rounded-xl text-sm font-medium text-white"
                style={{ backgroundColor: primaryColor }}
              >
                {t('common.search')}
              </button>
            </div>

            <div className="text-center py-12">
              <p className="text-sm theme-transition" style={{ color: textSecondary }}>
                {t('common.noData') || '暂无群聊'}
              </p>
            </div>
          </>
        )}

        {activeTab === 'create' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 theme-transition" style={{ color: textColor }}>
                {t('common.groupName') || '群聊名称'}
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder={t('common.groupNamePlaceholder') || '请输入群聊名称'}
                className="w-full h-11 px-4 rounded-xl text-sm outline-none theme-transition"
                style={{ 
                  backgroundColor: cardBgSecondary, 
                  color: textColor,
                  borderColor: borderColor,
                  border: '1px solid'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 theme-transition" style={{ color: textColor }}>
                {t('common.groupDesc') || '群聊描述'}
              </label>
              <textarea
                value={groupDesc}
                onChange={(e) => setGroupDesc(e.target.value)}
                placeholder={t('common.groupDescPlaceholder') || '请输入群聊描述（选填）'}
                rows={3}
                className="w-full p-4 rounded-xl text-sm outline-none resize-none theme-transition"
                style={{ 
                  backgroundColor: cardBgSecondary, 
                  color: textColor,
                  borderColor: borderColor,
                  border: '1px solid'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 theme-transition" style={{ color: textColor }}>
                {t('common.selectTags') || '选择标签'}
              </label>
              <div className="flex flex-wrap gap-2">
                {groupTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className="px-3 py-1.5 rounded-full text-xs transition-colors"
                    style={{
                      backgroundColor: selectedTags.includes(tag) ? `${primaryColor}1A` : cardBgSecondary,
                      color: selectedTags.includes(tag) ? primaryColor : textSecondary
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {customTags.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2 theme-transition" style={{ color: textColor }}>
                  {t('common.customTags') || '自定义标签'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {customTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className="px-3 py-1.5 rounded-full text-xs transition-colors"
                      style={{
                        backgroundColor: selectedTags.includes(tag) ? primaryColor : `${primaryColor}1A`,
                        color: selectedTags.includes(tag) ? '#FFFFFF' : primaryColor
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2 theme-transition" style={{ color: textColor }}>
                {t('common.addCustomTag') || '添加自定义标签'}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
                  placeholder={t('common.enterCustomTag') || '输入标签名称'}
                  className="flex-1 px-3 py-2 rounded-lg border text-sm theme-transition"
                  style={{ borderColor, color: textColor }}
                />
                <button
                  onClick={addCustomTag}
                  disabled={!customTag.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  style={{ 
                    backgroundColor: customTag.trim() ? primaryColor : 'transparent',
                    color: customTag.trim() ? '#FFFFFF' : textSecondary,
                    border: `1px solid ${customTag.trim() ? primaryColor : borderColor}`
                  }}
                >
                  {t('common.add') || '添加'}
                </button>
              </div>
            </div>

            <button
              onClick={handleCreateGroup}
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl text-sm font-medium text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {isSubmitting ? (t('common.submitting') || '提交中...') : (t('common.submit') || '提交申请')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AddGroup;
