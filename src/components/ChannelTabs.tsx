import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';


interface ChannelTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

function ChannelTabs({ activeTab, onTabChange }: ChannelTabsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const tabs = [
    { id: 'recommend', label: t('home.recommend') },
    { id: 'following', label: t('home.following') },
    { id: 'tags', label: t('home.addTag') },
  ];

  const handleGongjing = () => {
    onTabChange('gongjing');
    navigate('/gongjing');
  };

  return (
    <div className="flex items-center gap-1 mt-3 overflow-x-auto scrollbar-hide relative">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`relative px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? 'text-[#2563EB]' : "text-[var(--text-secondary)]"}`}
        >
          {tab.label}
          {activeTab === tab.id && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#2563EB]" />
          )}
        </button>
      ))}
      <button
        onClick={handleGongjing}
        className={`relative px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'gongjing' ? 'text-[#2563EB]' : "text-[var(--text-secondary)]"}`}
      >
        共境
        {activeTab === 'gongjing' && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#2563EB]" />
        )}
      </button>
    </div>
  );
}

export default ChannelTabs;