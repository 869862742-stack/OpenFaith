import React, { useState } from 'react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useThemeContext } from '../contexts/ThemeContext';

const mockHistory: any[] = [];

function History() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { primaryColor } = useThemeContext();
  const [history, setHistory] = useState(mockHistory);
  const [isRecordingEnabled, setIsRecordingEnabled] = useState(true);

  // 夜间模式颜色
  const bgColor = 'var(--bg-color)';
  const cardBg = 'var(--card-bg)';
  const textColor = 'var(--text-color)';
  const textSecondary = 'var(--text-secondary)';
  const borderColor = 'var(--border-color)';

  const clearHistory = () => {
    setHistory([]);
    alert(t('history.cleared') || '浏览记录已清空');
  };

  const toggleRecording = () => {
    setIsRecordingEnabled(!isRecordingEnabled);
    alert(isRecordingEnabled ? (t('history.recordingOff') || '浏览记录已关闭') : (t('history.recordingOn') || '浏览记录已开启'));
  };

  return (
    <div className="min-h-screen theme-transition" style={{ backgroundColor: bgColor }}>
      <header 
        className="sticky top-0 z-40 px-4 py-3 border-b flex items-center justify-between theme-transition" 
        style={{ borderColor }}
      >
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 theme-transition" style={{ color: textColor }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold theme-transition" style={{ color: textColor }}>
            {t('sidebar.history') || '浏览记录'}
          </h1>
        </div>
        <button
          onClick={toggleRecording}
          className="text-sm theme-transition"
          style={{ color: textSecondary }}
        >
          {isRecordingEnabled ? (t('history.closeRecording') || '关闭记录') : (t('history.openRecording') || '开启记录')}
        </button>
      </header>

      <div className="p-4">
        <button
          onClick={clearHistory}
          className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border text-sm mb-4 theme-transition"
          style={{ borderColor, color: textSecondary }}
        >
          <Trash2 className="w-4 h-4" />
          {t('history.clear') || '清空浏览记录'}
        </button>

        {history.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm theme-transition" style={{ color: textSecondary }}>
              {t('common.noData') || '暂无浏览记录'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item: any) => (
              <div key={item.id} className="p-4 rounded-xl theme-transition" style={{ backgroundColor: cardBg }}>
                <p className="text-sm theme-transition" style={{ color: textColor }}>{item.title}</p>
                <p className="text-xs mt-1 theme-transition" style={{ color: textSecondary }}>{item.time}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default History;
