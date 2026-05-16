import React from 'react';
import { useTranslation } from 'react-i18next';

interface ChannelTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

function ChannelTabs({ activeTab, onTabChange }: ChannelTabsProps) {
  const { t } = useTranslation();
  const primaryColor = '#E11D48';

  const tabs = [
    { id: 'recommend', label: t('home.recommend') },
    { id: 'following', label: t('home.following') },
    { id: 'tags', label: t('home.addTag') },
  ];

  return (
    <div className="flex items-center gap-1 mt-3 overflow-x-auto scrollbar-hide">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`relative px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? 'text-[#E11D48]' : 'text-gray-500'}`}
        >
          {tab.label}
          {activeTab === tab.id && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#E11D48]" />
          )}
        </button>
      ))}
    </div>
  );
}

export default ChannelTabs;