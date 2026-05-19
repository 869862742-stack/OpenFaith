/**
 * 加载中转页
 * 用于登录后等待 token / session 恢复完成，再跳转到目标页面
 * 
 * 安全特性：
 * 1. 不依赖主题变量，使用内联样式
 * 2. 完整的错误处理
 * 3. 安全的 token 恢复逻辑
 */
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/auth';
import { supabase } from '../supabase/client';

function LoadingPage() {
  const [status, setStatus] = useState('检查登录状态...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const restoreSession = async () => {
      console.log('[LoadingPage] 开始恢复 session...');

      try {
        // 1. 获取 URL 参数中的目标路径
        const hash = window.location.hash;
        const searchIndex = hash.indexOf('?');
        const queryString = searchIndex !== -1 ? hash.substring(searchIndex + 1) : '';
        const params = new URLSearchParams(queryString);
        const redirectTo = params.get('redirect') || '/';

        console.log('[LoadingPage] 目标路径:', redirectTo);
        setStatus('正在验证身份...');

        // 2. 获取 localStorage 中的数据（登录时保存的）
        const savedToken = localStorage.getItem('user_token');
        const savedAuth = localStorage.getItem('sb_auth');

        console.log('[LoadingPage] localStorage:', {
          hasToken: !!savedToken,
          tokenPrefix: savedToken?.substring(0, 20) + '...',
          hasAuth: !!savedAuth
        });

        // 3. 等待 Supabase 初始化并获取 session
        setStatus('正在连接服务器...');
        let sessionData = null;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries && !sessionData?.session) {
          try {
            console.log(`[LoadingPage] 获取 session (尝试 ${retryCount + 1}/${maxRetries})...`);
            const result = await supabase.auth.getSession();
            sessionData = result.data;
            console.log('[LoadingPage] getSession 结果:', {
              hasSession: !!result.data.session,
              hasError: !!result.error,
              error: result.error,
              accessToken: result.data.session?.access_token?.substring(0, 20) + '...'
            });
            
            if (!result.data.session && retryCount < maxRetries - 1) {
              // 等待一下再重试
              await new Promise(r => setTimeout(r, 500));
            }
          } catch (e: any) {
            console.error(`[LoadingPage] getSession 异常 (${retryCount + 1}):`, e);
          }
          retryCount++;
        }

        // 4. 如果有有效 session，更新 store
        if (sessionData?.session) {
          console.log('[LoadingPage] Supabase session 有效');
          setStatus('登录成功，正在加载...');

          const store = useAuthStore.getState();
          store.setState({
            token: sessionData.session.access_token,
            userInfo: sessionData.session.user,
            isInitialized: true
          });

          // 同步 localStorage
          localStorage.setItem('user_token', sessionData.session.access_token);
          localStorage.setItem('sb_auth', JSON.stringify({
            user: sessionData.session.user,
            session: sessionData.session
          }));

          // 延迟一点让 UI 更新，然后使用 hash 路由跳转
          setTimeout(() => {
            console.log('[LoadingPage] 跳转到:', redirectTo);
            window.location.hash = redirectTo;
          }, 300);
          return;
        }

        // 5. 如果 Supabase session 失效但 localStorage 有数据，尝试恢复
        if (savedToken) {
          console.log('[LoadingPage] 使用本地缓存恢复');
          setStatus('正在恢复登录状态...');

          try {
            const parsedAuth = savedAuth ? JSON.parse(savedAuth) : null;
            useAuthStore.getState().setState({
              token: savedToken,
              userInfo: parsedAuth?.user || null,
              isInitialized: true
            });
          } catch (e) {
            useAuthStore.getState().setState({
              token: savedToken,
              isInitialized: true
            });
          }

          setTimeout(() => {
            console.log('[LoadingPage] 跳转到:', redirectTo);
            window.location.hash = redirectTo;
          }, 300);
          return;
        }

        // 6. 没有任何数据，跳转登录页
        console.log('[LoadingPage] 无有效 session，跳转登录页');
        setStatus('登录已过期');
        setTimeout(() => {
          window.location.hash = '/login';
        }, 1500);

      } catch (err) {
        console.error('[LoadingPage] 恢复失败:', err);
        setError('加载失败，请重试');
        setTimeout(() => {
          window.location.hash = '/login';
        }, 2000);
      }
    };

    restoreSession();
  }, []);

  // 安全样式 - 不依赖任何外部主题变量
  const styles = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
    },
    content: {
      textAlign: 'center' as const,
      maxWidth: '300px',
      margin: '0 auto',
      padding: '0 24px',
    },
    logo: {
      width: '64px',
      height: '64px',
      margin: '0 auto 24px',
      borderRadius: '50%',
      backgroundColor: '#FEE2E2',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '32px',
    },
    spinner: {
      width: '32px',
      height: '32px',
      border: '3px solid #E5E7EB',
      borderTopColor: '#2563EB',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      margin: '0 auto 16px',
    },
    status: {
      fontSize: '16px',
      color: '#6B7280',
    },
    error: {
      fontSize: '18px',
      color: '#EF4444',
      marginBottom: '16px',
    },
    hint: {
      fontSize: '12px',
      color: '#9CA3AF',
      marginTop: '16px',
    },
  };

  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={styles.content}>
        {/* Logo */}
        <div style={styles.logo}>✨</div>

        {/* 加载动画 */}
        {!error && <div style={styles.spinner}></div>}

        {/* 状态文字 */}
        {error ? (
          <div style={styles.error}>{error}</div>
        ) : (
          <p style={styles.status}>{status}</p>
        )}

        {/* 提示 */}
        <p style={styles.hint}>正在准备您的内容...</p>
      </div>
    </div>
  );
}

export default LoadingPage;
