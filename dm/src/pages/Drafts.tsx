import React, { useEffect } from 'react';

import { ArrowLeft, FileText, Image as ImageIcon, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';

const mockDrafts = [
  { id: 1, type: 'note', title: '未完成的笔记', time: '2小时前', hasImage: true },
  { id: 2, type: 'video', title: '周末礼拜视频', time: '昨天', hasImage: false },
  { id: 3, type: 'plan', title: '30天祷告计划', time: '3天前', hasImage: false },
];

function Drafts() {
  const navigate = useNavigate();

  // 游客登录检查
  useEffect(() => {
    const auth = useAuthStore.getState();
    const token = auth.currentToken();
    const userId = auth.userInfo?.id;
    if (!token || !userId) {
      window.location.hash = '/login';
    }
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'note':
        return <ImageIcon className="w-5 h-5 text-[#E11D48]" />;
      case 'video':
        return <Video className="w-5 h-5 text-[#E11D48]" />;
      default:
        return <FileText className="w-5 h-5 text-[#E11D48]" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'note':
        return '图文笔记';
      case 'video':
        return '视频笔记';
      case 'plan':
        return '学习计划';
      default:
        return '草稿';
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 bg-white px-4 py-3 border-b border-gray-100 flex items-center">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft className="w-5 h-5 text-[#1E293B]" />
        </button>
        <h1 className="text-lg font-bold text-[#1E293B] flex-1 text-center mr-10">草稿箱</h1>
      </header>

      <div className="p-4">
        {mockDrafts.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-[#94A3B8]">暂无草稿</p>
          </div>
        ) : (
          <div className="space-y-3">
            {mockDrafts.map((draft) => (
              <div
                key={draft.id}
                className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 cursor-pointer"
                onClick={() => navigate(`/drafts/${draft.id}`)}
              >
                <div className="w-12 h-12 rounded-xl bg-[#E11D48]/10 flex items-center justify-center">
                  {getIcon(draft.type)}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-[#1E293B] text-sm">{draft.title}</h3>
                  <p className="text-xs text-[#94A3B8] mt-1">{getTypeLabel(draft.type)} · {draft.time}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Drafts;
