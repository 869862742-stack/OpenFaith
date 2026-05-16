/* @sideEffects */
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Trash2, BookOpen, Check, Wifi, WifiOff, Image, Video, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getDownloadedBooks, removeDownloadedBook, getDownloads, saveDownloadedBook, getDownloadSize } from '../utils/bookCache';
import { api } from '../utils/api';

interface Book {
  id: string;
  title: string;
  religion: string;
  category: string;
  description: string;
}

interface DownloadedBook {
  book: Book;
  chapters: any[];
  downloadedAt: string;
}

interface GroupCache {
  books: Book[];
  chapters: any[];
  lastUpdated: string;
}

function Downloads() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'books' | 'resources'>('books');
  const [downloadedBooks, setDownloadedBooks] = useState<Record<string, DownloadedBook>>({});
  const [availableBooks, setAvailableBooks] = useState<Book[]>([]);
  const [groupsList, setGroupsList] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // 颜色变量
  const bgColor = 'var(--bg-color)';
  const cardBg = 'var(--card-bg)';
  const cardBgSecondary = 'var(--bg-secondary)';
  const textColor = 'var(--text-color)';
  const textSecondary = 'var(--text-secondary)';
  const borderColor = 'var(--border-color)';
  const primaryColor = '#E11D48';

  // 监听网络状态
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        // 加载已下载的书籍
        const books = getDownloadedBooks();
        setDownloadedBooks(books);
        
        // 加载笔记资源
        const allDownloads = getDownloads();
        const resourceList = Object.values(allDownloads)
          .filter((item: any) => item.type === 'resource' || item.type === 'image' || item.type === 'video')
          .map((item: any) => ({
            id: item.id || item.resourceId || item.url,
            ...item
          }));
        setResources(resourceList);
        
        // 在线时获取可下载的书籍
        if (navigator.onLine) {
          // 获取群组和书籍数据
          const [groupsData, booksData] = await Promise.all([
            api.get('book_groups'),
            api.get('books?order=title.asc')
          ]);
          
          if (groupsData && Array.isArray(groupsData)) {
            setGroupsList(groupsData);
          }
          
          if (booksData && Array.isArray(booksData)) {
            setAvailableBooks(booksData);
          }
        }
      } catch (err) {
        console.error('Failed to load downloads:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // 获取已发布的群组
  const getPublishedGroups = () => {
    const childIds = new Set<string>();
    groupsList.forEach(g => {
      if (g.group_ids && Array.isArray(g.group_ids)) {
        g.group_ids.forEach((id: string) => childIds.add(id));
      }
    });
    
    return groupsList.filter(g => {
      if (g.group_ids && g.group_ids.length > 0 && g.is_published !== false) {
        return true;
      }
      if (!childIds.has(g.id) && g.is_published !== false) {
        return true;
      }
      return false;
    });
  };

  // 下载群组
  const downloadGroup = async (groupId: string) => {
    setDownloading(groupId);
    try {
      const group = groupsList.find(g => g.id === groupId);
      if (!group) return;
      
      // 获取群组内的所有书籍
      const bookIds = group.book_ids || [];
      for (const subGroupId of (group.group_ids || [])) {
        const subGroup = groupsList.find(g => g.id === subGroupId);
        if (subGroup?.book_ids) {
          bookIds.push(...subGroup.book_ids);
        }
      }
      
      // 下载每本书
      for (const bookId of bookIds) {
        if (downloadedBooks[bookId]) continue; // 已下载的跳过
        
        const bookData = await api.get(`books?id=eq.${bookId}`);
        const book = Array.isArray(bookData) ? bookData[0] : (bookData?.id ? bookData : null);
        
        if (book) {
          const chaptersData = await api.get(`chapters?book_id=eq.${bookId}&order=number.asc`);
          saveDownloadedBook(bookId, book, chaptersData || []);
        }
      }
      
      // 刷新下载列表
      const books = getDownloadedBooks();
      setDownloadedBooks(books);
      
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(null);
    }
  };

  // 删除下载的书籍
  const deleteBook = (bookId: string) => {
    removeDownloadedBook(bookId);
    const books = getDownloadedBooks();
    setDownloadedBooks(books);
  };

  // 阅读已下载的书籍
  const readBook = (bookId: string) => {
    navigate(`/book/${bookId}`);
  };

  // 获取已下载书籍数量
  const downloadedCount = Object.keys(downloadedBooks).length;
  const totalSize = getDownloadSize();

  // 获取顶级群组（用于下载）
  const publishedGroups = getPublishedGroups();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bgColor }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: primaryColor }} />
          <p style={{ color: textSecondary }}>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-transition" style={{ backgroundColor: bgColor }}>
      {/* 头部 */}
      <header 
        className="sticky top-0 z-40 px-4 py-3 border-b flex items-center justify-between theme-transition" 
        style={{ backgroundColor: bgColor, borderColor }}
      >
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2" style={{ color: textColor }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold theme-transition" style={{ color: textColor }}>
            我的下载
          </h1>
        </div>
        
        {/* 网络状态 */}
        <div className="flex items-center gap-2">
          {isOnline ? (
            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#22c55e20', color: '#22c55e' }}>
              <Wifi className="w-3 h-3" />
              在线
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#ef444420', color: '#ef4444' }}>
              <WifiOff className="w-3 h-3" />
              离线
            </span>
          )}
        </div>
      </header>

      {/* 统计信息 */}
      <div className="px-4 py-3 border-b" style={{ backgroundColor: cardBgSecondary, borderColor }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-xl font-bold" style={{ color: primaryColor }}>{downloadedCount}</p>
              <p className="text-xs" style={{ color: textSecondary }}>已下载书籍</p>
            </div>
            <div className="w-px h-8" style={{ backgroundColor: borderColor }} />
            <div className="text-center">
              <p className="text-xl font-bold" style={{ color: primaryColor }}>{resources.length}</p>
              <p className="text-xs" style={{ color: textSecondary }}>笔记资源</p>
            </div>
            <div className="w-px h-8" style={{ backgroundColor: borderColor }} />
            <div className="text-center">
              <p className="text-xl font-bold" style={{ color: primaryColor }}>{totalSize}</p>
              <p className="text-xs" style={{ color: textSecondary }}>占用空间</p>
            </div>
          </div>
        </div>
      </div>

      {/* 标签页 */}
      <div className="flex border-b" style={{ borderColor, backgroundColor: cardBg }}>
        <button
          onClick={() => setActiveTab('books')}
          className="flex-1 py-3 text-sm font-medium relative"
          style={{ color: activeTab === 'books' ? primaryColor : textSecondary }}
        >
          <span className="flex items-center justify-center gap-2">
            <BookOpen className="w-4 h-4" />
            离线书籍
          </span>
          {activeTab === 'books' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: primaryColor }} />
          )}
        </button>
        <button
          onClick={() => setActiveTab('resources')}
          className="flex-1 py-3 text-sm font-medium relative"
          style={{ color: activeTab === 'resources' ? primaryColor : textSecondary }}
        >
          <span className="flex items-center justify-center gap-2">
            {resources.length > 0 && (
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }} />
            )}
            笔记资源
          </span>
          {activeTab === 'resources' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: primaryColor }} />
          )}
        </button>
      </div>

      <div className="p-4">
        {activeTab === 'books' && (
          <div className="space-y-4">
            {/* 已下载书籍 */}
            {downloadedCount > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-3" style={{ color: textSecondary }}>
                  已下载 ({downloadedCount})
                </h3>
                <div className="space-y-2">
                  {Object.entries(downloadedBooks).map(([bookId, data]) => (
                    <div
                      key={bookId}
                      className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}` }}
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${primaryColor}15` }}
                      >
                        <BookOpen className="w-6 h-6" style={{ color: primaryColor }} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm" style={{ color: textColor }}>
                          {data.book.title}
                        </h4>
                        <p className="text-xs" style={{ color: textSecondary }}>
                          {data.book.religion} · {data.chapters.length} 章
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => readBook(bookId)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{ backgroundColor: primaryColor, color: '#fff' }}
                        >
                          阅读
                        </button>
                        <button
                          onClick={() => deleteBook(bookId)}
                          className="p-1.5 rounded-lg"
                          style={{ backgroundColor: cardBgSecondary }}
                        >
                          <Trash2 className="w-4 h-4" style={{ color: '#ef4444' }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 可下载书籍（在线时显示） */}
            {isOnline && (
              <div>
                <h3 className="text-sm font-medium mb-3" style={{ color: textSecondary }}>
                  可下载书籍
                </h3>
                {publishedGroups.length > 0 ? (
                  <div className="space-y-2">
                    {publishedGroups.map(group => {
                      const hasAllBooks = group.book_ids?.every((id: string) => downloadedBooks[id]);
                      const isGroupDownloading = downloading === group.id;
                      
                      return (
                        <div
                          key={group.id}
                          className="flex items-center gap-3 p-3 rounded-xl"
                          style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}` }}
                        >
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: `${primaryColor}15` }}
                          >
                            <BookOpen className="w-6 h-6" style={{ color: primaryColor }} />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-sm" style={{ color: textColor }}>
                              {group.name}
                            </h4>
                            <p className="text-xs" style={{ color: textSecondary }}>
                              {group.group_ids?.length || 0} 个分类 · {group.book_ids?.length || 0} 卷
                            </p>
                          </div>
                          <button
                            onClick={() => downloadGroup(group.id)}
                            disabled={isGroupDownloading || hasAllBooks}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1"
                            style={{ 
                              backgroundColor: hasAllBooks ? '#22c55e' : primaryColor, 
                              color: '#fff',
                              opacity: isGroupDownloading ? 0.7 : 1
                            }}
                          >
                            {isGroupDownloading ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent" />
                                下载中
                              </>
                            ) : hasAllBooks ? (
                              <>
                                <Check className="w-3 h-3" />
                                已下载
                              </>
                            ) : (
                              <>
                                <Download className="w-3 h-3" />
                                下载全部
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : availableBooks.length > 0 ? (
                  <div className="space-y-2">
                    {availableBooks.filter(book => !downloadedBooks[book.id]).slice(0, 10).map(book => {
                      const isBookDownloading = downloading === book.id;
                      
                      return (
                        <div
                          key={book.id}
                          className="flex items-center gap-3 p-3 rounded-xl"
                          style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}` }}
                        >
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: `${primaryColor}15` }}
                          >
                            <BookOpen className="w-6 h-6" style={{ color: primaryColor }} />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-sm" style={{ color: textColor }}>
                              {book.title}
                            </h4>
                            <p className="text-xs" style={{ color: textSecondary }}>
                              {book.religion}
                            </p>
                          </div>
                          <button
                            onClick={async () => {
                              setDownloading(book.id);
                              try {
                                const chaptersData = await api.get(`chapters?book_id=eq.${book.id}&order=number.asc`);
                                saveDownloadedBook(book.id, book, chaptersData || []);
                                const books = getDownloadedBooks();
                                setDownloadedBooks(books);
                              } catch (err) {
                                console.error('Download failed:', err);
                              } finally {
                                setDownloading(null);
                              }
                            }}
                            disabled={isBookDownloading}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1"
                            style={{ 
                              backgroundColor: primaryColor, 
                              color: '#fff',
                              opacity: isBookDownloading ? 0.7 : 1
                            }}
                          >
                            {isBookDownloading ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent" />
                                下载中
                              </>
                            ) : (
                              <>
                                <Download className="w-3 h-3" />
                                下载
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="w-12 h-12 mx-auto mb-3" style={{ color: textSecondary }} />
                    <p className="text-sm" style={{ color: textSecondary }}>
                      暂无可下载的书籍
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 离线提示 */}
            {!isOnline && downloadedCount === 0 && (
              <div className="text-center py-12">
                <WifiOff className="w-12 h-12 mx-auto mb-3" style={{ color: textSecondary }} />
                <p className="text-sm mb-2" style={{ color: textSecondary }}>
                  当前处于离线状态
                </p>
                <p className="text-xs" style={{ color: textSecondary }}>
                  请在联网时下载书籍后离线阅读
                </p>
              </div>
            )}

            {downloadedCount === 0 && isOnline && publishedGroups.length === 0 && availableBooks.length === 0 && (
              <div className="text-center py-12">
                <BookOpen className="w-12 h-12 mx-auto mb-3" style={{ color: textSecondary }} />
                <p className="text-sm" style={{ color: textSecondary }}>
                  暂无下载内容
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'resources' && (
          <div className="space-y-3">
            {resources.length > 0 ? (
              resources.map((resource) => (
                <div
                  key={resource.id}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}` }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: cardBgSecondary }}
                  >
                    {resource.thumbnail || resource.url ? (
                      resource.type === 'video' ? (
                        <Video className="w-6 h-6" style={{ color: primaryColor }} />
                      ) : (
                        <Image className="w-6 h-6" style={{ color: primaryColor }} />
                      )
                    ) : resource.type === 'video' ? (
                      <Video className="w-6 h-6" style={{ color: primaryColor }} />
                    ) : (
                      <Image className="w-6 h-6" style={{ color: primaryColor }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate" style={{ color: textColor }}>
                      {resource.name || '未命名资源'}
                    </h4>
                    <p className="text-xs truncate" style={{ color: textSecondary }}>
                      {resource.downloadedAt ? new Date(resource.downloadedAt).toLocaleDateString() : ''}
                      {resource.size && ` · ${resource.size}`}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (resource.url) {
                        const link = document.createElement('a');
                        link.href = resource.url;
                        link.download = resource.name || 'resource';
                        link.click();
                      }
                    }}
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: cardBgSecondary }}
                  >
                    <Download className="w-4 h-4" style={{ color: primaryColor }} />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Image className="w-12 h-12 mx-auto mb-3" style={{ color: textSecondary }} />
                <p className="text-sm" style={{ color: textSecondary }}>
                  暂无笔记资源
                </p>
                <p className="text-xs mt-1" style={{ color: textSecondary }}>
                  从笔记中保存的图片和视频将显示在这里
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Downloads;
