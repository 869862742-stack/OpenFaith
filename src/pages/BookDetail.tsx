// v3fix - 完整修复所有问题
/* @sideEffects */
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Bookmark, Menu, X, Sun, Moon, Search, Type, BookOpen, Download, Check, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '../contexts/ThemeContext';
import { getGroupCache, setGroupCache, saveDownloadedBook, isBookDownloaded } from '../utils/bookCache';
// 使用 /sb-api/ 接口获取数据（与 Learn.tsx 一致）
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

// data fetching
interface Chapter {
  id: string;
  book_id: string;
  number: number;
  title: string;
  content: string;
  volume?: string;
}

interface Book {
  id: string;
  title: string;
  religion: string;
  category: string;
  description: string;
}

interface Note {
  id: string;
  bookId: string;
  chapterIndex: number;
  chapterId: string;
  content: string;
  createdAt: string;
}

interface ReadingHistory {
  bookId: string;
  bookTitle: string;
  chapterIndex: number;
  chapterTitle: string;
  lastReadAt: string;
}

interface BookGroup {
  id: string;
  name: string;
  parent_id?: string;
  book_ids: string[];
  group_ids: string[];
  is_published?: boolean;
}

interface SearchResult {
  chapterId: string;
  chapterTitle: string;
  bookId: string;
  bookTitle: string;
  text: string;
  groupChapterIndex: number;
  matchedText: string; // 匹配的完整句子/节
}

const READER_SETTINGS_KEY = 'reader_settings';

interface ReaderSettings {
  fontSize: number;
  lineHeight: number;
  readerTheme: 'light' | 'sepia' | 'dark';
  pageMode: 'scroll' | 'swipe';
}

