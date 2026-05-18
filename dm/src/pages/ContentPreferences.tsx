import React, { useState } from 'react';

import { ArrowLeft, Plus, X, Edit3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const defaultTags = [
  '基督教', '伊斯兰教', '犹太教', '佛教', '印度教', '道教', '锡克教',
  '巴哈伊教', '摩门教', '耶和华见证人', '琐罗亚斯德教', '诺斯替',
  '卡巴拉', '神道教', '耆那教', '德鲁兹教', '约鲁巴教', '伏都教',
  '雅兹迪', '曼达安', '玛雅/阿兹特克', '毛利宗教', '天理教', '天道教',
  '高台教'
];

function ContentPreferences() {
  const navigate = useNavigate();
  const [preferredTags, setPreferredTags] = useState<string[]>(['基督教', '佛教']);
  const [blockedTags, setBlockedTags] = useState<string[]>([]);
  const [showAddPreferred, setShowAddPreferred] = useState(false);
  const [showAddBlocked, setShowAddBlocked] = useState(false);
  const [newTag, setNewTag] = useState('');

  const removePreferredTag = (tag: string) => {
    setPreferredTags(prev => prev.filter(t => t !== tag));
  };

  const removeBlockedTag = (tag: string) => {
    setBlockedTags(prev => prev.filter(t => t !== tag));
  };

  const addPreferredTag = (tag: string) => {
    if (tag && !preferredTags.includes(tag)) {
      setPreferredTags(prev => [...prev, tag]);
    }
    setNewTag('');
    setShowAddPreferred(false);
  };

  const addBlockedTag = (tag: string) => {
    if (tag && !blockedTags.includes(tag)) {
      setBlockedTags(prev => [...prev, tag]);
    }
    setNewTag('');
    setShowAddBlocked(false);
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 bg-white px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft className="w-5 h-5 text-[#1E293B]" />
        </button>
        <h1 className="text-lg font-bold text-[#1E293B]">内容与偏好</h1>
      </header>

      <div className="p-4">
        <div
          className="bg-white rounded-xl border border-gray-100 p-4 mb-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 bg-[#E11D48] rounded-full" />
            <h2 className="text-sm font-bold text-[#1E293B]">偏好标签</h2>
          </div>
          <p className="text-xs text-[#94A3B8] mb-3">我们会为您优先推荐您感兴趣的学习内容</p>

          <div className="flex gap-2 flex-wrap mb-3">
            {preferredTags.map(tag => (
              <span
                key={tag}
                className="px-3 py-1.5 bg-[#FEF2F2] text-[#E11D48] text-xs rounded-full flex items-center gap-1 border border-[#E11D48]/20"
              >
                {tag}
                <button onClick={() => removePreferredTag(tag)} className="ml-1 hover:bg-[#E11D48]/10 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          <button
            onClick={() => setShowAddPreferred(true)}
            className="w-full h-10 bg-[#FEF2F2] rounded-xl flex items-center justify-center gap-2 text-[#E11D48] text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            管理与添加偏好
          </button>
        </div>

        <div
          className="bg-white rounded-xl border border-gray-100 p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 bg-[#E11D48] rounded-full" />
            <h2 className="text-sm font-bold text-[#1E293B]">屏蔽标签</h2>
          </div>
          <p className="text-xs text-[#94A3B8] mb-3">被屏蔽的标签内容将不会出现在您的推荐中</p>

          {blockedTags.length === 0 ? (
            <div className="h-16 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center mb-3">
              <span className="text-xs text-[#94A3B8]">暂无屏蔽标签</span>
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap mb-3">
              {blockedTags.map(tag => (
                <span
                  key={tag}
                  className="px-3 py-1.5 bg-gray-100 text-[#64748B] text-xs rounded-full flex items-center gap-1 border border-gray-200"
                >
                  {tag}
                  <button onClick={() => removeBlockedTag(tag)} className="ml-1 hover:bg-gray-200 rounded-full p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <button
            onClick={() => setShowAddBlocked(true)}
            className="w-full h-10 border border-gray-200 rounded-xl flex items-center justify-center gap-2 text-[#64748B] text-sm font-medium"
          >
            <Edit3 className="w-4 h-4" />
            管理与添加屏蔽
          </button>
        </div>
      </div>

      {(showAddPreferred || showAddBlocked) && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end"
          onClick={() => {
            setShowAddPreferred(false);
            setShowAddBlocked(false);
            setNewTag('');
          }}
        >
          <div
            className="w-full bg-white rounded-t-2xl p-6 max-h-[70vh]"
            onClick={(e) => e.stopPropagation()}
          >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#1E293B]">
                  {showAddPreferred ? '添加偏好标签' : '添加屏蔽标签'}
                </h3>
                <button onClick={() => {
                  setShowAddPreferred(false);
                  setShowAddBlocked(false);
                  setNewTag('');
                }}>
                  <X className="w-5 h-5 text-[#64748B]" />
                </button>
              </div>

              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="输入标签名称"
                  className="flex-1 h-11 px-4 rounded-xl border border-gray-200 text-sm focus:border-[#E11D48] focus:outline-none"
                />
                <button
                  onClick={() => {
                    if (showAddPreferred) {
                      addPreferredTag(newTag);
                    } else {
                      addBlockedTag(newTag);
                    }
                  }}
                  className="px-5 h-11 bg-[#E11D48] text-white rounded-xl text-sm font-medium"
                >
                  添加
                </button>
              </div>

              <p className="text-sm text-[#64748B] mb-2">推荐标签</p>
              <div className="flex gap-2 flex-wrap max-h-40 overflow-y-auto p-2 bg-gray-50 rounded-xl">
                {defaultTags.filter(t =>
                  showAddPreferred
                    ? !preferredTags.includes(t)
                    : !blockedTags.includes(t)
                ).map(tag => (
                  <button
                    key={tag}
                    onClick={() => {
                      if (showAddPreferred) {
                        addPreferredTag(tag);
                      } else {
                        addBlockedTag(tag);
                      }
                    }}
                    className="px-3 py-1.5 bg-white text-[#1E293B] text-xs rounded-full border border-gray-200 hover:border-[#E11D48] hover:text-[#E11D48] transition-colors shadow-sm"
                  >
                    {tag}
                  </button>
                ))}
              </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContentPreferences;
