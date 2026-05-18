import React, { useState } from 'react';

import { ArrowLeft, Bell, Flame, MessageCircle, UserPlus, MessageSquare, Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function NotificationSettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    smartPush: true,
    heatAndCollect: true,
    commentAndReply: true,
    newFollower: true,
    messageAndGroup: true,
    systemNotice: true,
  });

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const notificationItems = [
    {
      key: 'heatAndCollect' as const,
      icon: Flame,
      title: '加热和收藏',
      desc: '当有人加热或收藏您的信仰笔记时提醒您',
    },
    {
      key: 'commentAndReply' as const,
      icon: MessageCircle,
      title: '评论和回复',
      desc: '当有人评论您的笔记或在评论中提及您时提醒您',
    },
    {
      key: 'newFollower' as const,
      icon: UserPlus,
      title: '新增关注',
      desc: '当有新的灵性伴侣关注您时提醒您',
    },
    {
      key: 'messageAndGroup' as const,
      icon: MessageSquare,
      title: '私信和群聊消息',
      desc: '当您收到新的个人私信或参与的群聊消息时提醒您',
    },
    {
      key: 'systemNotice' as const,
      icon: Volume2,
      title: '系统公告',
      desc: '接收 OpenFaith 社区的维护、更新及重要活动通知',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 bg-white px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft className="w-5 h-5 text-[#1E293B]" />
        </button>
        <h1 className="text-lg font-bold text-[#1E293B]">通知设置</h1>
      </header>

      <div className="p-4">
        <div
          className="bg-gray-50 rounded-xl p-4 mb-4"
        >
          <h2 className="text-sm font-bold text-[#1E293B] mb-2">智能推送策略</h2>
          <p className="text-xs text-[#64748B]">
            OpenFaith 将根据您的学习状态智能推送通知。关闭开关后，您将不会收到对应的系统实时推送，但仍可在消息列表中查看。
          </p>
        </div>

        <div className="space-y-3">
          {notificationItems.map((item, index) => (
            <div
              key={item.key}
              className="bg-white rounded-xl border border-gray-100 p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-[#1E293B] mb-1">{item.title}</h3>
                  <p className="text-xs text-[#94A3B8]">{item.desc}</p>
                </div>
                <button
                  onClick={() => toggleSetting(item.key)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    settings[item.key] ? 'bg-[#E11D48]' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      settings[item.key] ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default NotificationSettings;
