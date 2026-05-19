import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Users, Clock, Book, History, Star, Award, Sparkles, Globe, Cross } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// 使用 server.js API 获取数据
const apiRequest = async (endpoint: string) => {
  const response = await fetch(`/sb-api/rest/v1/${endpoint}`, {
    headers: { 
      'Content-Type': 'application/json',
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMzI0OTIsImV4cCI6MjA5MzcwODQ5Mn0.ID9gk1K754zT_Pbc2wO7tGvm7EGEzlHdpBxu8aD3Dlc'
    }
  });
  if (!response.ok) throw new Error('API request failed');
  return response.json();
};

const PRIMARY_COLOR = '#2563EB';

interface Religion {
  id: string;
  name: string;
  type: string;
  origin_place: string;
  origin_time: string;
  distribution: string;
  followers_scale: string;
  core_belief: string;
  introduction: string;
  history: string;
  doctrines: string;
  classics: string;
  festivals: string;
  rituals: string;
  taboos: string;
  sacred_sites: string;
  famous_figures: string;
  is_active?: boolean;
  created_at?: string;
}

interface Book {
  id: string;
  title: string;
  religion: string;
  category: string;
  description: string;
}

// 解析换行分隔的内容
const parseMultiLineContent = (content: string) => {
  if (!content) return [];
  return content.split('\n').map(line => line.trim()).filter(Boolean);
};

