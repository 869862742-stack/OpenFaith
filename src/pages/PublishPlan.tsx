import React, { useState, useEffect } from 'react';

import { ArrowLeft, Clock, Calendar, X, Users, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';

const faithTags = [
  '基督教', '伊斯兰教', '犹太教', '佛教', '印度教', '道教', '锡克教',
  '巴哈伊教', '摩门教', '耶和华见证人', '琐罗亚斯德教', '诺斯替',
  '卡巴拉', '神道教', '耆那教', '德鲁兹教', '约鲁巴教', '伏都教',
  '雅兹迪', '曼达安', '玛雅/阿兹特克', '毛利宗教', '天理教', '天道教',
  '高台教'
];

function PublishPlan() {
  const navigate = useNavigate();
  const [planName, setPlanName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagModal, setShowTagModal] = useState(false);
  const [customTag, setCustomTag] = useState('');
  const [enableCheckIn, setEnableCheckIn] = useState(true);
  const [isPublic, setIsPublic] = useState(true);

  // 游客登录检查
  useEffect(() => {
    const auth = useAuthStore.getState();
    const token = auth.currentToken();
    const userId = auth.userInfo?.id;
    if (!token || !userId) {
      window.location.hash = '/login';
    }
  }, []);

  const removeTag = (tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
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

  const handlePublish = () => {
    if (!planName) {
      alert('请填写计划名称');
      return;
    }
    alert('学习计划创建成功！');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 bg-white px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft className="w-5 h-5 text-[#1E293B]" />
        </button>
        <h1 className="text-lg font-bold text-[#1E293B]">发起计划</h1>
        <button onClick={handlePublish} className="px-4 py-1.5 bg-[#2563EB] text-white text-sm rounded-full">发起</button>
      </header>

      <div className="p-4 space-y-4">
        <div>
          <p className="text-sm text-[#64748B] mb-2">计划名称</p>
          <input
            type="text"
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            placeholder="例如：每日晨间冥想30分钟"
            className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm focus:border-[#2563EB] focus:outline-none"
          />
        </div>

        <div>
          <p className="text-sm text-[#64748B] mb-2">日期</p>
          <div className="flex items-center gap-2 h-12 px-4 rounded-xl border border-gray-200">
            <Calendar className="w-4 h-4 text-[#94A3B8]" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="flex-1 text-sm focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-[#64748B] mb-2">开始时间</p>
            <div className="flex items-center gap-2 h-12 px-4 rounded-xl border border-gray-200">
              <Clock className="w-4 h-4 text-[#94A3B8]" />
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="flex-1 text-sm focus:outline-none"
              />
            </div>
          </div>
          <div>
            <p className="text-sm text-[#64748B] mb-2">结束时间</p>
            <div className="flex items-center gap-2 h-12 px-4 rounded-xl border border-gray-200">
              <Clock className="w-4 h-4 text-[#94A3B8]" />
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="flex-1 text-sm focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm text-[#64748B] mb-2">话题标签</p>
          <button
            onClick={() => setShowTagModal(true)}
            className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm text-[#64748B] flex items-center justify-between"
          >
            <span>{selectedTags.length > 0 ? `已选 ${selectedTags.length} 个标签` : '选择标签'}</span>
            <span className="text-[#2563EB]">+</span>
          </button>
          {selectedTags.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {selectedTags.map(tag => (
                <span key={tag} className="relative px-3 py-1 bg-[#2563EB]/10 text-[#2563EB] text-xs rounded-full flex items-center gap-1">
                  {tag}
                  <button 
                    onClick={() => removeTag(tag)}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-[#2563EB] rounded-full flex items-center justify-center text-white text-[10px]"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-sm text-[#64748B] mb-2">计划描述</p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="描述你的计划目标、内容安排..."
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-[#2563EB] focus:outline-none resize-none"
          />
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-[#2563EB]" />
            <span className="text-sm text-[#1E293B]">开启打卡功能</span>
          </div>
          <button
            onClick={() => setEnableCheckIn(!enableCheckIn)}
            className={`w-12 h-6 rounded-full transition-colors ${enableCheckIn ? 'bg-[#2563EB]' : 'bg-gray-300'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${enableCheckIn ? 'translate-x-6' : 'translate-x-0.5'} mt-0.5`} />
          </button>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#2563EB]" />
            <span className="text-sm text-[#1E293B]">允许他人参与</span>
          </div>
          <button
            onClick={() => setIsPublic(!isPublic)}
            className={`w-12 h-6 rounded-full transition-colors ${isPublic ? 'bg-[#2563EB]' : 'bg-gray-300'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white transition-transform ${isPublic ? 'translate-x-6' : 'translate-x-0.5'} mt-0.5`} />
          </button>
        </div>
      </div>

      {showTagModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end"
          onClick={() => setShowTagModal(false)}
        >
          <div
            className="w-full bg-white rounded-t-2xl p-6 max-h-[80vh] transition-transform duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#1E293B]">选择标签</h3>
              <button onClick={() => setShowTagModal(false)}>
                <X className="w-5 h-5 text-[#64748B]" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-[#64748B] mb-2">添加自定义标签</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  placeholder="添加自定义标签"
                  className="flex-1 h-10 px-4 rounded-xl border border-gray-200 text-sm focus:border-[#2563EB] focus:outline-none"
                />
                <button
                  onClick={addCustomTag}
                  className="px-4 h-10 bg-[#2563EB] text-white rounded-xl text-sm whitespace-nowrap"
                >
                  确定
                </button>
              </div>
            </div>

            <p className="text-sm text-[#64748B] mb-2">标签分类</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {faithTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50"
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedTags.includes(tag) ? 'border-[#2563EB] bg-[#2563EB]' : 'border-gray-300'
                  }`}>
                    {selectedTags.includes(tag) && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <span className="text-sm text-[#1E293B]">{tag}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowTagModal(false)}
              className="w-full mt-4 py-3 bg-[#2563EB] text-white rounded-xl font-medium"
            >
              确定（已选 {selectedTags.length} 个）
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PublishPlan;
