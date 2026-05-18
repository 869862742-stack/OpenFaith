import React, { useState, useRef, useEffect } from 'react';

import { ArrowLeft, Video, Image as ImageIcon, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';

const faithTags = [
  '基督教', '伊斯兰教', '犹太教', '佛教', '印度教', '道教', '锡克教',
  '巴哈伊教', '摩门教', '耶和华见证人', '琐罗亚斯德教', '诺斯替',
  '卡巴拉', '神道教', '耆那教', '德鲁兹教', '约鲁巴教', '伏都教',
  '雅兹迪', '曼达安', '玛雅/阿兹特克', '毛利宗教', '天理教', '天道教',
  '高台教'
];

function PublishVideo() {
  const navigate = useNavigate();
  const videoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [video, setVideo] = useState<string | null>(null);
  const [cover, setCover] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagModal, setShowTagModal] = useState(false);
  const [customTag, setCustomTag] = useState('');

  // 游客登录检查
  useEffect(() => {
    const auth = useAuthStore.getState();
    const token = auth.currentToken();
    const userId = auth.userInfo?.id;
    if (!token || !userId) {
      window.location.hash = '/login';
    }
  }, []);

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setVideo(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCover(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

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
    if (!video) {
      alert('请上传视频');
      return;
    }
    if (!title) {
      alert('请填写标题');
      return;
    }
    alert('发布成功！');
    navigate('/');
  };

  const handleSaveDraft = () => {
    alert('已保存到草稿箱');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 bg-white px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft className="w-5 h-5 text-[#1E293B]" />
        </button>
        <h1 className="text-lg font-bold text-[#1E293B]">发布视频笔记</h1>
        <div className="flex items-center gap-2">
          <button onClick={handleSaveDraft} className="text-sm text-[#64748B]">存草稿</button>
          <button onClick={handlePublish} className="px-4 py-1.5 bg-[#E11D48] text-white text-sm rounded-full">发布</button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <div>
          <p className="text-sm text-[#64748B] mb-2">视频 <span className="text-[#E11D48]">*</span></p>
          {video ? (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
              <video src={video} className="w-full h-full" controls />
              <button
                onClick={() => setVideo(null)}
                className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => videoInputRef.current?.click()}
              className="w-full aspect-video rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-[#94A3B8]"
            >
              <Video className="w-12 h-12 mb-2" />
              <span className="text-sm">点击上传视频</span>
              <span className="text-xs mt-1">最大50MB</span>
            </button>
          )}
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleVideoUpload}
          />
        </div>

        <div>
          <p className="text-sm text-[#64748B] mb-2">视频封面（可选）</p>
          {cover ? (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden">
              <img src={cover} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => setCover(null)}
                className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => coverInputRef.current?.click()}
              className="w-full aspect-video rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-[#94A3B8]"
            >
              <ImageIcon className="w-8 h-8 mb-2" />
              <span className="text-sm">点击上传封面</span>
            </button>
          )}
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCoverUpload}
          />
        </div>

        <div>
          <p className="text-sm text-[#64748B] mb-2">标题 <span className="text-[#E11D48]">*</span></p>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="填写视频标题..."
            className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm focus:border-[#E11D48] focus:outline-none"
          />
        </div>

        <div>
          <p className="text-sm text-[#64748B] mb-2">简介</p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="介绍一下你的视频..."
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-[#E11D48] focus:outline-none resize-none"
          />
        </div>

        <div>
          <p className="text-sm text-[#64748B] mb-2">话题标签</p>
          <button
            onClick={() => setShowTagModal(true)}
            className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm text-[#64748B] flex items-center justify-between"
          >
            <span>{selectedTags.length > 0 ? `已选 ${selectedTags.length} 个标签` : '选择标签'}</span>
            <span className="text-[#E11D48]">+</span>
          </button>
          {selectedTags.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {selectedTags.map(tag => (
                <span key={tag} className="relative px-3 py-1 bg-[#E11D48]/10 text-[#E11D48] text-xs rounded-full flex items-center gap-1">
                  {tag}
                  <button 
                    onClick={() => removeTag(tag)}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-[#E11D48] rounded-full flex items-center justify-center text-white text-[10px]"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
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
                  className="flex-1 h-10 px-4 rounded-xl border border-gray-200 text-sm focus:border-[#E11D48] focus:outline-none"
                />
                <button
                  onClick={addCustomTag}
                  className="px-4 h-10 bg-[#E11D48] text-white rounded-xl text-sm whitespace-nowrap"
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
                    selectedTags.includes(tag) ? 'border-[#E11D48] bg-[#E11D48]' : 'border-gray-300'
                  }`}>
                    {selectedTags.includes(tag) && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <span className="text-sm text-[#1E293B]">{tag}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowTagModal(false)}
              className="w-full mt-4 py-3 bg-[#E11D48] text-white rounded-xl font-medium"
            >
              确定（已选 {selectedTags.length} 个）
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PublishVideo;