export default function ReligionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [religion, setReligion] = useState<Religion | null>(null);
  const [relatedBooks, setRelatedBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReligion = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        
        const religionData = await apiRequest(`religions?id=eq.${id}`);
        const religion = Array.isArray(religionData) ? religionData[0] : religionData;
        
        if (!religion) {
          console.error('Religion not found');
          return;
        }
        
        setReligion(religion);
        
        // 获取相关藏书
        const booksData = await apiRequest(`books?religion=eq.${encodeURIComponent(religion.name)}&status=eq.published`);
        setRelatedBooks(booksData || []);
      } catch (err) {
        console.error('Failed to fetch religion:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchReligion();
  }, [id]);

  // 渲染卡片标题
  const CardTitle = ({ icon: Icon, title }: { icon: any; title: string }) => (
    <div className="flex items-center gap-2 mb-4">
      <div 
        className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${PRIMARY_COLOR}15` }}
      >
        <Icon className="w-4 h-4" style={{ color: PRIMARY_COLOR }} />
      </div>
      <h2 className="font-bold text-base" style={{ color: 'var(--text-color)' }}>{title}</h2>
    </div>
  );

  // 渲染多行文本卡片
  const MultiLineCard = ({ 
    icon: Icon, 
    title, 
    content 
  }: { 
    icon: any; 
    title: string; 
    content: string 
  }) => {
    const lines = parseMultiLineContent(content);
    if (lines.length === 0) return null;
    
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm" style={{ backgroundColor: 'var(--card-bg)' }}>
        <CardTitle icon={Icon} title={title} />
        <div className="space-y-3">
          {lines.map((line, idx) => (
            <p key={idx} className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {line}
            </p>
          ))}
        </div>
      </div>
    );
  };

  // 渲染圣迹符号卡片（圣地+象征物）
  const SacredSitesCard = ({ content }: { content: string }) => {
    const lines = parseMultiLineContent(content);
    if (lines.length === 0) return null;
    
    // 分离小标题和内容
    const sections: { title: string; items: { name: string; desc: string }[] }[] = [];
    let currentSection: { title: string; items: { name: string; desc: string }[] } | null = null;
    
    lines.forEach(line => {
      if (!line.trim()) return;
      
      // 检测是否是子标题行（以"主要圣地"、"象征物"等开头）
      const subTitleMatch = line.match(/^【([^】]+)】|^([^：:\n]+)[：:]\s*$/);
      if (subTitleMatch) {
        const title = subTitleMatch[1] || subTitleMatch[2];
        // 开始新section
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = { title: title.trim(), items: [] };
      } else if (currentSection) {
        // 解析内容行：名称（地点）：描述 或 名称：描述
        // 格式：名称：描述
        const colonIndex = line.indexOf('：');
        const colonIndex2 = line.indexOf(':');
        const splitIndex = colonIndex > -1 ? colonIndex : (colonIndex2 > -1 ? colonIndex2 : -1);
        
        if (splitIndex > 0) {
          const name = line.substring(0, splitIndex).trim();
          const desc = line.substring(splitIndex + 1).trim();
          currentSection.items.push({ name, desc });
        } else {
          currentSection.items.push({ name: '', desc: line.trim() });
        }
      }
    });
    
    if (currentSection) {
      sections.push(currentSection);
    }
    
    // 如果没有匹配到section，整个作为普通文本
    if (sections.length === 0) {
      return (
        <div className="bg-white rounded-xl p-4 shadow-sm" style={{ backgroundColor: 'var(--card-bg)' }}>
          <CardTitle icon={MapPin} title="圣迹符号" />
          <div className="space-y-2">
            {lines.map((line, idx) => (
              <p key={idx} className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {line}
              </p>
            ))}
          </div>
        </div>
      );
    }
    
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm" style={{ backgroundColor: 'var(--card-bg)' }}>
        <CardTitle icon={MapPin} title="圣迹符号" />
        <div className="space-y-5">
          {sections.map((section, sectionIdx) => (
            <div key={sectionIdx}>
              {/* 小标题 - 带左边框和背景 */}
              <div 
                className="flex items-center gap-2 mb-3 pl-3 py-1.5 rounded-r"
                style={{ 
                  backgroundColor: `${PRIMARY_COLOR}10`,
                  borderLeft: `3px solid ${PRIMARY_COLOR}`
                }}
              >
                <span className="font-semibold text-sm" style={{ color: PRIMARY_COLOR }}>
                  {section.title}
                </span>
              </div>
              
              {/* 内容列表 */}
              <div className="space-y-2 pl-2">
                {section.items.map((item, itemIdx) => (
                  <div key={itemIdx} className="relative pl-4">
                    {/* 左侧小圆点 */}
                    <div 
                      className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: PRIMARY_COLOR }}
                    />
                    <div className="flex flex-col">
                      {item.name && (
                        <span className="font-medium text-sm" style={{ color: 'var(--text-color)' }}>
                          {item.name}
                        </span>
                      )}
                      <span className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {item.desc}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 渲染仪式卡片（礼仪仪式专用，左侧竖条+右侧内容区）
  const RitualCard = ({ 
    icon: Icon, 
    title, 
    content 
  }: { 
    icon: any; 
    title: string; 
    content: string 
  }) => {
    const lines = parseMultiLineContent(content);
    if (lines.length === 0) return null;
    
    // 解析内容结构
    const sections: { title: string; items: { name: string; desc: string }[] }[] = [];
    let currentSection: { title: string; items: { name: string; desc: string }[] } | null = null;
    
    lines.forEach(line => {
      if (!line.trim()) return;
      
      const subTitleMatch = line.match(/^【([^】]+)】$|^([^：:\n]+)[：:]\s*$/);
      if (subTitleMatch) {
        const title = subTitleMatch[1] || subTitleMatch[2];
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = { title: title.trim(), items: [] };
      } else if (currentSection) {
        const colonIndex = line.indexOf('：');
        const colonIndex2 = line.indexOf(':');
        const splitIndex = colonIndex > -1 ? colonIndex : (colonIndex2 > -1 ? colonIndex2 : -1);
        
        if (splitIndex > 0) {
          const name = line.substring(0, splitIndex).trim();
          const desc = line.substring(splitIndex + 1).trim();
          currentSection.items.push({ name, desc });
        } else {
          if (currentSection.items.length > 0) {
            const lastItem = currentSection.items[currentSection.items.length - 1];
            lastItem.desc += ' ' + line.trim();
          } else {
            currentSection.items.push({ name: '', desc: line.trim() });
          }
        }
      } else {
        if (sections.length === 0) {
          sections.push({ title: '', items: [] });
        }
        const firstSection = sections[0];
        if (firstSection.title === '') {
          const colonIndex = line.indexOf('：');
          const colonIndex2 = line.indexOf(':');
          const splitIndex = colonIndex > -1 ? colonIndex : (colonIndex2 > -1 ? colonIndex2 : -1);
          if (splitIndex > 0) {
            firstSection.items.push({
              name: line.substring(0, splitIndex).trim(),
              desc: line.substring(splitIndex + 1).trim()
            });
          } else {
            firstSection.items.push({ name: '', desc: line.trim() });
          }
        }
      }
    });
    
    if (currentSection) {
      sections.push(currentSection);
    }
    
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm" style={{ backgroundColor: 'var(--card-bg)' }}>
        <CardTitle icon={Icon} title={title} />
        <div className="space-y-4">
          {sections.map((section, sectionIdx) => (
            <div key={sectionIdx} className="flex gap-4">
              {/* 左侧竖条区域 */}
              <div className="flex flex-col items-center">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs"
                  style={{ backgroundColor: PRIMARY_COLOR }}
                >
                  {sectionIdx + 1}
                </div>
                {sectionIdx < sections.length - 1 && (
                  <div 
                    className="w-0.5 flex-1 my-1"
                    style={{ backgroundColor: `${PRIMARY_COLOR}30` }}
                  />
                )}
              </div>
              
              {/* 右侧内容区域 */}
              <div className="flex-1 pb-4">
                <h3 className="font-bold text-base mb-3" style={{ color: 'var(--text-color)' }}>
                  {section.title}
                </h3>
                
                {section.items.length > 0 && (
                  <div className="space-y-3">
                    {section.items.map((item, itemIdx) => (
                      <div 
                        key={itemIdx}
                        className="p-3 rounded-lg"
                        style={{ backgroundColor: 'var(--bg-secondary)' }}
                      >
                        <div className="font-medium text-sm mb-1" style={{ color: PRIMARY_COLOR }}>
                          {item.name}
                        </div>
                        <div className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          {item.desc}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 渲染结构化文本卡片（适用于教义等）
  const StructuredCard = ({ 
    icon: Icon, 
    title, 
    content 
  }: { 
    icon: any; 
    title: string; 
    content: string 
  }) => {
    const lines = parseMultiLineContent(content);
    if (lines.length === 0) return null;
    
    // 解析内容结构
    const sections: { title: string; items: { name: string; desc: string }[] }[] = [];
    let currentSection: { title: string; items: { name: string; desc: string }[] } | null = null;
    
    lines.forEach(line => {
      if (!line.trim()) return;
      
      // 检测是否是子标题行（以冒号结尾，或以【】包裹）
      const subTitleMatch = line.match(/^【([^】]+)】$|^([^：:\n]+)[：:]\s*$/);
      if (subTitleMatch) {
        const title = subTitleMatch[1] || subTitleMatch[2];
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = { title: title.trim(), items: [] };
      } else if (currentSection) {
        // 解析内容行：名称：描述
        const colonIndex = line.indexOf('：');
        const colonIndex2 = line.indexOf(':');
        const splitIndex = colonIndex > -1 ? colonIndex : (colonIndex2 > -1 ? colonIndex2 : -1);
        
        if (splitIndex > 0) {
          const name = line.substring(0, splitIndex).trim();
          const desc = line.substring(splitIndex + 1).trim();
          currentSection.items.push({ name, desc });
        } else {
          // 没有冒号，整行作为描述追加到上一个条目
          if (currentSection.items.length > 0) {
            const lastItem = currentSection.items[currentSection.items.length - 1];
            lastItem.desc += ' ' + line.trim();
          } else {
            currentSection.items.push({ name: '', desc: line.trim() });
          }
        }
      } else {
        // 没有section，直接作为普通文本
        if (sections.length === 0) {
          sections.push({ title: '', items: [] });
        }
        const firstSection = sections[0];
        if (firstSection.title === '') {
          const colonIndex = line.indexOf('：');
          const colonIndex2 = line.indexOf(':');
          const splitIndex = colonIndex > -1 ? colonIndex : (colonIndex2 > -1 ? colonIndex2 : -1);
          if (splitIndex > 0) {
            firstSection.items.push({
              name: line.substring(0, splitIndex).trim(),
              desc: line.substring(splitIndex + 1).trim()
            });
          } else {
            firstSection.items.push({ name: '', desc: line.trim() });
          }
        }
      }
    });
    
    if (currentSection) {
      sections.push(currentSection);
    }
    
    // 判断是否需要渲染为带子标题的结构
    const hasSubTitles = sections.some(s => s.title !== '');
    
    if (!hasSubTitles) {
      // 没有子标题，使用简单段落样式
      return (
        <div className="bg-white rounded-xl p-4 shadow-sm" style={{ backgroundColor: 'var(--card-bg)' }}>
          <CardTitle icon={Icon} title={title} />
          <div className="space-y-2">
            {sections[0]?.items.map((item, idx) => (
              <p key={idx} className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {item.name ? `${item.name}：${item.desc}` : item.desc}
              </p>
            ))}
          </div>
        </div>
      );
    }
    
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm" style={{ backgroundColor: 'var(--card-bg)' }}>
        <CardTitle icon={Icon} title={title} />
        <div className="space-y-4">
          {sections.map((section, sectionIdx) => (
            <div key={sectionIdx}>
              {section.title && (
                <div 
                  className="flex items-center gap-2 mb-3 pl-3 py-1.5 rounded-r"
                  style={{ 
                    backgroundColor: `${PRIMARY_COLOR}10`,
                    borderLeft: `3px solid ${PRIMARY_COLOR}`
                  }}
                >
                  <span className="font-semibold text-sm" style={{ color: PRIMARY_COLOR }}>
                    {section.title}
                  </span>
                </div>
              )}
              
              {section.items.length > 0 && (
                <div className="space-y-2 pl-2">
                  {section.items.map((item, itemIdx) => (
                    <div key={itemIdx} className="relative pl-4">
                      <div 
                        className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: PRIMARY_COLOR }}
                      />
                      <div className="flex flex-col">
                        {item.name && (
                          <span className="font-medium text-sm" style={{ color: 'var(--text-color)' }}>
                            {item.name}
                          </span>
                        )}
                        <span className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                          {item.desc}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 渲染列表式卡片（适用于节日等）
  const ListCard = ({ 
    icon: Icon, 
    title, 
    content 
  }: { 
    icon: any; 
    title: string; 
    content: string 
  }) => {
    // 管道分隔解析
    const parsePipeContent = () => {
      if (!content) return [];
      return content.split('\n').map(line => {
        const parts = line.split('|').map(p => p.trim()).filter(Boolean);
        return parts;
      });
    };
    
    const items = parsePipeContent();
    if (items.length === 0) return null;
    
    const isStructured = items[0]?.length > 1;
    
    if (isStructured) {
      return (
        <div className="bg-white rounded-xl p-4 shadow-sm" style={{ backgroundColor: 'var(--card-bg)' }}>
          <CardTitle icon={Icon} title={title} />
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div 
                key={idx} 
                className="p-3 rounded-lg"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <div className="flex items-start gap-2">
                  <span 
                    className="px-2 py-0.5 rounded text-xs font-medium text-white flex-shrink-0"
                    style={{ backgroundColor: PRIMARY_COLOR }}
                  >
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm" style={{ color: 'var(--text-color)' }}>
                      {item[0]}
                    </h4>
                    {item[1] && (
                      <p className="text-xs mt-1" style={{ color: PRIMARY_COLOR }}>
                        {item[1]}
                      </p>
                    )}
                    {item[2] && (
                      <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        {item[2]}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    } else {
      return (
        <div className="bg-white rounded-xl p-4 shadow-sm" style={{ backgroundColor: 'var(--card-bg)' }}>
          <CardTitle icon={Icon} title={title} />
          <div className="flex flex-wrap gap-2">
            {items.map((item, idx) => (
              <span 
                key={idx}
                className="px-3 py-1.5 rounded-full text-xs"
                style={{ 
                  backgroundColor: `${PRIMARY_COLOR}15`,
                  color: PRIMARY_COLOR
                }}
              >
                {item[0]}
              </span>
            ))}
          </div>
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-color)' }}>
        <div className="text-center">
          <div 
            className="w-12 h-12 border-4 border-gray-200 border-t-4 rounded-full animate-spin mx-auto mb-4" 
            style={{ borderTopColor: PRIMARY_COLOR }} 
          />
          <p style={{ color: 'var(--text-secondary)' }}>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!religion) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-color)' }}>
        <div className="text-center px-6">
          <Sparkles className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-secondary)' }} />
          <p className="text-lg mb-4" style={{ color: 'var(--text-color)' }}>未找到该宗教信息</p>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 rounded-lg text-white font-medium"
            style={{ backgroundColor: PRIMARY_COLOR }}
          >
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: 'var(--bg-color)' }}>
      {/* Header */}
      <div 
        className="p-4 pt-12 pb-6"
        style={{ 
          background: `linear-gradient(135deg, ${PRIMARY_COLOR}, ${PRIMARY_COLOR}CC)`
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">{religion.name}</h1>
        </div>
        
        {/* Quick Stats */}
        <div className="flex flex-wrap gap-3">
          {religion.type && (
            <div className="flex-1 min-w-[120px] bg-white/15 backdrop-blur-sm rounded-xl p-3">
              <p className="text-xs text-white/70">宗教类型</p>
              <p className="text-white font-semibold text-sm mt-1">{religion.type}</p>
            </div>
          )}
          {religion.followers_scale && (
            <div className="flex-1 min-w-[120px] bg-white/15 backdrop-blur-sm rounded-xl p-3">
              <p className="text-xs text-white/70">全球信徒</p>
              <p className="text-white font-semibold text-sm mt-1 leading-tight">{religion.followers_scale}</p>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Basic Info Grid */}
        <div className="bg-white rounded-xl p-4 shadow-sm" style={{ backgroundColor: 'var(--card-bg)' }}>
          <CardTitle icon={Globe} title="基本信息" />
          <div className="grid grid-cols-1 gap-3">
            {religion.origin_place && (
              <div className="flex items-start gap-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${PRIMARY_COLOR}10` }}
                >
                  <MapPin className="w-4 h-4" style={{ color: PRIMARY_COLOR }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>起源地区</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-color)' }}>{religion.origin_place}</p>
                </div>
              </div>
            )}
            {religion.origin_time && (
              <div className="flex items-start gap-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${PRIMARY_COLOR}10` }}
                >
                  <Clock className="w-4 h-4" style={{ color: PRIMARY_COLOR }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>起源时间</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-color)' }}>{religion.origin_time}</p>
                </div>
              </div>
            )}
            {religion.distribution && (
              <div className="flex items-start gap-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${PRIMARY_COLOR}10` }}
                >
                  <Globe className="w-4 h-4" style={{ color: PRIMARY_COLOR }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>分布地区</p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-color)' }}>{religion.distribution}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Core Belief */}
        {religion.core_belief && (
          <div 
            className="rounded-xl p-4 shadow-sm"
            style={{ 
              background: `linear-gradient(135deg, ${PRIMARY_COLOR}15, ${PRIMARY_COLOR}05)`,
              borderLeft: `4px solid ${PRIMARY_COLOR}`
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />
              <h2 className="font-bold" style={{ color: PRIMARY_COLOR }}>核心信仰</h2>
            </div>
            <p className="text-sm leading-relaxed font-medium" style={{ color: 'var(--text-color)' }}>
              {religion.core_belief}
            </p>
          </div>
        )}

        {/* Introduction */}
        {religion.introduction && (
          <MultiLineCard icon={Book} title="简介" content={religion.introduction} />
        )}

        {/* History */}
        {religion.history && (
          <MultiLineCard icon={History} title="历史发展" content={religion.history} />
        )}

        {/* Doctrines */}
        {religion.doctrines && (
          <MultiLineCard icon={Sparkles} title="主要教义" content={religion.doctrines} />
        )}

        {/* Classics */}
        {religion.classics && (
          <MultiLineCard icon={Book} title="经典著作" content={religion.classics} />
        )}

        {/* Festivals */}
        {religion.festivals && (
          <ListCard icon={Star} title="主要节日" content={religion.festivals} />
        )}

        {/* Rituals */}
        {religion.rituals && (
          <RitualCard icon={Award} title="礼仪仪式" content={religion.rituals} />
        )}

        {/* Taboos */}
        {religion.taboos && (
          <MultiLineCard icon={Cross} title="禁忌习俗" content={religion.taboos} />
        )}

        {/* Sacred Sites - 圣迹符号 */}
        {religion.sacred_sites && (
          <SacredSitesCard content={religion.sacred_sites} />
        )}

        {/* Famous Figures */}
        {religion.famous_figures && (
          <MultiLineCard icon={Users} title="著名人物" content={religion.famous_figures} />
        )}

        {/* Related Books */}
        {relatedBooks.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm" style={{ backgroundColor: 'var(--card-bg)' }}>
            <CardTitle icon={Book} title="相关藏书" />
            <div className="space-y-3">
              {relatedBooks.map(book => (
                <div 
                  key={book.id}
                  className="p-4 rounded-lg cursor-pointer transition-all"
                  style={{ 
                    backgroundColor: 'var(--bg-secondary)',
                    borderLeft: `3px solid ${PRIMARY_COLOR}`
                  }}
                >
                  <h3 className="font-medium" style={{ color: 'var(--text-color)' }}>{book.title}</h3>
                  {book.description && (
                    <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {book.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