// 加载阅读设置
const loadReaderSettings = (): ReaderSettings => {
  try {
    const saved = localStorage.getItem(READER_SETTINGS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load reader settings:', e);
  }
  return {
    fontSize: 18,
    lineHeight: 1.8,
    readerTheme: 'light',
    pageMode: 'scroll'
  };
};

// 保存阅读设置
const saveReaderSettings = (settings: ReaderSettings) => {
  try {
    localStorage.setItem(READER_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save reader settings:', e);
  }
};

const BookDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { primaryColor, isDark, toggleTheme } = useThemeContext();
  
  const contentRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndX = useRef(0);
  const touchEndY = useRef(0);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadedRef = useRef(false);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const chapterTransitionRef = useRef(false); // 用于防止章节切换过程中重复触发翻页

  // 滚动到高亮位置（带重试）
  // 查找包含指定文字的段落并居中滚动（不依赖data-highlight属性，更可靠）
  const scrollToText = (targetText: string, maxRetries: number = 20, interval: number = 200) => {
    let retries = 0;
    
    const tryScroll = () => {
      if (!targetText || !contentRef.current) return true;
      
      // 方法1：查找data-highlight属性
      const highlightEl = document.querySelector('[data-highlight="true"]');
      if (highlightEl) {
        const container = contentRef.current;
        const containerRect = container.getBoundingClientRect();
        const elementRect = highlightEl.getBoundingClientRect();
        const scrollTarget = container.scrollTop + elementRect.top - containerRect.top - (containerRect.height / 2) + (elementRect.height / 2);
        container.scrollTo({ top: Math.max(0, scrollTarget), behavior: 'smooth' });
        return true;
      }
      
      // 方法2：遍历所有段落，查找包含目标文字的元素
      const container = contentRef.current;
      const paragraphs = container.querySelectorAll('p');
      for (const p of paragraphs) {
        if (p.textContent && p.textContent.includes(targetText)) {
          const containerRect = container.getBoundingClientRect();
          const elementRect = p.getBoundingClientRect();
          const scrollTarget = container.scrollTop + elementRect.top - containerRect.top - (containerRect.height / 2) + (elementRect.height / 2);
          container.scrollTo({ top: Math.max(0, scrollTarget), behavior: 'smooth' });
          // 同时给这个段落加一个临时高亮
          p.style.backgroundColor = `${primaryColor}20`;
          p.style.transition = 'background-color 0.3s';
          setTimeout(() => { p.style.backgroundColor = ''; }, 5000);
          return true;
        }
      }
      
      return false;
    };
    
    const attemptScroll = () => {
      retries++;
      if (!tryScroll() && retries < maxRetries) {
        setTimeout(attemptScroll, interval);
      }
    };
    
    // 立即尝试一次
    if (!tryScroll()) {
      attemptScroll();
    }
  };

  // 保留旧名称作为别名
  const scrollToHighlightWithRetry = scrollToText;

  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [showChapterList, setShowChapterList] = useState(false);
  const [showVolumeSelector, setShowVolumeSelector] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // 从 localStorage 加载阅读设置
  const [fontSize, setFontSizeState] = useState(() => loadReaderSettings().fontSize);
  const [lineHeight, setLineHeightState] = useState(() => loadReaderSettings().lineHeight);
  const [myBookshelf, setMyBookshelf] = useState<string[]>([]);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [volumes, setVolumes] = useState<string[]>([]);
  const [volumeNames, setVolumeNames] = useState<Record<string, string>>({}); // volume编号→卷名映射
  const [selectedVolume, setSelectedVolume] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [pageMode, setPageModeState] = useState<'scroll' | 'swipe'>(() => loadReaderSettings().pageMode);
  const [selectionMenu, setSelectionMenu] = useState<{visible: boolean; text: string; x: number; y: number}>({visible: false, text: '', x: 0, y: 0});
  const [notes, setNotes] = useState<Note[]>([]);
  const [groupBooks, setGroupBooks] = useState<Book[]>([]);
  const [groupChapters, setGroupChapters] = useState<Chapter[]>([]);
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [highlightChapterId, setHighlightChapterId] = useState<string | null>(null);
  const [highlightText, setHighlightText] = useState<string>('');
  const [urlParamsProcessed, setUrlParamsProcessed] = useState(false);
  const [readerTheme, setReaderThemeState] = useState<'light' | 'sepia' | 'dark'>(() => loadReaderSettings().readerTheme);
  const [hasReachedBottom, setHasReachedBottom] = useState(false);
  const [keepScreenOn, setKeepScreenOn] = useState(false); // 亮屏模式
  
  // swipe模式分页相关状态
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pageContent, setPageContent] = useState<string[]>([]);
  const [isChapterTransitioning, setIsChapterTransitioning] = useState(false); // 章节切换中，用于禁用过渡动画
  const swipeContainerRef = useRef<HTMLDivElement>(null);

  // 设置更新函数（带持久化）
  const setFontSize = useCallback((size: number) => {
    const newSize = Math.min(28, Math.max(12, size));
    setFontSizeState(newSize);
    const settings = loadReaderSettings();
    saveReaderSettings({ ...settings, fontSize: newSize });
  }, []);

  const setLineHeight = useCallback((height: number) => {
    const newHeight = Math.min(2.5, Math.max(1.2, height));
    setLineHeightState(newHeight);
    const settings = loadReaderSettings();
    saveReaderSettings({ ...settings, lineHeight: newHeight });
  }, []);

  const setPageMode = useCallback((mode: 'scroll' | 'swipe') => {
    setPageModeState(mode);
    const settings = loadReaderSettings();
    saveReaderSettings({ ...settings, pageMode: mode });
  }, []);

  const setReaderTheme = useCallback((theme: 'light' | 'sepia' | 'dark') => {
    setReaderThemeState(theme);
    const settings = loadReaderSettings();
    saveReaderSettings({ ...settings, readerTheme: theme });
    applyReaderTheme(theme);
  }, []);

  // 阅读主题配置
  const readerThemes = useMemo(() => ({
    light: {
      name: t('reader.day'),
      bg: '#ffffff',
      text: '#1f2937',
      secondary: '#6b7280',
      bgSecondary: '#f3f4f6',
      icon: Sun
    },
    sepia: {
      name: t('reader.eyeProtection'),
      bg: '#f5f0e1',
      text: '#5c4b37',
      secondary: '#8b7355',
      bgSecondary: '#e8dcc8',
      icon: BookOpen
    },
    dark: {
      name: t('reader.night'),
      bg: '#1a1a1a',
      text: '#d1d5db',
      secondary: '#9ca3af',
      bgSecondary: '#2d2d2d',
      icon: Moon
    }
  }), [t]);

  // 切换阅读主题
  const applyReaderTheme = (theme: 'light' | 'sepia' | 'dark') => {
    const config = readerThemes[theme];
    const root = document.documentElement;
    root.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
    root.style.setProperty('--bg-color', config.bg);
    root.style.setProperty('--text-color', config.text);
    root.style.setProperty('--card-bg', config.bgSecondary);
    root.style.setProperty('--border-color', theme === 'sepia' ? '#d4c5a9' : theme === 'dark' ? '#404040' : '#e5e7eb');
    root.style.setProperty('--icon-color', config.secondary);
    root.style.setProperty('--text-secondary', config.secondary);
    root.style.setProperty('--bg-secondary', config.bgSecondary);
  };

  // 初始化阅读主题（保存原始样式以便退出时恢复）
  useEffect(() => {
    // 保存原始的 CSS 变量值
    const originalBgColor = document.documentElement.style.getPropertyValue('--bg-color') || getComputedStyle(document.documentElement).getPropertyValue('--bg-color');
    const originalTextColor = document.documentElement.style.getPropertyValue('--text-color') || getComputedStyle(document.documentElement).getPropertyValue('--text-color');
    const originalCardBg = document.documentElement.style.getPropertyValue('--card-bg') || getComputedStyle(document.documentElement).getPropertyValue('--card-bg');
    const originalBorderColor = document.documentElement.style.getPropertyValue('--border-color') || getComputedStyle(document.documentElement).getPropertyValue('--border-color');
    const originalIconColor = document.documentElement.style.getPropertyValue('--icon-color') || getComputedStyle(document.documentElement).getPropertyValue('--icon-color');
    const originalTextSecondary = document.documentElement.style.getPropertyValue('--text-secondary') || getComputedStyle(document.documentElement).getPropertyValue('--text-secondary');
    const originalBgSecondary = document.documentElement.style.getPropertyValue('--bg-secondary') || getComputedStyle(document.documentElement).getPropertyValue('--bg-secondary');
    const originalDataTheme = document.documentElement.getAttribute('data-theme');
    
    // 应用阅读主题
    applyReaderTheme(readerTheme);
    
    // 组件卸载时恢复原始样式
    return () => {
      const root = document.documentElement;
      if (originalBgColor) root.style.setProperty('--bg-color', originalBgColor);
      if (originalTextColor) root.style.setProperty('--text-color', originalTextColor);
      if (originalCardBg) root.style.setProperty('--card-bg', originalCardBg);
      if (originalBorderColor) root.style.setProperty('--border-color', originalBorderColor);
      if (originalIconColor) root.style.setProperty('--icon-color', originalIconColor);
      if (originalTextSecondary) root.style.setProperty('--text-secondary', originalTextSecondary);
      if (originalBgSecondary) root.style.setProperty('--bg-secondary', originalBgSecondary);
      if (originalDataTheme) {
        root.setAttribute('data-theme', originalDataTheme);
      } else {
        root.removeAttribute('data-theme');
      }
    };
  }, []);

  // 亮屏模式控制
  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('Wake Lock activated');
        
        wakeLockRef.current.addEventListener('release', () => {
          console.log('Wake Lock released');
        });
      }
    } catch (err) {
      console.error('Failed to activate Wake Lock:', err);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch (err) {
      console.error('Failed to release Wake Lock:', err);
    }
  }, []);

  // 监听页面可见性变化，重新获取 Wake Lock
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (keepScreenOn && document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [keepScreenOn, requestWakeLock]);

  // 切换亮屏模式
  const toggleKeepScreenOn = useCallback(async () => {
    if (keepScreenOn) {
      await releaseWakeLock();
      setKeepScreenOn(false);
    } else {
      await requestWakeLock();
      setKeepScreenOn(true);
    }
  }, [keepScreenOn, requestWakeLock, releaseWakeLock]);

  // 组件卸载时释放 Wake Lock
  useEffect(() => {
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
      }
    };
  }, []);

  // 监听 URL search 参数变化，当参数变化时重置 urlParamsProcessed
  useEffect(() => {
    const chapterId = searchParams.get('chapterId');
    const chapterIndex = searchParams.get('chapterIndex');
    const highlight = searchParams.get('highlight');
    if ((chapterId || chapterIndex || highlight) && urlParamsProcessed) {
      setUrlParamsProcessed(false);
    }
  }, [searchParams, urlParamsProcessed]);

  // 处理 URL 参数中的高亮信息（在 chapters 加载完成后执行）
  useEffect(() => {
    if (chapters.length === 0 || urlParamsProcessed) return;
    
    const params = new URLSearchParams(window.location.search);
    const chapterId = params.get('chapterId');
    const chapterIndexParam = params.get('chapterIndex');
    const highlight = params.get('highlight');
    
    // 支持 chapterIndex 参数（从感悟页面跳转）
    if (!chapterId && chapterIndexParam) {
      const idx = parseInt(chapterIndexParam, 10);
      if (!isNaN(idx) && idx >= 0 && idx < chapters.length) {
        setCurrentChapterIndex(idx);
        setUrlParamsProcessed(true);
        
        if (highlight) {
          const decodedHighlight = decodeURIComponent(highlight);
          setHighlightChapterId(chapters[idx].id);
          setHighlightText(decodedHighlight);
          
          // 轮询查找高亮元素并居中滚动
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              scrollToText(decodedHighlight, 20, 200);
            });
          });
          
          if (highlightTimeoutRef.current) {
            clearTimeout(highlightTimeoutRef.current);
          }
          highlightTimeoutRef.current = setTimeout(() => {
            setHighlightChapterId(null);
            setHighlightText('');
          }, 3000);
        }
        return;
      }
    }
    
    if (chapterId) {
      const chapterIndex = chapters.findIndex(ch => ch.id === chapterId);
      if (chapterIndex >= 0) {
        setCurrentChapterIndex(chapterIndex);
        
        if (highlight) {
          const decodedHighlight = decodeURIComponent(highlight);
          setHighlightChapterId(chapterId);
          setHighlightText(decodedHighlight);
          
          // 轮询查找高亮元素并居中滚动
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              scrollToText(decodedHighlight, 20, 200);
            });
          });
          
          // 5秒后清除高亮
          if (highlightTimeoutRef.current) {
            clearTimeout(highlightTimeoutRef.current);
          }
          highlightTimeoutRef.current = setTimeout(() => {
            setHighlightChapterId(null);
            setHighlightText('');
          }, 5000);
        }
      }
      
      // 清除 URL 参数
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }
    
    setUrlParamsProcessed(true);
  }, [chapters, urlParamsProcessed]);

  // 递归收集所有群组的书籍ID（包括子群组）
  const collectAllBookIds = useCallback((groupId: string, groupsData: BookGroup[], collected: Set<string> = new Set()): Set<string> => {
    const group = groupsData.find(g => g.id === groupId);
    if (!group) return collected;
    
    // 添加直接书籍
    if (group.book_ids) {
      group.book_ids.forEach(bid => collected.add(bid));
    }
    
    // 递归处理子群组
    if (group.group_ids && group.group_ids.length > 0) {
      group.group_ids.forEach(subGroupId => {
        collectAllBookIds(subGroupId, groupsData, collected);
      });
    }
    
    return collected;
  }, []);

  // 优化：并行加载所有数据
  useEffect(() => {
    if (!id) return;
    loadedRef.current = true;
    setUrlParamsProcessed(false); // 重置 URL 参数处理状态
    
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 并行请求：书籍信息、群组信息、书架状态
        const [bookData, groupsData, savedShelf] = await Promise.all([
          apiRequest(`books?id=eq.${id}`),
          apiRequest('book_groups'),
          Promise.resolve(localStorage.getItem('myBookshelf'))
        ]);
        
        let bookItem: Book | null = null;
        if (bookData) {
          bookItem = Array.isArray(bookData) ? bookData[0] : (bookData.id ? bookData : null);
        }
        
        if (!bookItem) {
          setLoading(false);
          return;
        }
        
        setBook(bookItem);
        
        // 恢复书架状态
        if (savedShelf) {
          const shelf = JSON.parse(savedShelf);
          setMyBookshelf(shelf);
          setIsBookmarked(shelf.includes(id));
        }
        
        // 查找当前书籍所属的群组（优先找顶层/根群组）
        let rootGroupId: string | null = null;
        let directGroupId: string | null = null;
        let allBookIds: string[] = [id];
        
        if (groupsData && Array.isArray(groupsData)) {
          // 构建父子关系映射
          const childToParent: Record<string, string> = {};
          groupsData.forEach(g => {
            if (g.group_ids) {
              g.group_ids.forEach(subId => {
                childToParent[subId] = g.id;
              });
            }
          });
          
          // 找到包含当前书籍的群组
          for (const group of groupsData) {
            // 直接包含此书籍的群组
            if (group.book_ids?.includes(id)) {
              directGroupId = group.id;
              // 向上查找根群组
              let currentId = group.id;
              while (childToParent[currentId]) {
                currentId = childToParent[currentId];
              }
              rootGroupId = currentId;
              break;
            }
            // 检查子群组
            if (group.group_ids?.length > 0) {
              for (const subGroupId of group.group_ids) {
                const subGroup = groupsData.find((g: BookGroup) => g.id === subGroupId);
                if (subGroup?.book_ids?.includes(id)) {
                  directGroupId = subGroupId;
                  // 向上查找根群组
                  let currentId = group.id;
                  while (childToParent[currentId]) {
                    currentId = childToParent[currentId];
                  }
                  rootGroupId = currentId;
                  break;
                }
              }
            }
            if (rootGroupId) break;
          }
          
          // 如果找到了根群组，收集所有书籍ID
          if (rootGroupId) {
            const collected = collectAllBookIds(rootGroupId, groupsData);
            allBookIds = Array.from(collected);
          } else if (directGroupId) {
            // 没有找到根群组，使用直接群组
            const collected = collectAllBookIds(directGroupId, groupsData);
            allBookIds = Array.from(collected);
            rootGroupId = directGroupId;
          }
        }
        
        setCurrentGroupId(rootGroupId);
        
        // 检查群组缓存
        let cachedGroup = rootGroupId ? getGroupCache(rootGroupId) : null;
        let booksInGroup: Book[] = [];
        let chaptersInGroup: Chapter[] = [];
        
        if (cachedGroup && cachedGroup.books.length > 0 && cachedGroup.books.length === allBookIds.length) {
          // 使用缓存数据（仅当缓存书籍数量匹配时）
          booksInGroup = cachedGroup.books;
          chaptersInGroup = cachedGroup.chapters;
        } else {
          // 并行获取所有书籍和章节（分页获取，支持超过1000章的书籍）
          const bookPromises = allBookIds.map(bookId => apiRequest(`books?id=eq.${bookId}`));
          const fetchAllChapters = async (bookId: string) => {
            const all: any[] = [];
            let offset = 0;
            const pageSize = 1000;
            while (true) {
              const batch = await apiRequest(`chapters?book_id=eq.${bookId}&order=volume.asc,number.asc&limit=${pageSize}&offset=${offset}`);
              if (!batch || !Array.isArray(batch) || batch.length === 0) break;
              all.push(...batch);
              if (batch.length < pageSize) break;
              offset += pageSize;
            }
            return all;
          };
          const chapterPromises = allBookIds.map(bookId => fetchAllChapters(bookId));
          
          const [bookResults, chapterResults] = await Promise.all([
            Promise.all(bookPromises),
            Promise.all(chapterPromises)
          ]);
          
          for (const bData of bookResults) {
            if (bData) {
              const bItem = Array.isArray(bData) ? bData[0] : (bData.id ? bData : null);
              if (bItem) booksInGroup.push(bItem);
            }
          }
          
          for (const cData of chapterResults) {
            if (cData && Array.isArray(cData)) {
              chaptersInGroup.push(...cData);
            }
          }
          
          // 按书籍顺序和章节顺序排序
          chaptersInGroup.sort((a, b) => {
            const bookIdxA = allBookIds.indexOf(a.book_id);
            const bookIdxB = allBookIds.indexOf(b.book_id);
            if (bookIdxA !== bookIdxB) return bookIdxA - bookIdxB;
            return a.number - b.number;
          });
          
          // 保存到缓存
          if (rootGroupId) {
            setGroupCache(rootGroupId, booksInGroup, chaptersInGroup);
          }
        }
        
        setGroupBooks(booksInGroup);
        setGroupChapters(chaptersInGroup);
        
        // 设置当前书籍的章节
        const currentBookChapters = chaptersInGroup.filter(ch => ch.book_id === id);
        setChapters(currentBookChapters);
        
        // 恢复上次的阅读位置
        try {
          const saved = localStorage.getItem(`reading_position_${id}`);
          if (saved) {
            const pos = JSON.parse(saved);
            if (pos.chapterIndex >= 0 && pos.chapterIndex < currentBookChapters.length) {
              setCurrentChapterIndex(pos.chapterIndex);
            }
          }
        } catch (e) {
          // ignore
        }
        
        // 提取卷信息（volume编号→卷名映射，从title中提取卷名如"创世记 第1章"→"创世记"）
        const volumeSet = new Set<string>();
        const nameMap: Record<string, string> = {};
        currentBookChapters.forEach((ch: Chapter) => {
          if (ch.volume) {
            volumeSet.add(ch.volume);
            if (!nameMap[ch.volume] && ch.title) {
              // 从title提取卷名，格式如 "创世记 第1章"
              const match = ch.title.match(/^(.+?)\s*第/);
              nameMap[ch.volume] = match ? match[1] : ch.volume;
            }
          }
        });
        const volList = Array.from(volumeSet).sort((a, b) => Number(a) - Number(b));
        setVolumes(volList);
        setVolumeNames(nameMap);
        if (volList.length > 0) setSelectedVolume(volList[0]);
        
        // 恢复阅读进度
        const progressKey = `reading_progress_${id}`;
        const savedProgress = localStorage.getItem(progressKey);
        if (savedProgress) {
          const progress = JSON.parse(savedProgress);
          const savedIndex = currentBookChapters.findIndex(ch => ch.id === progress.chapterId);
          if (savedIndex >= 0) {
            setCurrentChapterIndex(savedIndex);
          }
        }
        
        // 加载感悟
        const notesKey = `notes_${id}`;
        const savedNotes = localStorage.getItem(notesKey);
        if (savedNotes) setNotes(JSON.parse(savedNotes));
        
        // 检查下载状态
        setIsDownloaded(isBookDownloaded(id));
        
      } catch (err) {
        console.error('Failed to fetch book:', err, err?.message, err?.stack);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    return () => {
      loadedRef.current = false;
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, [id, collectAllBookIds]);

  const saveDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // 合并的保存阅读进度和历史（使用 debounce 减少 localStorage 写入）
  useEffect(() => {
    if (!id || !book || chapters.length === 0 || !chapters[currentChapterIndex]) return;
    
    // 清除之前的 debounce
    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current);
    }
    
    // 延迟 500ms 后保存，切换章节时只保存最后一次
    saveDebounceRef.current = setTimeout(() => {
      // 1. 保存阅读进度
      const progress = {
        bookId: id,
        chapterId: chapters[currentChapterIndex].id,
        chapterIndex: currentChapterIndex,
        scrollPosition: 0,
        lastReadAt: new Date().toISOString()
      };
      localStorage.setItem(`reading_progress_${id}`, JSON.stringify(progress));
      
      // 2. 添加到阅读历史
      const history: ReadingHistory = {
        bookId: id,
        bookTitle: book.title,
        chapterIndex: currentChapterIndex,
        chapterTitle: chapters[currentChapterIndex]?.title || `第 ${currentChapterIndex + 1} 章`,
        lastReadAt: new Date().toISOString()
      };
      
      const historyKey = 'reading_history';
      const savedHistory = localStorage.getItem(historyKey);
      let historyList: ReadingHistory[] = savedHistory ? JSON.parse(savedHistory) : [];
      historyList = historyList.filter(h => h.bookId !== id);
      historyList.unshift(history);
      historyList = historyList.slice(0, 20);
      localStorage.setItem(historyKey, JSON.stringify(historyList));
    }, 500);
    
    return () => {
      if (saveDebounceRef.current) {
        clearTimeout(saveDebounceRef.current);
      }
    };
  }, [id, book, currentChapterIndex, chapters]);

  // 选择卷后自动跳到该卷第一章
  useEffect(() => {
    if (selectedVolume) {
      const firstIdx = chapters.findIndex(ch => ch.volume === selectedVolume);
      if (firstIdx >= 0) {
        setCurrentChapterIndex(firstIdx);
      }
    }
  }, [selectedVolume, chapters]);

  // 章节切换时自动滚动到顶部（如果有高亮跳转则跳过，让scrollToText控制）
  useEffect(() => {
    // 重置分页状态
    setCurrentPage(0);
    setHasReachedBottom(false);
    
    // 如果有高亮跳转需求，不设scrollTop=0（让scrollToText控制位置）
    if (highlightText && highlightChapterId) {
      setIsChapterTransitioning(false);
      chapterTransitionRef.current = false;
      return;
    }
    
    // 在章节切换时禁用过渡动画，避免看到内容"滑动"过程
    setIsChapterTransitioning(true);
    chapterTransitionRef.current = true;
    
    // 多重保障确保内容渲染完后再scrollTop=0
    const scrollToTopAfterRender = () => {
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
        contentRef.current.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      }
    };
    
    // 立即尝试
    scrollToTopAfterRender();
    
    // rAF后再试
    const rafId1 = requestAnimationFrame(() => {
      scrollToTopAfterRender();
      const rafId2 = requestAnimationFrame(() => {
        scrollToTopAfterRender();
        // 最终保障：setTimeout后再试
        setTimeout(() => {
          scrollToTopAfterRender();
          setIsChapterTransitioning(false);
          chapterTransitionRef.current = false;
        }, 150);
      });
    });
    
    return () => {
      cancelAnimationFrame(rafId1);
      chapterTransitionRef.current = false;
    };
  }, [currentChapterIndex]);

  // 计算swipe模式下的分页内容
  const calculatePages = useCallback(() => {
    if (!currentChapter || pageMode !== 'swipe') return;
    
    const content = currentChapter.content || '';
    const paragraphs = content.split('\n').filter(p => p.trim());
    
    // 简单分页：按字符数分页
    const charsPerPage = 800;
    let currentCharCount = 0;
    let currentPageParagraphs: string[] = [];
    const pages: string[] = [];
    
    for (const para of paragraphs) {
      currentPageParagraphs.push(para);
      currentCharCount += para.length + 1;
      
      if (currentCharCount >= charsPerPage) {
        pages.push(currentPageParagraphs.join('\n'));
        currentPageParagraphs = [];
        currentCharCount = 0;
      }
    }
    
    // 添加最后一页
    if (currentPageParagraphs.length > 0) {
      pages.push(currentPageParagraphs.join('\n'));
    }
    
    // 确保至少有1页
    if (pages.length === 0) {
      pages.push('');
    }
    
    setPageContent(pages);
    setTotalPages(pages.length);
    setCurrentPage(0);
  }, [currentChapter, pageMode]);

  useEffect(() => {
    calculatePages();
  }, [calculatePages]);

  // 下载当前群组
  const downloadGroup = async () => {
    if (!currentGroupId || groupBooks.length === 0) return;
    
    setIsDownloading(true);
    try {
      for (const b of groupBooks) {
        const all: any[] = [];
        let offset = 0;
        const pageSize = 1000;
        while (true) {
          const batch = await apiRequest(`chapters?book_id=eq.${b.id}&order=volume.asc,number.asc&limit=${pageSize}&offset=${offset}`);
          if (!batch || !Array.isArray(batch) || batch.length === 0) break;
          all.push(...batch);
          if (batch.length < pageSize) break;
          offset += pageSize;
        }
        saveDownloadedBook(b.id, b, all || []);
      }
      setIsDownloaded(true);
      alert('下载成功！可以离线阅读了');
    } catch (err) {
      console.error('Download failed:', err);
      alert('下载失败，请重试');
    } finally {
      setIsDownloading(false);
    }
  };

  const toggleBookmark = () => {
    let newShelf: string[];
    if (isBookmarked) {
      newShelf = myBookshelf.filter(bid => bid !== id);
    } else {
      newShelf = [...myBookshelf, id!];
    }
    setMyBookshelf(newShelf);
    setIsBookmarked(!isBookmarked);
    localStorage.setItem('myBookshelf', JSON.stringify(newShelf));
  };

  const goToPrevChapter = () => {
    if (currentChapterIndex > 0) {
      // 清除高亮状态
      setHighlightChapterId(null);
      setHighlightText('');
      setCurrentChapterIndex(currentChapterIndex - 1);
    }
  };

  const goToNextChapter = () => {
    if (currentChapterIndex < chapters.length - 1) {
      // 清除高亮状态（上一页/下一页不需要高亮）
      setHighlightChapterId(null);
      setHighlightText('');
      setCurrentChapterIndex(currentChapterIndex + 1);
    }
  };



  // 保存阅读位置到localStorage
  useEffect(() => {
    if (id && chapters.length > 0 && currentChapterIndex >= 0) {
      try {
        localStorage.setItem(`reading_position_${id}`, JSON.stringify({
          chapterIndex: currentChapterIndex,
          chapterId: chapters[currentChapterIndex]?.id || '',
          timestamp: Date.now()
        }));
      } catch (e) {
        // ignore
      }
    }
  }, [id, currentChapterIndex, chapters]);
  const goToChapter = (index: number) => {
    setCurrentChapterIndex(index);
    setShowChapterList(false);
    setShowSearch(false);
    setSearchQuery('');
  };

  // 跳转到群组中的任何章节（跨书籍跳转）
  const goToGroupChapter = (result: SearchResult) => {
    setShowSearch(false);
    setSearchQuery('');
    
    if (result.bookId === id) {
      // 同一本书，直接跳转章节
      const chapterIndex = chapters.findIndex(ch => ch.id === result.chapterId);
      if (chapterIndex >= 0) {
        // 先设置高亮文本，再切换章节
        setHighlightText(result.matchedText);
        setHighlightChapterId(result.chapterId);
        setCurrentChapterIndex(chapterIndex);
        
        // 使用 requestAnimationFrame 确保章节内容渲染后再滚动
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(() => {
              scrollToText(result.matchedText, 20, 200);
            }, 100);
          });
        });
        
        // 5秒后清除高亮
        if (highlightTimeoutRef.current) {
          clearTimeout(highlightTimeoutRef.current);
        }
        highlightTimeoutRef.current = setTimeout(() => {
          setHighlightChapterId(null);
          setHighlightText('');
        }, 5000);
      }
    } else {
      // 不同书籍，导航到该书籍，传递高亮文本
      navigate(`/book/${result.bookId}?chapterId=${result.chapterId}&highlight=${encodeURIComponent(result.matchedText)}`);
    }
  };

  // 添加感悟
  const addInsight = (text: string) => {
    if (!text.trim() || !id || !chapters[currentChapterIndex]) return;
    
    const newNote: Note = {
      id: Date.now().toString(),
      bookId: id,
      chapterIndex: currentChapterIndex,
      chapterId: chapters[currentChapterIndex].id,
      content: text.trim(),
      createdAt: new Date().toISOString()
    };
    
    const notesKey = `notes_${id}`;
    const savedNotes = localStorage.getItem(notesKey);
    const existingNotes: Note[] = savedNotes ? JSON.parse(savedNotes) : [];
    const newNotes = [...existingNotes, newNote];
    
    setNotes(newNotes);
    localStorage.setItem(notesKey, JSON.stringify(newNotes));
  };

  // 长按选择文字
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const selection = window.getSelection();
    let selectedText = selection?.toString().trim() || '';
    
    if (!selectedText && (window.getSelection()?.rangeCount || 0) > 0) {
      selectedText = window.getSelection()?.getRangeAt(0).cloneRange()?.toString()?.trim() || '';
    }
    
    if (selectedText) {
      setSelectionMenu({
        visible: true,
        text: selectedText,
        x: e.clientX,
        y: e.clientY
      });
    }
  };

  const copyText = async () => {
    if (selectionMenu.text) {
      try {
        await navigator.clipboard.writeText(selectionMenu.text);
      } catch (err) {
        const textarea = document.createElement('textarea');
        textarea.value = selectionMenu.text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
    }
    setSelectionMenu({visible: false, text: '', x: 0, y: 0});
  };

  const shareText = async () => {
    if (selectionMenu.text && navigator.share) {
      try {
        await navigator.share({
          title: book?.title || '圣经阅读',
          text: selectionMenu.text
        });
      } catch (err) {}
    } else {
      copyText();
    }
    setSelectionMenu({visible: false, text: '', x: 0, y: 0});
  };

  const handleAddInsight = () => {
    if (selectionMenu.text) {
      addInsight(selectionMenu.text);
    }
    setSelectionMenu({visible: false, text: '', x: 0, y: 0});
  };

  // 触摸滑动翻页（修复 swipe 模式分页翻页）
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    touchEndY.current = e.changedTouches[0].clientY;
    
    const diffX = touchEndX.current - touchStartX.current;
    const diffY = touchEndY.current - touchStartY.current;
    
    // 在 scroll 模式下不处理水平滑动
    if (pageMode !== 'swipe') return;
    
    // 只有水平滑动幅度大于垂直滑动时才处理（防止误触）
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      // 如果正在章节切换中，忽略此次滑动
      if (chapterTransitionRef.current) {
        return;
      }
      if (diffX < 0) {
        // 向左滑 = 翻到下一页（内容向右移动）
        if (currentPage < totalPages - 1) {
          setCurrentPage(currentPage + 1);
        } else if (currentChapterIndex < chapters.length - 1) {
          // 本章最后一页了，翻到下一章
          goToNextChapter();
        }
      } else {
        // 向右滑 = 翻到上一页（内容向左移动）
        if (currentPage > 0) {
          setCurrentPage(currentPage - 1);
        } else if (currentChapterIndex > 0) {
          // 本章第一页了，翻到上一章
          goToPrevChapter();
        }
      }
    }
  };

  // 提取匹配的完整句子/节
  const extractSentence = (text: string, matchIndex: number, query: string): string => {
    const lines = text.split('\n');
    let charCount = 0;
    
    for (const line of lines) {
      const lineEnd = charCount + line.length + 1;
      if (matchIndex >= charCount && matchIndex < lineEnd) {
        // 找到了这一行
        if (line.trim()) {
          return line.trim();
        }
      }
      charCount = lineEnd;
    }
    
    // 如果没找到行级别，返回前后50个字符
    const start = Math.max(0, matchIndex - 30);
    const end = Math.min(text.length, matchIndex + query.length + 30);
    return text.substring(start, end).trim();
  };

  // 搜索功能 - 搜索整个群组所有书籍
  const performSearch = useCallback((query: string) => {
    if (!query.trim() || groupChapters.length === 0) {
      setSearchResults([]);
      return;
    }
    
    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();
    
    for (let i = 0; i < groupChapters.length; i++) {
      const ch = groupChapters[i];
      if (ch.content && ch.content.toLowerCase().includes(lowerQuery)) {
        // 提取匹配的完整句子
        const matchedText = extractSentence(ch.content, ch.content.toLowerCase().indexOf(lowerQuery), query);
        
        const paragraphs = ch.content.split('\n');
        for (const para of paragraphs) {
          if (para.trim() && para.toLowerCase().includes(lowerQuery)) {
            const idx = para.toLowerCase().indexOf(lowerQuery);
            const start = Math.max(0, idx - 15);
            const end = Math.min(para.length, idx + query.length + 15);
            let snippet = para.substring(start, end);
            if (start > 0) snippet = '...' + snippet;
            if (end < para.length) snippet = snippet + '...';
            
            const bookInfo = groupBooks.find(b => b.id === ch.book_id);
            
            results.push({
              chapterId: ch.id,
              chapterTitle: ch.title || `第 ${ch.number} 章`,
              bookId: ch.book_id,
              bookTitle: bookInfo?.title || '',
              text: snippet,
              groupChapterIndex: i,
              matchedText: matchedText
            });
            
            break;
          }
        }
      }
    }
    
    setSearchResults(results.slice(0, 30));
  }, [groupChapters, groupBooks]);

  // 实时搜索（100ms 防抖）
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, 100);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, performSearch]);

  // 高亮文本中的感悟和搜索结果
  const highlightInsightText = useCallback((text: string, chapterIndex: number): React.ReactNode => {
    const chapterNotes = notes.filter(n => n.chapterIndex === chapterIndex);
    const isHighlightChapter = highlightChapterId && chapters[chapterIndex]?.id === highlightChapterId;
    
    // 处理搜索高亮（优先处理）
    if (isHighlightChapter && highlightText && text.includes(highlightText)) {
      const parts = text.split(highlightText);
      return (
        <>
          {parts.map((part, i) => (
            <React.Fragment key={`hl-${i}`}>
              {part}
              {i < parts.length - 1 && (
                <span 
                  data-highlight="true"
                  style={{
                    backgroundColor: `${primaryColor}40`,
                    boxShadow: `0 2px 0 ${primaryColor}`,
                    transition: 'all 0.3s ease'
                  }}
                >
                  {highlightText}
                </span>
              )}
            </React.Fragment>
          ))}
        </>
      );
    }
    
    // 处理感悟高亮
    if (chapterNotes.length > 0) {
      const highlightTexts = chapterNotes.map(n => n.content);
      let result = text;
      
      highlightTexts.forEach(hlText => {
        if (text.includes(hlText)) {
          result = result.replace(hlText, `<<<INSIGHT>>>${hlText}<<<ENDINSIGHT>>>`);
        }
      });
      
      const parts = result.split('<<<INSIGHT>>>');
      return parts.map((part, i) => {
        if (i === 0) return part;
        const [insightText, ...restParts] = part.split('<<<ENDINSIGHT>>>');
        return (
          <React.Fragment key={`insight-${i}`}>
            <span style={{ 
              backgroundColor: `${primaryColor}30`,
              textDecoration: `underline`,
              textDecorationColor: primaryColor,
              textUnderlineOffset: '3px'
            }}>
              {insightText}
            </span>
            {restParts.join('<<<ENDINSIGHT>>>')}
          </React.Fragment>
        );
      });
    }
    
    return text;
  }, [notes, primaryColor, highlightChapterId, highlightText, chapters]);

  // 过滤当前卷的章节
  const filteredChapters = useMemo(() => {
    return selectedVolume 
      ? chapters.filter(ch => !ch.volume || ch.volume === selectedVolume)
      : chapters;
  }, [chapters, selectedVolume]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: primaryColor }} />
          <p style={{ color: 'var(--text-secondary)' }}>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}>
        <div className="text-center p-6">
          <p style={{ color: 'var(--text-secondary)' }}>{t('reader.bookNotExist')}</p>
          <button
            onClick={() => navigate('/learn')}
            className="mt-4 px-6 py-2 rounded-lg"
            style={{ backgroundColor: primaryColor, color: '#fff' }}
          >
            {t('reader.back')}
          </button>
        </div>
      </div>
    );
  }

  const currentChapter = chapters[currentChapterIndex];
  const progressPercent = chapters.length > 0 ? Math.round(((currentChapterIndex + 1) / chapters.length) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}>
      {/* 顶部导航 */}
      <header className="sticky top-0 z-10" style={{ backgroundColor: 'var(--card-bg)', borderBottom: '1px solid var(--border-color)' }}>
        {/* 阅读进度条 */}
        <div className="h-1" style={{ backgroundColor: 'var(--border-color)' }}>
          <div 
            className="h-full transition-all duration-300" 
            style={{ width: `${progressPercent}%`, backgroundColor: primaryColor }}
          />
        </div>
        
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/learn')}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <ChevronLeft className="w-5 h-5" style={{ color: 'var(--icon-color)' }} />
              </button>
              <div>
                <h1 className="font-medium text-base">{book.title}</h1>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {currentChapter?.title || `第 ${currentChapterIndex + 1} 章`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* 搜索按钮 */}
              <button
                onClick={() => {
                  setShowSearch(!showSearch);
                  if (showSearch) setSearchQuery('');
                }}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Search className="w-5 h-5" style={{ color: 'var(--icon-color)' }} />
              </button>
              {/* 设置按钮 */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Type className="w-5 h-5" style={{ color: 'var(--icon-color)' }} />
              </button>
              <button
                onClick={toggleBookmark}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Bookmark
                  className="w-5 h-5"
                  style={{
                    color: isBookmarked ? primaryColor : 'var(--icon-color)',
                    fill: isBookmarked ? primaryColor : 'none'
                  }}
                />
              </button>
              <button
                onClick={() => setShowChapterList(!showChapterList)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Menu className="w-5 h-5" style={{ color: 'var(--icon-color)' }} />
              </button>
            </div>
          </div>
          
          {/* 搜索栏 - 全书搜索 */}
          {showSearch && (
            <div className="mt-3">
              <input
                type="text"
                placeholder="搜索内容..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ 
                  backgroundColor: 'var(--bg-secondary)', 
                  color: 'var(--text-color)',
                  border: '1px solid var(--border-color)'
                }}
                autoFocus
              />
              {/* 搜索结果 */}
              {searchResults.length > 0 && (
                <div className="mt-2 max-h-80 overflow-auto rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  {searchResults.map((result, idx) => (
                    <button
                      key={idx}
                      onClick={() => goToGroupChapter(result)}
                      className="w-full text-left px-3 py-3 hover:bg-gray-200 dark:hover:bg-gray-700 border-b last:border-b-0"
                      style={{ borderColor: 'var(--border-color)' }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: primaryColor, color: '#fff' }}>
                          {result.bookTitle}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {result.chapterTitle}
                        </span>
                        {result.bookId !== id && (
                          <span className="text-xs px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-secondary)' }}>
                            点击跳转
                          </span>
                        )}
                      </div>
                      <p className="text-sm line-clamp-2" style={{ color: 'var(--text-color)' }}>
                        {result.text}
                      </p>
                    </button>
                  ))}
                </div>
              )}
              {showSearch && searchQuery && searchResults.length === 0 && (
                <p className="mt-2 text-sm text-center py-3" style={{ color: 'var(--text-secondary)' }}>未找到匹配内容</p>
              )}
            </div>
          )}
        </div>
      </header>

      {/* 设置面板 - 固定在屏幕顶部弹出 */}
      {showSettings && (
        <div 
          className="fixed left-0 right-0 top-16 z-30 px-4 py-4 rounded-b-2xl shadow-lg"
          style={{ backgroundColor: 'var(--card-bg)', borderTop: '1px solid var(--border-color)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 点击外部关闭 */}
          <div 
            className="fixed inset-0 -z-10" 
            onClick={() => setShowSettings(false)}
          />
          {/* 关闭按钮 */}
          <div className="flex justify-center mb-3">
            <button 
              onClick={() => setShowSettings(false)}
              className="w-12 h-1.5 rounded-full"
              style={{ backgroundColor: 'var(--border-color)' }}
            />
          </div>
          
          {/* 亮屏模式 */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>保持亮屏</span>
            <button
              onClick={toggleKeepScreenOn}
              className="px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
              style={{ 
                backgroundColor: keepScreenOn ? primaryColor : 'var(--bg-secondary)', 
                color: keepScreenOn ? '#fff' : 'var(--text-color)' 
              }}
            >
              {keepScreenOn ? (
                <>
                  <Eye className="w-4 h-4" />
                  已开启
                </>
              ) : (
                <>
                  <EyeOff className="w-4 h-4" />
                  关闭
                </>
              )}
            </button>
          </div>
          
          {/* 下载按钮 */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>离线下载</span>
            <button
              onClick={downloadGroup}
              disabled={isDownloading}
              className="px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
              style={{ 
                backgroundColor: isDownloaded ? '#22c55e' : primaryColor, 
                color: '#fff' 
              }}
            >
              {isDownloading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  下载中...
                </>
              ) : isDownloaded ? (
                <>
                  <Check className="w-4 h-4" />
                  已下载
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  下载本书
                </>
              )}
            </button>
          </div>
          
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>字体大小</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFontSize(fontSize - 2)}
                className="px-3 py-1 rounded"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-color)' }}
              >
                A-
              </button>
              <span className="text-sm w-8 text-center">{fontSize}</span>
              <button
                onClick={() => setFontSize(fontSize + 2)}
                className="px-3 py-1 rounded"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-color)' }}
              >
                A+
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>行间距</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLineHeight(lineHeight - 0.2)}
                className="px-3 py-1 rounded text-xs"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-color)' }}
              >
                紧凑
              </button>
              <button
                onClick={() => setLineHeight(lineHeight + 0.2)}
                className="px-3 py-1 rounded text-xs"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-color)' }}
              >
                宽松
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>翻页模式</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPageMode('scroll')}
                className="px-3 py-1 rounded text-xs"
                style={{ 
                  backgroundColor: pageMode === 'scroll' ? primaryColor : 'var(--bg-secondary)', 
                  color: pageMode === 'scroll' ? '#fff' : 'var(--text-color)' 
                }}
              >
                上下滚动
              </button>
              <button
                onClick={() => setPageMode('swipe')}
                className="px-3 py-1 rounded text-xs"
                style={{ 
                  backgroundColor: pageMode === 'swipe' ? primaryColor : 'var(--bg-secondary)', 
                  color: pageMode === 'swipe' ? '#fff' : 'var(--text-color)' 
                }}
              >
                左右滑动
              </button>
            </div>
          </div>
          <div className="mb-3">
            <span className="text-sm mb-2 block" style={{ color: 'var(--text-secondary)' }}>阅读主题</span>
            <div className="flex items-center gap-2">
              {(Object.keys(readerThemes) as Array<'light' | 'sepia' | 'dark'>).map((theme) => {
                const config = readerThemes[theme];
                const Icon = config.icon;
                return (
                  <button
                    key={theme}
                    onClick={() => setReaderTheme(theme)}
                    className="flex-1 px-3 py-2 rounded-lg flex items-center justify-center gap-1"
                    style={{ 
                      backgroundColor: readerTheme === theme ? primaryColor : 'var(--bg-secondary)', 
                      color: readerTheme === theme ? '#fff' : 'var(--text-color)'
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs">{config.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 主内容区 */}
      {pageMode === 'swipe' ? (
        /* swipe模式：分页显示 */
        <main 
          ref={contentRef}
          className="flex-1 relative overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onContextMenu={handleContextMenu}
        >
          {/* 分页内容容器 */}
          <div 
            ref={swipeContainerRef}
            className="h-full"
            style={{ 
              transform: `translateY(-${currentPage * 100}%)`,
              transition: isChapterTransitioning ? 'none' : 'transform 300ms ease-out'
            }}
          >
            {/* 单页内容 */}
            <div className="h-full overflow-hidden">
              <div className="max-w-2xl mx-auto px-6 py-8">
                {currentChapter && (
                  <div className="mb-6">
                    <h2 className="text-xl font-bold" style={{ color: 'var(--text-color)' }}>
                      {currentChapter.title || `第 ${currentChapter.number} 章`}
                    </h2>
                  </div>
                )}
                
                {/* 分页内容 */}
                <div
                  className="whitespace-pre-wrap"
                  style={{
                    fontSize: `${fontSize}px`,
                    lineHeight: lineHeight,
                    color: 'var(--text-color)',
                    textAlign: 'justify',
                    userSelect: 'text',
                    WebkitUserSelect: 'text'
                  }}
                >
                  {pageContent[currentPage] ? (
                    pageContent[currentPage].split('\n').map((para, idx) => (
                      para.trim() && (
                        <p key={idx} className="mb-4" style={{ textIndent: '2em' }}>
                          {highlightInsightText(para, currentChapterIndex)}
                        </p>
                      )
                    ))
                  ) : (
                    <p style={{ color: 'var(--text-secondary)' }}>{t('reader.noContent')}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* 页码指示器 */}
          {totalPages > 1 && (
            <div className="absolute bottom-20 left-0 right-0 flex justify-center">
              <div className="px-3 py-1 rounded-full text-xs" style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-secondary)' }}>
                {currentPage + 1} / {totalPages}
              </div>
            </div>
          )}
        </main>
      ) : (
        /* scroll模式：正常滚动显示 */
        <main 
          ref={contentRef} 
          className="flex-1 overflow-auto"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onContextMenu={handleContextMenu}
          onScroll={(e) => {
            const el = e.target as HTMLDivElement;
            const { scrollTop, scrollHeight, clientHeight } = el;
            const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
            
            // 标记是否已读到底部
            if (isAtBottom) {
              setHasReachedBottom(true);
            }
          }}
        >
          {chapters.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <BookOpen className="w-16 h-16 mb-4" style={{ color: 'var(--text-secondary)' }} />
              <p style={{ color: 'var(--text-secondary)' }}>{t('reader.noChapter')}</p>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto px-6 py-8">
              {/* 章节标题 */}
              {currentChapter && (
                <div className="mb-6">
                  <h2 className="text-xl font-bold" style={{ color: 'var(--text-color)' }}>
                    {currentChapter.title || `第 ${currentChapter.number} 章`}
                  </h2>
                  {currentChapter.volume && volumes.length > 1 && (
                    <p className="text-sm mt-1 cursor-pointer" style={{ color: primaryColor }} onClick={() => setShowVolumeSelector(true)}>
                      {volumeNames[currentChapter.volume] || currentChapter.volume} ▼
                    </p>
                  )}
                </div>
              )}
              
              {/* 章节内容 - 带感悟高亮和搜索高亮 */}
              <div
                className="whitespace-pre-wrap"
                style={{
                  fontSize: `${fontSize}px`,
                  lineHeight: lineHeight,
                  color: 'var(--text-color)',
                  textAlign: 'justify',
                  userSelect: 'text',
                  WebkitUserSelect: 'text'
                }}
              >
                {currentChapter?.content ? (
                  currentChapter.content.split('\n').map((para, idx) => (
                    para.trim() && (
                      <p key={idx} className="mb-4" style={{ textIndent: '2em' }}>
                        {highlightInsightText(para, currentChapterIndex)}
                      </p>
                    )
                  ))
                ) : (
                  <p style={{ color: 'var(--text-secondary)' }}>{t('reader.noContent')}</p>
                )}
              </div>
              
              {/* 底部"继续阅读"提示区域 */}
              {hasReachedBottom && currentChapterIndex < chapters.length - 1 && (
                <div 
                  className="mt-8 py-6 text-center cursor-pointer rounded-lg"
                  style={{ backgroundColor: 'var(--bg-secondary)' }}
                  onClick={() => goToNextChapter()}
                >
                  <div className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                    已读完全部内容
                  </div>
                  <div className="flex items-center justify-center gap-2" style={{ color: primaryColor }}>
                    <span className="text-sm font-medium">
                      {chapters[currentChapterIndex + 1]?.title || `第 ${currentChapterIndex + 2} 章`}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                  <div className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                    点击继续阅读
                  </div>
                </div>
              )}
              
              {/* 章节底部留白，方便用户滚动到"继续阅读"按钮 */}
              <div className="h-20" />
            </div>
          )}
        </main>
      )}

      {/* 长按选择菜单 */}
      {selectionMenu.visible && (
        <div
          className="fixed z-50 flex gap-2 p-2 rounded-lg shadow-lg"
          style={{ 
            left: `${Math.min(selectionMenu.x, window.innerWidth - 240)}px`, 
            top: `${Math.min(selectionMenu.y - 50, window.innerHeight - 60)}px`,
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={copyText}
            className="px-4 py-2 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-color)' }}
          >
            复制
          </button>
          <button
            onClick={shareText}
            className="px-4 py-2 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-color)' }}
          >
            分享
          </button>
          <button
            onClick={handleAddInsight}
            className="px-4 py-2 rounded-lg text-sm"
            style={{ backgroundColor: primaryColor, color: '#fff' }}
          >
            感悟
          </button>
          <button
            onClick={() => setSelectionMenu({visible: false, text: '', x: 0, y: 0})}
            className="px-4 py-2 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-color)' }}
          >
            关闭
          </button>
        </div>
      )}

      {/* 底部导航 */}
      {chapters.length > 0 && (
        <footer className="sticky bottom-0 border-t" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-between px-4 py-2 max-w-2xl mx-auto">
            <button
              onClick={goToPrevChapter}
              disabled={currentChapterIndex === 0}
              className="flex items-center gap-1 px-4 py-2 rounded-lg disabled:opacity-30 transition-opacity"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-color)' }}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm">上一章</span>
            </button>
            
            <div className="text-center">
              <div className="text-sm font-medium" style={{ color: 'var(--text-color)' }}>
                {currentChapterIndex + 1} / {chapters.length}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {progressPercent}% 已读
              </div>
            </div>
            
            <button
              onClick={goToNextChapter}
              disabled={currentChapterIndex === chapters.length - 1}
              className="flex items-center gap-1 px-4 py-2 rounded-lg disabled:opacity-30 transition-opacity"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-color)' }}
            >
              <span className="text-sm">下一章</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </footer>
      )}

      {/* 全屏卷选择器 */}
      {showVolumeSelector && (
        <div className="fixed inset-0 z-30" onClick={() => setShowVolumeSelector(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute bottom-0 left-0 right-0 max-h-[70vh] rounded-t-2xl overflow-auto" style={{ backgroundColor: 'var(--card-bg)' }} onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
              <h3 className="font-medium" style={{ color: 'var(--text-color)' }}>选择书卷</h3>
              <button onClick={() => setShowVolumeSelector(false)}>
                <X className="w-5 h-5" style={{ color: 'var(--icon-color)' }} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 p-4">
              {volumes.map(vol => (
                <button
                  key={vol}
                  onClick={() => {
                    setSelectedVolume(vol);
                    setShowVolumeSelector(false);
                  }}
                  className="px-3 py-3 rounded-lg text-sm"
                  style={{
                    backgroundColor: currentChapter?.volume === vol ? primaryColor : 'var(--bg-secondary)',
                    color: currentChapter?.volume === vol ? '#fff' : 'var(--text-color)'
                  }}
                >
                  {volumeNames[vol] || vol}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 章节列表侧边栏 */}
      {showChapterList && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setShowChapterList(false)}
        >
          <div
            className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] overflow-hidden flex flex-col"
            style={{ backgroundColor: 'var(--card-bg)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="px-4 py-3 border-b flex items-center justify-between shrink-0" style={{ borderColor: 'var(--border-color)' }}>
              <div>
                <h3 className="font-medium">{book.title}</h3>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {chapters.length} 章 · 共 {groupBooks.length} 本
                </p>
              </div>
              <button onClick={() => setShowChapterList(false)}>
                <X className="w-5 h-5" style={{ color: 'var(--icon-color)' }} />
              </button>
            </div>
            
            {/* 群组内书籍列表 */}
            {groupBooks.length > 1 && (
              <div className="px-4 py-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>全书目录</p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {groupBooks.map(b => (
                    <button
                      key={b.id}
                      onClick={() => {
                        if (b.id !== id) {
                          navigate(`/book/${b.id}`);
                          setShowChapterList(false);
                        }
                      }}
                      className="px-2 py-1 rounded text-xs whitespace-nowrap"
                      style={{
                        backgroundColor: b.id === id ? primaryColor : 'var(--bg-secondary)',
                        color: b.id === id ? '#fff' : 'var(--text-color)'
                      }}
                    >
                      {b.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* 卷选择 */}
            {volumes.length > 1 && (
              <div className="px-4 py-2 border-b shrink-0" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  <button
                    onClick={() => setSelectedVolume(null)}
                    className="px-3 py-1 rounded-full text-xs whitespace-nowrap"
                    style={{
                      backgroundColor: !selectedVolume ? primaryColor : 'var(--bg-secondary)',
                      color: !selectedVolume ? '#fff' : 'var(--text-color)'
                    }}
                  >
                    全部
                  </button>
                  {volumes.map(vol => (
                    <button
                      key={vol}
                      onClick={() => setSelectedVolume(vol)}
                      className="px-3 py-1 rounded-full text-xs whitespace-nowrap"
                      style={{
                        backgroundColor: selectedVolume === vol ? primaryColor : 'var(--bg-secondary)',
                        color: selectedVolume === vol ? '#fff' : 'var(--text-color)'
                      }}
                    >
                      {volumeNames[vol] || vol}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* 章节列表 */}
            <div className="flex-1 overflow-auto py-2">
              {filteredChapters.map((chapter) => {
                const displayIndex = chapters.indexOf(chapter);
                const hasInsight = notes.some(n => n.chapterIndex === displayIndex);
                return (
                  <button
                    key={chapter.id}
                    onClick={() => goToChapter(displayIndex)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    style={{
                      backgroundColor: displayIndex === currentChapterIndex ? 'var(--bg-secondary)' : 'transparent',
                      borderLeft: displayIndex === currentChapterIndex ? `3px solid ${primaryColor}` : '3px solid transparent'
                    }}
                  >
                    <div 
                      className="flex items-center gap-2"
                      style={{ color: displayIndex === currentChapterIndex ? primaryColor : 'var(--text-color)' }}
                    >
                      <span className="text-sm font-medium">
                        {chapter.title || `第 ${chapter.number} 章`}
                      </span>
                      {hasInsight && (
                        <span 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: primaryColor }}
                        />
                      )}
                    </div>
                    {chapter.volume && volumes.length > 1 && (
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {volumeNames[chapter.volume] || chapter.volume}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* 书签按钮 */}
            <div className="px-4 py-3 border-t shrink-0" style={{ borderColor: 'var(--border-color)' }}>
              <button
                onClick={() => {
                  toggleBookmark();
                  setShowChapterList(false);
                }}
                className="w-full py-2 rounded-lg flex items-center justify-center gap-2"
                style={{ 
                  backgroundColor: isBookmarked ? primaryColor : 'var(--bg-secondary)',
                  color: isBookmarked ? '#fff' : 'var(--text-color)'
                }}
              >
                <Bookmark className="w-4 h-4" fill={isBookmarked ? '#fff' : 'none'} />
                <span className="text-sm">{isBookmarked ? '已在书架' : '加入书架'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookDetail;
