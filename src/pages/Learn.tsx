import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { BookOpen, Library, Calendar, ChevronRight, ChevronLeft, Search, X, Bookmark, Heart, BookMarked, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import BottomNav from '../components/BottomNav';

// 使用 server.js API 获取数据
const apiRequest = async (endpoint: string) => {
  const response = await fetch(`/sb-api/rest/v1/${endpoint}`, {
    headers: { 
      'Content-Type': 'application/json',
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMzI0OTIsImV4cCI6MjA5MzcwODQ5Mn0.ID9gk1K754zT_Pbc2wO7tGvm7EGEzlHdpBxu8aD3Dlc'
    }
  });
  if (!response.ok) {
    // 尝试解析错误信息
    try {
      const errorData = await response.json();
      console.warn('API error:', errorData);
      // 返回空数组让调用方能正常处理
      return [];
    } catch {
      throw new Error('API request failed');
    }
  }
  const data = await response.json();
  // 确保返回数组，防止 map 报错
  return Array.isArray(data) ? data : [];
};

const PRIMARY_COLOR = '#E11D48';

interface Religion {
  id: string;
  name: string;
  followers_scale: string;
  type?: string;
  introduction?: string;
}

interface Book {
  id: string;
  title: string;
  religion: string;
  category: string;
  description: string;
  status?: string;
  group_id?: string;
}

interface Chapter {
  id: string;
  book_id: string;
  number: number;
  title: string;
  content: string;
}

interface BookGroup {
  id: string;
  name: string;
  parent_id: string | null;
  book_ids: string[];
  group_ids: string[];
  is_published: boolean;
}

const religiousHolidays = [
  { month: 1, day: 6, name: '主显节', religion: '基督教', desc: '纪念耶稣向世人显现的节日，东方教会称为神显节。' },
  { month: 1, day: 7, name: '东正教圣诞节', religion: '东正教', desc: '东正教按照儒略历庆祝的圣诞节。' },
  { month: 2, day: 10, name: '春节', religion: '传统', desc: '中国农历新年，是最重要的传统节日。' },
  { month: 2, day: 14, name: '圣灰星期三', religion: '基督教', desc: '大斋期的开始，信徒会在额头上涂抹灰烬。' },
  { month: 3, day: 10, name: '开斋节', religion: '伊斯兰教', desc: '斋月结束后的庆祝节日，标志着斋戒的完成。' },
  { month: 3, day: 17, name: '圣帕特里克节', religion: '基督教', desc: '纪念爱尔兰守护圣人圣帕特里克的节日。' },
  { month: 3, day: 23, name: '诺鲁孜节', religion: '琐罗亚斯德教', desc: '波斯新年，也是琐罗亚斯德教的重要节日。' },
  { month: 3, day: 29, name: '耶稣受难日', religion: '基督教', desc: '纪念耶稣基督被钉十字架受难的节日。' },
  { month: 3, day: 31, name: '复活节', religion: '基督教', desc: '纪念耶稣基督复活的重要节日。' },
  { month: 4, day: 9, name: '大雄诞辰', religion: '耆那教', desc: '纪念耆那教创始人摩诃毗罗诞辰的节日。' },
  { month: 4, day: 13, name: '宋干节', religion: '佛教', desc: '泰国、老挝等东南亚国家的新年，也是佛教重要节日。' },
  { month: 4, day: 17, name: '逾越节', religion: '犹太教', desc: '纪念以色列人出埃及的节日，持续七天或八天。' },
  { month: 4, day: 23, name: '圣乔治节', religion: '基督教', desc: '纪念英格兰守护圣人圣乔治的节日。' },
  { month: 5, day: 1, name: '卫塞节', religion: '佛教', desc: '纪念佛陀诞生、成道、涅槃的节日。' },
  { month: 5, day: 9, name: '耶稣升天节', religion: '基督教', desc: '纪念耶稣基督升天的节日。' },
  { month: 5, day: 19, name: '五旬节', religion: '基督教', desc: '圣灵降临节，纪念圣灵降临在使徒身上。' },
  { month: 5, day: 23, name: '圣灵降临节', religion: '基督教', desc: '与五旬节同一天，庆祝圣灵的降临。' },
  { month: 6, day: 16, name: '古尔邦节', religion: '伊斯兰教', desc: '宰牲节，纪念易卜拉欣愿意献祭儿子的忠诚。' },
  { month: 6, day: 17, name: '伊斯兰新年', religion: '伊斯兰教', desc: '希吉来历新年的第一天。' },
  { month: 6, day: 21, name: '夏至', religion: '传统', desc: '北半球白昼最长的一天，许多文化都有庆祝活动。' },
  { month: 7, day: 7, name: '七夕', religion: '传统', desc: '中国传统情人节，纪念牛郎织女相会。' },
  { month: 7, day: 17, name: '阿舒拉节', religion: '伊斯兰教', desc: '什叶派纪念侯赛因殉难的重要节日。' },
  { month: 8, day: 15, name: '圣母升天节', religion: '天主教', desc: '纪念圣母玛利亚灵魂与肉身一同升天的节日。' },
  { month: 8, day: 19, name: '盂兰盆节', religion: '佛教', desc: '佛教重要节日，又称中元节，祭祀祖先。' },
  { month: 8, day: 26, name: '克里希纳诞辰', religion: '印度教', desc: '纪念印度教神祇克里希纳诞辰的节日。' },
  { month: 9, day: 7, name: '象头神节', religion: '印度教', desc: '纪念象头神伽内什的节日。' },
  { month: 9, day: 15, name: '赎罪日', religion: '犹太教', desc: '犹太教最神圣的日子，进行禁食和忏悔。' },
  { month: 9, day: 20, name: '住棚节', religion: '犹太教', desc: '纪念以色列人在旷野住棚的七天节日。' },
  { month: 9, day: 26, name: '十胜节', religion: '印度教', desc: '纪念罗摩战胜魔王罗波那的节日。' },
  { month: 10, day: 3, name: '中秋节', religion: '传统', desc: '中国传统节日，家人团聚赏月吃月饼。' },
  { month: 10, day: 12, name: '排灯节', religion: '印度教', desc: '印度教光明节，象征光明战胜黑暗。' },
  { month: 10, day: 31, name: '万圣节', religion: '基督教', desc: '诸圣节前夕，纪念所有圣徒的节日。' },
  { month: 11, day: 1, name: '诸圣节', religion: '基督教', desc: '纪念所有圣徒和殉道者的节日。' },
  { month: 11, day: 2, name: '万灵节', religion: '基督教', desc: '纪念所有亡者的节日。' },
  { month: 11, day: 12, name: '光明节', religion: '犹太教', desc: '纪念马加比起义胜利和圣殿灯油奇迹的八天节日。' },
  { month: 11, day: 15, name: '佛成道日', religion: '佛教', desc: '纪念佛陀在菩提树下证悟成佛的日子。' },
  { month: 12, day: 8, name: '圣母无染原罪节', religion: '天主教', desc: '纪念圣母玛利亚受孕时未受原罪玷污的节日。' },
  { month: 12, day: 12, name: '瓜达卢佩圣母节', religion: '天主教', desc: '纪念瓜达卢佩圣母显现的节日。' },
  { month: 12, day: 25, name: '圣诞节', religion: '基督教', desc: '纪念耶稣基督诞生的重要节日。' },
  { month: 12, day: 26, name: '节礼日', religion: '基督教', desc: '圣诞节后的第一天，传统上向穷人施舍礼物。' },
];

interface CalendarViewProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

function CalendarView({ searchQuery, setSearchQuery }: CalendarViewProps) {
  const { t } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<any>(null);
  const yearScrollRef = useRef<HTMLDivElement>(null);
  const monthScrollRef = useRef<HTMLDivElement>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const years = Array.from({ length: 21 }, (_, i) => year - 10 + i);

  const getHolidaysForDate = (day: number) => {
    return religiousHolidays.filter(h => h.month === month + 1 && h.day === day);
  };

  const today = new Date();
  const isToday = (day: number) => {
    return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
  };

  const filteredHolidays = religiousHolidays.filter(h =>
    h.name.includes(searchQuery) || h.religion.includes(searchQuery)
  );

  useEffect(() => {
    if (showYearPicker && yearScrollRef.current) {
      const currentYearIndex = years.indexOf(year);
      yearScrollRef.current.scrollTop = currentYearIndex * 40 - 80;
    }
  }, [showYearPicker, year]);

  useEffect(() => {
    if (showMonthPicker && monthScrollRef.current) {
      monthScrollRef.current.scrollTop = month * 40 - 80;
    }
  }, [showMonthPicker, month]);

  if (searchQuery) {
    return (
      <div className="p-4">
        <div className="space-y-2">
          <h4 className="font-medium mb-3" style={{ color: 'var(--text-color)' }}>{t('learn.searchResults') || '搜索结果'}</h4>
          {filteredHolidays.map((holiday, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedHoliday(holiday)}
              className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer theme-transition"
              style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${PRIMARY_COLOR}15` }}
              >
                <span className="text-sm font-bold" style={{ color: PRIMARY_COLOR }}>{holiday.month}/{holiday.day}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--text-color)' }}>{holiday.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{holiday.religion}</p>
              </div>
              <ChevronRight className="w-5 h-5" style={{ color: 'var(--icon-color)' }} />
            </div>
          ))}
          {filteredHolidays.length === 0 && (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-secondary)' }}>{t('learn.noResults') || '未找到相关节日'}</p>
          )}
        </div>

        {selectedHoliday && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedHoliday(null)}
          >
            <div
              className="rounded-2xl p-6 w-full max-w-sm theme-transition"
              style={{ backgroundColor: 'var(--card-bg)' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-color)' }}>{selectedHoliday.name}</h3>
                <button onClick={() => setSelectedHoliday(null)}>
                  <X className="w-5 h-5" style={{ color: 'var(--icon-color)' }} />
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('learn.date') || '日期'}：</span>
                  <span className="text-sm" style={{ color: 'var(--text-color)' }}>{selectedHoliday.month}{t('learn.month') || '月'}{selectedHoliday.day}{t('learn.day') || '日'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('learn.religion') || '宗教'}：</span>
                  <span className="text-sm" style={{ color: 'var(--text-color)' }}>{selectedHoliday.religion}</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-color)' }}>{selectedHoliday.desc}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4">
      <div
        className="rounded-2xl border shadow-sm overflow-hidden theme-transition"
        style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
      >
        <div
          className="flex items-center justify-center p-4 border-b gap-4"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <button
            onClick={() => setShowYearPicker(true)}
            className="text-lg font-bold flex items-center gap-1"
            style={{ color: 'var(--text-color)' }}
          >
            {year}{t('learn.year') || '年'}
            <ChevronRight className="w-4 h-4 rotate-90" />
          </button>
          <button
            onClick={() => setShowMonthPicker(true)}
            className="text-lg font-bold flex items-center gap-1"
            style={{ color: 'var(--text-color)' }}
          >
            {monthNames[month]}
            <ChevronRight className="w-4 h-4 rotate-90" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 p-2">
          {weekDays.map(day => (
            <div
              key={day}
              className="text-center text-xs py-2 font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              {day}
            </div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const holidays = getHolidaysForDate(day);
            const hasHoliday = holidays.length > 0;
            const isSelected = selectedDate?.getDate() === day && selectedDate?.getMonth() === month;

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(new Date(year, month, day))}
                className="aspect-square flex flex-col items-center justify-center rounded-lg text-sm relative"
                style={{
                  backgroundColor: isToday(day)
                    ? PRIMARY_COLOR
                    : isSelected
                    ? `${PRIMARY_COLOR}15`
                    : hasHoliday
                    ? `${PRIMARY_COLOR}08`
                    : 'transparent',
                  color: isToday(day)
                    ? '#FFFFFF'
                    : isSelected
                    ? PRIMARY_COLOR
                    : hasHoliday
                    ? PRIMARY_COLOR
                    : 'var(--text-color)',
                }}
              >
                <span className="font-medium">{day}</span>
                {hasHoliday && (
                  <div className="absolute bottom-1 flex gap-0.5">
                    {holidays.slice(0, 3).map((_, idx) => (
                      <div
                        key={idx}
                        className="w-1 h-1 rounded-full"
                        style={{ backgroundColor: isToday(day) ? '#FFFFFF' : PRIMARY_COLOR }}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div
          className="mt-4 rounded-xl border p-4 theme-transition"
          style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
        >
          <h4 className="font-medium mb-2" style={{ color: 'var(--text-color)' }}>
            {selectedDate.getMonth() + 1}{t('learn.month') || '月'}{selectedDate.getDate()}{t('learn.day') || '日'}
          </h4>
          {getHolidaysForDate(selectedDate.getDate()).length > 0 ? (
            <div className="space-y-2">
              {getHolidaysForDate(selectedDate.getDate()).map((holiday, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: PRIMARY_COLOR }}
                  />
                  <span className="text-sm" style={{ color: 'var(--text-color)' }}>{holiday.name}</span>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>({holiday.religion})</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('learn.noHoliday') || '今日无宗教节日'}</p>
          )}
        </div>
      )}

      <div className="mt-4">
        <h4 className="font-medium mb-3" style={{ color: 'var(--text-color)' }}>{t('learn.monthHolidays') || '本月节日'}</h4>
        <div className="space-y-2">
          {religiousHolidays
            .filter(h => h.month === month + 1)
            .map((holiday, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedHoliday(holiday)}
                className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer theme-transition"
                style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${PRIMARY_COLOR}15` }}
                >
                  <span className="text-sm font-bold" style={{ color: PRIMARY_COLOR }}>{holiday.day}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-color)' }}>{holiday.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{holiday.religion}</p>
                </div>
                <ChevronRight className="w-5 h-5" style={{ color: 'var(--icon-color)' }} />
              </div>
            ))}
          {religiousHolidays.filter(h => h.month === month + 1).length === 0 && (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-secondary)' }}>{t('learn.noMonthHoliday') || '本月暂无宗教节日'}</p>
          )}
        </div>
      </div>

      {showYearPicker && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowYearPicker(false)}
        >
          <div
            className="rounded-2xl p-4 w-48 max-h-80 theme-transition"
            style={{ backgroundColor: 'var(--card-bg)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-center font-bold mb-4" style={{ color: 'var(--text-color)' }}>{t('learn.selectYear') || '选择年份'}</h3>
            <div ref={yearScrollRef} className="max-h-60 overflow-y-auto">
              {years.map(y => (
                <button
                  key={y}
                  onClick={() => { setCurrentDate(new Date(y, month, 1)); setShowYearPicker(false); }}
                  className="w-full py-2 text-center rounded-lg"
                  style={{
                    backgroundColor: y === year ? PRIMARY_COLOR : 'transparent',
                    color: y === year ? '#FFFFFF' : 'var(--text-color)',
                  }}
                >
                  {y}{t('learn.year') || '年'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showMonthPicker && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowMonthPicker(false)}
        >
          <div
            className="rounded-2xl p-4 w-48 max-h-80 theme-transition"
            style={{ backgroundColor: 'var(--card-bg)' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-center font-bold mb-4" style={{ color: 'var(--text-color)' }}>{t('learn.selectMonth') || '选择月份'}</h3>
            <div ref={monthScrollRef} className="max-h-60 overflow-y-auto">
              {monthNames.map((m, idx) => (
                <button
                  key={idx}
                  onClick={() => { setCurrentDate(new Date(year, idx, 1)); setShowMonthPicker(false); }}
                  className="w-full py-2 text-center rounded-lg"
                  style={{
                    backgroundColor: idx === month ? PRIMARY_COLOR : 'transparent',
                    color: idx === month ? '#FFFFFF' : 'var(--text-color)',
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedHoliday && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedHoliday(null)}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-sm theme-transition"
            style={{ backgroundColor: 'var(--card-bg)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-color)' }}>{selectedHoliday.name}</h3>
              <button onClick={() => setSelectedHoliday(null)}>
                <X className="w-5 h-5" style={{ color: 'var(--icon-color)' }} />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('learn.date') || '日期'}：</span>
                <span className="text-sm" style={{ color: 'var(--text-color)' }}>{selectedHoliday.month}{t('learn.month') || '月'}{selectedHoliday.day}{t('learn.day') || '日'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('learn.religion') || '宗教'}：</span>
                <span className="text-sm" style={{ color: 'var(--text-color)' }}>{selectedHoliday.religion}</span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-color)' }}>{selectedHoliday.desc}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Learn() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('encyclopedia');
  const [libraryTab, setLibraryTab] = useState('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [myBookshelf, setMyBookshelf] = useState<string[]>([]);
  const [myInsights, setMyInsights] = useState<any[]>([]);
  const navigate = useNavigate();
  
  // 从 API 获取的数据
  const [religionsList, setReligionsList] = useState<Religion[]>([]);
  const [booksList, setBooksList] = useState<Book[]>([]);
  const [chaptersMap, setChaptersMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  
  // 群组相关状态
  const [groupsList, setGroupsList] = useState<BookGroup[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [breadcrumb, setBreadcrumb] = useState<{id: string; name: string}[]>([]);
  
  // 获取宗教百科数据
  useEffect(() => {
    const fetchReligions = async () => {
      try {
        const data = await apiRequest('religions?is_active=eq.true&order=name.asc');
        
        if (data && data.length > 0) {
          setReligionsList(data.map((r: any) => ({
            id: r.id,
            name: r.name,
            followers_scale: r.followers_scale || '',
            type: r.type || '',
            introduction: r.introduction || ''
          })));
        }
      } catch (err) {
        console.error('Failed to fetch religions:', err);
      }
    };
    
    fetchReligions();
  }, []);
  
  // 获取藏书数据
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoading(true);
        
        // 加载书架数据
        try {
          const savedBookshelf = localStorage.getItem('myBookshelf');
          if (savedBookshelf) {
            setMyBookshelf(JSON.parse(savedBookshelf));
          }
        } catch (e) {
          console.error('Failed to load bookshelf:', e);
        }
        
        // 加载感悟数据
        try {
          const savedInsights = localStorage.getItem('myInsights');
          if (savedInsights) {
            setMyInsights(JSON.parse(savedInsights));
          }
        } catch (e) {
          console.error('Failed to load insights:', e);
        }
        
        // 获取群组数据
        const groupsData = await apiRequest('book_groups');
        if (groupsData && groupsData.length > 0) {
          setGroupsList(groupsData);
        }
        
        // 获取所有书籍（前台根据群组 is_published 决定显示，而不是书籍 status）
        const data = await apiRequest('books?order=title.asc');
        
        if (data && data.length > 0) {
          setBooksList(data);
          
          // 直接从 chapters 表获取章节数据并统计每本书的章节数
          try {
            const chaptersData = await apiRequest('chapters?select=book_id');
            if (chaptersData && Array.isArray(chaptersData)) {
              const countsMap: Record<string, number> = {};
              for (const chapter of chaptersData) {
                const bookId = chapter.book_id;
                countsMap[bookId] = (countsMap[bookId] || 0) + 1;
              }
              setChaptersMap(countsMap);
            }
          } catch (e) {
            // 如果获取章节失败，使用空映射
            console.log('Failed to fetch chapters, using empty counts');
          }
        }
      } catch (err) {
        console.error('Failed to fetch books:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBooks();
  }, []);
  
  // 加载感悟数据（从所有书籍的笔记中读取）
  useEffect(() => {
    const loadInsights = () => {
      const allInsights: any[] = [];
      const keys = Object.keys(localStorage).filter(k => k.startsWith('notes_'));
      
      keys.forEach(key => {
        const bookId = key.replace('notes_', '');
        const book = booksList.find(b => b.id === bookId);
        const notes = localStorage.getItem(key);
        if (notes) {
          try {
            const notesList = JSON.parse(notes);
            notesList.forEach((note: any) => {
              allInsights.push({
                book: book?.title || bookId,
                bookId: bookId,
                text: note.content,
                chapter: note.chapterIndex,
                createdAt: note.createdAt
              });
            });
          } catch (e) {
            console.error('Failed to parse notes:', e);
          }
        }
      });
      
      // 按时间排序，最新的在前
      allInsights.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setMyInsights(allInsights);
    };
    
    if (booksList.length > 0) {
      loadInsights();
    }
  }, [booksList]);
  
  // 收集所有被引用的群组ID（即子群组）
  const getAllChildGroupIds = () => {
    const childIds = new Set<string>();
    groupsList.forEach(g => {
      if (g.group_ids && Array.isArray(g.group_ids)) {
        g.group_ids.forEach((id: string) => childIds.add(id));
      }
    });
    return childIds;
  };
  
  // 获取顶级群组（没有 parent_id 且不在任何群组的 group_ids 中的群组，或者有 group_ids 的群组）
  const getTopLevelGroups = () => {
    const childIds = getAllChildGroupIds();
    return groupsList.filter(g => {
      // 有 group_ids 的群组是顶级群组（它包含其他群组或书籍）
      if (g.group_ids && g.group_ids.length > 0) {
        return g.is_published !== false;
      }
      // 没有 group_ids 且没有被任何其他群组引用的群组也是顶级群组
      if (!childIds.has(g.id)) {
        return g.is_published !== false;
      }
      return false;
    });
  };
  
  // 获取子群组（出现在 parentGroup 的 group_ids 中的群组）
  const getChildGroups = (parentGroupId: string) => {
    const parentGroup = groupsList.find(g => g.id === parentGroupId);
    if (!parentGroup || !parentGroup.group_ids || parentGroup.group_ids.length === 0) {
      return [];
    }
    return groupsList.filter(g => parentGroup.group_ids.includes(g.id) && g.is_published !== false);
  };
  
  // 获取直接属于某个群组的书籍
  const getDirectGroupBooks = (groupId: string) => {
    const group = groupsList.find(g => g.id === groupId);
    if (!group || !group.book_ids || group.book_ids.length === 0) return [];
    return booksList.filter(b => group.book_ids?.includes(b.id));
  };

  // 获取未分组书籍（没有分配到任何群组的书籍）
  // 容错处理：如果 books 没有 status 列或 book_groups 为空，也正常显示
  const getUngroupedBooks = () => {
    // 如果没有群组数据，返回所有书籍
    if (groupsList.length === 0) {
      return booksList;
    }
    
    // 获取所有已分配到群组的书籍 ID
    const groupedBookIds = new Set<string>();
    groupsList.forEach(group => {
      if (group.book_ids) {
        group.book_ids.forEach(id => groupedBookIds.add(id));
      }
    });
    // 返回未分配到任何群组的书籍（容错：没有 status 字段的也显示）
    return booksList.filter(b => (b.status === 'published' || !b.status) && !groupedBookIds.has(b.id));
  };

  // 切换展开状态
  const toggleGroupExpand = (groupId: string, groupName: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
      // 同时移除 breadcrumb 中的该项及其后续
      setBreadcrumb(prev => prev.filter(item => item.id !== groupId));
    } else {
      newExpanded.add(groupId);
      setBreadcrumb(prev => [...prev, { id: groupId, name: groupName }]);
    }
    setExpandedGroups(newExpanded);
  };
  
  // 后退到上一层
  const goBack = () => {
    const newExpanded = new Set(expandedGroups);
    if (breadcrumb.length > 0) {
      const lastItem = breadcrumb[breadcrumb.length - 1];
      newExpanded.delete(lastItem.id);
      setExpandedGroups(newExpanded);
      setBreadcrumb(prev => prev.slice(0, -1));
    }
  };
  
  // 回到根目录
  const goToRoot = () => {
    setExpandedGroups(new Set());
    setBreadcrumb([]);
  };
  
  // 当前显示的内容
  const getCurrentContent = () => {
    if (breadcrumb.length === 0) {
      // 显示顶级群组
      return { type: 'groups' as const, groups: getTopLevelGroups() };
    } else {
      const currentGroupId = breadcrumb[breadcrumb.length - 1].id;
      const childGroups = getChildGroups(currentGroupId);
      if (childGroups.length > 0) {
        return { type: 'groups' as const, groups: childGroups };
      } else {
        return { type: 'books' as const, books: getDirectGroupBooks(currentGroupId) };
      }
    }
  };

  // 获取未分组书籍（用于首页显示）
  const ungroupedBooks = getUngroupedBooks();
  
  const filteredReligions = religionsList.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBooks = booksList.filter(b =>
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.religion.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const bookshelfBooks = booksList.filter(b => myBookshelf.includes(b.id));

  const toggleBookshelf = (bookId: string) => {
    const newBookshelf = myBookshelf.includes(bookId) 
      ? myBookshelf.filter(id => id !== bookId) 
      : [...myBookshelf, bookId];
    setMyBookshelf(newBookshelf);
    try {
      localStorage.setItem('myBookshelf', JSON.stringify(newBookshelf));
    } catch (e) {
      console.error('Failed to save bookshelf:', e);
    }
  };

  return (
    <div
      className="min-h-screen pb-20 theme-transition"
      style={{ backgroundColor: 'var(--bg-color)' }}
    >
      <header
        className="sticky top-0 z-40 px-4 py-3 border-b theme-transition"
        style={{ backgroundColor: 'var(--bg-color)', borderColor: 'var(--border-color)' }}
      >
        <div className="mb-3">
          <div
            className="flex items-center h-10 px-4 rounded-xl"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <Search className="w-4 h-4 mr-2" style={{ color: 'var(--icon-color)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'encyclopedia' ? (t('learn.searchReligion') || '搜索宗教...') : activeTab === 'library' ? (t('learn.searchBook') || '搜索经典...') : (t('learn.searchHoliday') || '搜索节日...')}
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: 'var(--text-color)' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}>
                <X className="w-4 h-4" style={{ color: 'var(--icon-color)' }} />
              </button>
            )}
          </div>
        </div>
        <div
          className="flex items-center justify-around"
        >
          {[
            { id: 'encyclopedia', label: t('learn.encyclopedia'), icon: BookOpen },
            { id: 'library', label: t('learn.library'), icon: Library },
            { id: 'calendar', label: t('learn.calendar'), icon: Calendar },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1 px-6 py-2 text-sm font-medium transition-colors"
              style={{
                color: activeTab === tab.id ? PRIMARY_COLOR : 'var(--text-secondary)',
              }}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div className="p-4">

        {activeTab === 'encyclopedia' && (
          <div>
            <h2 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>{t('learn.faithEncyclopedia') || '信仰百科'}</h2>
            <div className="space-y-3">
              {filteredReligions.map((religion) => (
                <div
                  key={religion.id}
                  onClick={() => navigate(`/religion/${religion.id}`)}
                  className="flex items-center gap-4 p-4 rounded-xl border shadow-sm cursor-pointer theme-transition"
                  style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
                >
                  <div className="flex-1">
                    <h3 className="font-medium" style={{ color: 'var(--text-color)' }}>{religion.name}</h3>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('learn.globalFollowers') || '全球信徒'} {religion.followers_scale}</p>
                  </div>
                  <ChevronRight className="w-5 h-5" style={{ color: 'var(--icon-color)' }} />
                </div>
              ))}
              {filteredReligions.length === 0 && (
                <p className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>{t('learn.noReligionFound') || '未找到相关宗教'}</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'library' && (
          <div>
            <div className="flex items-center justify-center gap-3 mb-4">
              {[
                { id: 'library', label: '经典藏书' },
                { id: 'bookshelf', label: t('learn.myBookshelf') },
                { id: 'insights', label: t('learn.myInsights') },
                { id: 'history', label: '阅读历史' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setLibraryTab(tab.id)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap"
                  style={{
                    backgroundColor: libraryTab === tab.id ? PRIMARY_COLOR : 'var(--bg-secondary)',
                    color: libraryTab === tab.id ? '#FFFFFF' : 'var(--text-secondary)',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {libraryTab === 'library' && (
              <div className="space-y-3">
                {loading ? (
                  <p className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>{t('common.loading')}</p>
                ) : (
                  <>
                    {/* 面包屑导航 */}
                    {breadcrumb.length > 0 && (
                      <div className="flex items-center gap-2 mb-4 overflow-x-auto whitespace-nowrap pb-2">
                        <button
                          onClick={goToRoot}
                          className="text-sm px-3 py-1.5 rounded-full"
                          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                        >
                          首页
                        </button>
                        {breadcrumb.map((item, idx) => (
                          <React.Fragment key={item.id}>
                            <span style={{ color: 'var(--text-secondary)' }}>/</span>
                            <button
                              onClick={() => {
                                // 点击中间的面包屑，回到那一层
                                const newBreadcrumb = breadcrumb.slice(0, idx + 1);
                                setBreadcrumb(newBreadcrumb);
                                if (idx < breadcrumb.length - 1) {
                                  // 如果点击的不是最后一个，需要重新计算展开状态
                                  const newExpanded = new Set<string>();
                                  newBreadcrumb.forEach(b => newExpanded.add(b.id));
                                  setExpandedGroups(newExpanded);
                                }
                              }}
                              className="text-sm px-3 py-1.5 rounded-full"
                              style={{ 
                                backgroundColor: idx === breadcrumb.length - 1 ? PRIMARY_COLOR : 'var(--bg-secondary)',
                                color: idx === breadcrumb.length - 1 ? '#fff' : 'var(--text-secondary)'
                              }}
                            >
                              {item.name}
                            </button>
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                    
                    {/* 内容列表 */}
                    {(() => {
                      const content = getCurrentContent();
                      if (content.type === 'groups') {
                        return (
                          <>
                            {/* 群组列表 */}
                            {content.groups.length > 0 && (
                              <div className="space-y-3">
                                {content.groups.map((group) => {
                                  const childGroups = getChildGroups(group.id);
                                  const groupBooks = getDirectGroupBooks(group.id);
                                  const hasChildren = childGroups.length > 0 || groupBooks.length > 0;
                                  return (
                                    <div
                                      key={group.id}
                                      className="flex items-center gap-4 p-4 rounded-xl border shadow-sm cursor-pointer theme-transition"
                                      style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
                                      onClick={() => hasChildren && toggleGroupExpand(group.id, group.name)}
                                    >
                                      <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                                        style={{ backgroundColor: `${PRIMARY_COLOR}15` }}
                                      >
                                        <Library className="w-6 h-6" style={{ color: PRIMARY_COLOR }} />
                                      </div>
                                      <div className="flex-1">
                                        <h3 className="font-medium" style={{ color: 'var(--text-color)' }}>{group.name}</h3>
                                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                          {childGroups.length > 0 && `${childGroups.length} 个子分类`}
                                          {childGroups.length > 0 && groupBooks.length > 0 && ' · '}
                                          {groupBooks.length > 0 && `${groupBooks.length} 卷`}
                                        </p>
                                      </div>
                                      {hasChildren && (
                                        expandedGroups.has(group.id) ? (
                                          <ChevronRight className="w-5 h-5" style={{ color: 'var(--icon-color)', transform: 'rotate(90deg)' }} />
                                        ) : (
                                          <ChevronRight className="w-5 h-5" style={{ color: 'var(--icon-color)' }} />
                                        )
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            
                            {/* 未分组书籍（首页显示） */}
                            {breadcrumb.length === 0 && ungroupedBooks.length > 0 && (
                              <div className="mt-6">
                                <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
                                  其他藏书
                                </h3>
                                <div className="space-y-3">
                                  {ungroupedBooks.map((book) => (
                                    <div
                                      key={book.id}
                                      className="flex items-center gap-4 p-4 rounded-xl border shadow-sm cursor-pointer theme-transition"
                                      style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
                                      onClick={() => navigate(`/book/${book.id}`)}
                                    >
                                      <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                                        style={{ backgroundColor: `${PRIMARY_COLOR}15` }}
                                      >
                                        <BookOpen className="w-6 h-6" style={{ color: PRIMARY_COLOR }} />
                                      </div>
                                      <div className="flex-1">
                                        <h3 className="font-medium" style={{ color: 'var(--text-color)' }}>{book.title}</h3>
                                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                          {book.religion || '经典'}
                                          {chaptersMap[book.id] ? ` · ${chaptersMap[book.id]} ${t('learn.chapters') || '章'}` : ''}
                                        </p>
                                      </div>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); toggleBookshelf(book.id); }}
                                        className="p-2"
                                      >
                                        <Bookmark
                                          className="w-5 h-5"
                                          style={{
                                            color: myBookshelf.includes(book.id) ? PRIMARY_COLOR : 'var(--icon-color)',
                                            fill: myBookshelf.includes(book.id) ? PRIMARY_COLOR : 'none',
                                          }}
                                        />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* 无内容提示 */}
                            {content.groups.length === 0 && breadcrumb.length === 0 && ungroupedBooks.length === 0 && (
                              <p className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>暂无藏书</p>
                            )}
                          </>
                        );
                      } else {
                        // 显示书籍列表
                        if (content.books.length === 0) {
                          return <p className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>暂无藏书</p>;
                        }
                        return content.books.map((book) => (
                          <div
                            key={book.id}
                            className="flex items-center gap-4 p-4 rounded-xl border shadow-sm cursor-pointer theme-transition"
                            style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
                            onClick={() => navigate(`/book/${book.id}`)}
                          >
                            <div
                              className="w-12 h-12 rounded-xl flex items-center justify-center"
                              style={{ backgroundColor: `${PRIMARY_COLOR}15` }}
                            >
                              <BookOpen className="w-6 h-6" style={{ color: PRIMARY_COLOR }} />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium" style={{ color: 'var(--text-color)' }}>{book.title}</h3>
                              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{book.religion}{chaptersMap[book.id] ? ` · ${chaptersMap[book.id]} ${t('learn.chapters') || '章'}` : ''}</p>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleBookshelf(book.id); }}
                              className="p-2"
                            >
                              <Bookmark
                                className="w-5 h-5"
                                style={{
                                  color: myBookshelf.includes(book.id) ? PRIMARY_COLOR : 'var(--icon-color)',
                                  fill: myBookshelf.includes(book.id) ? PRIMARY_COLOR : 'none',
                                }}
                              />
                            </button>
                            <ChevronRight className="w-5 h-5" style={{ color: 'var(--icon-color)' }} />
                          </div>
                        ));
                      }
                    })()}
                  </>
                )}
              </div>
            )}

            {libraryTab === 'bookshelf' && (
              <div className="space-y-3">
                {bookshelfBooks.map((book) => {
                  // 获取阅读进度
                  const progressKey = `reading_progress_${book.id}`;
                  const savedProgress = localStorage.getItem(progressKey);
                  const progress = savedProgress ? JSON.parse(savedProgress) : null;
                  
                  return (
                    <div
                      key={book.id}
                      className="flex items-center gap-4 p-4 rounded-xl border shadow-sm cursor-pointer theme-transition"
                      style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
                      onClick={() => navigate(`/book/${book.id}`)}
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${PRIMARY_COLOR}15` }}
                      >
                        <BookOpen className="w-6 h-6" style={{ color: PRIMARY_COLOR }} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium" style={{ color: 'var(--text-color)' }}>{book.title}</h3>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {book.religion}{chaptersMap[book.id] ? ` · ${chaptersMap[book.id]} ${t('learn.chapters') || '章'}` : ''}
                          {progress && (
                            <span className="ml-2" style={{ color: PRIMARY_COLOR }}>
                              已读 {progress.chapterIndex + 1}/
                            </span>
                          )}
                        </p>
                        {progress && (
                          <div className="h-1 rounded-full mt-1" style={{ backgroundColor: 'var(--border-color)' }}>
                            <div 
                              className="h-full rounded-full" 
                              style={{ 
                                width: `${Math.round(((progress.chapterIndex + 1) / (chaptersMap[book.id] || 1)) * 100)}%`,
                                backgroundColor: PRIMARY_COLOR 
                              }} 
                            />
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleBookshelf(book.id); }}
                        className="p-2"
                      >
                        <X className="w-5 h-5" style={{ color: 'var(--icon-color)' }} />
                      </button>
                    </div>
                  );
                })}
                {bookshelfBooks.length === 0 && (
                  <p className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>{t('learn.emptyBookshelf') || '书架为空，去藏书库添加吧'}</p>
                )}
              </div>
            )}

            {libraryTab === 'insights' && (
              <div className="space-y-3">
                {myInsights.length === 0 ? (
                  <p className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>{t('learn.noInsights') || '暂无感悟，阅读时长按段落收藏'}</p>
                ) : (
                  myInsights.map((insight, idx) => (
                    <div
                      key={idx}
                      onClick={() => navigate(`/book/${insight.bookId}?insight=${insight.id}`)}
                      className="p-4 rounded-xl border theme-transition cursor-pointer hover:opacity-80 relative"
                      style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: PRIMARY_COLOR }} />
                      <p className="text-sm line-clamp-3 pl-3" style={{ color: 'var(--text-color)' }}>{insight.text}</p>
                      <div className="flex items-center justify-between mt-2 pl-3">
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('learn.from') || '来自'}《{insight.book}》</p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{new Date(insight.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {libraryTab === 'history' && (
              <ReadingHistory />
            )}
          </div>
        )}

        {activeTab === 'calendar' && (
          <div>
            <CalendarView searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

export default Learn;

// 阅读历史组件
const ReadingHistory: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);
  const navigate = useNavigate();
  
  useEffect(() => {
    const savedHistory = localStorage.getItem('reading_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);
  
  const clearHistory = () => {
    localStorage.removeItem('reading_history');
    setHistory([]);
  };
  
  if (history.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-secondary)' }} />
        <p style={{ color: 'var(--text-secondary)' }}>暂无阅读记录</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      <div className="flex justify-end mb-2">
        <button
          onClick={clearHistory}
          className="text-sm px-3 py-1 rounded"
          style={{ color: '#ef4444', backgroundColor: 'var(--bg-secondary)' }}
        >
          清空记录
        </button>
      </div>
      {history.map((item, idx) => (
        <div
          key={idx}
          onClick={() => navigate(`/book/${item.bookId}`)}
          className="p-4 rounded-xl border theme-transition cursor-pointer hover:opacity-80"
          style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium" style={{ color: 'var(--text-color)' }}>{item.bookTitle}</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {item.chapterTitle}
              </p>
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {new Date(item.lastReadAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
