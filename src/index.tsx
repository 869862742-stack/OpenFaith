// Force rebuild at 1778842991
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import { useAuthStore } from './stores/auth';
import './i18n';
import './styles/index.css';

// 防止 history.replaceState 超频（浏览器限制100次/30秒）
const originalReplaceState = history.replaceState.bind(history);
let replaceStateCount = 0;
let replaceStateResetTimer: ReturnType<typeof setTimeout> | null = null;

history.replaceState = function(...args: [data: any, title: string, url?: string | null]) {
  replaceStateCount++;
  if (!replaceStateResetTimer) {
    replaceStateResetTimer = setTimeout(() => {
      replaceStateCount = 0;
      replaceStateResetTimer = null;
    }, 30000);
  }
  if (replaceStateCount > 80) {
    console.warn('[History] replaceState called too frequently, throttling');
    return; // 静默丢弃超频调用
  }
  return originalReplaceState(...args);
};

// DEBUG: 检查环境变量
console.log('[DEBUG] SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('[DEBUG] SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? process.env.SUPABASE_ANON_KEY.substring(0, 20) + '...' : 'undefined');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <QueryClientProvider client={queryClient}>
    <HashRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </HashRouter>
  </QueryClientProvider>
);
