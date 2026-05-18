import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/auth';
import { supabase } from '../supabase/client';

// 固定主题颜色（不依赖 useThemeContext）
const THEME_COLOR = '#E11D48';
const BG_COLOR = '#f5f5f5';
const TEXT_COLOR = '#666666';

// 访问密码
const ACCESS_PASSWORD = 'openfaith2026';
const ACCESS_KEY = 'of_access';

function Splash() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [status, setStatus] = useState('正在启动...');
  const [error, setError] = useState<string | null>(null);
  
  // 密码保护状态
  const [showPasswordScreen, setShowPasswordScreen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      console.log('[Splash] ========== 应用启动 ==========');
      
      // 检查是否已通过密码验证
      const hasAccess = localStorage.getItem(ACCESS_KEY);
      if (!hasAccess) {
        console.log('[Splash] 需要密码验证');
        setShowPasswordScreen(true);
        setStatus('');
        return;
      }
      
      setShowPasswordScreen(false);
      setStatus('正在检查登录状态...');

      try {
        // 步骤1: 从 localStorage 恢复 token（同步，立即可用）
        const savedToken = localStorage.getItem('user_token');
        const savedUserId = localStorage.getItem('user_id');
        console.log('[Splash] localStorage 检查:', {
          hasToken: !!savedToken,
          hasUserId: !!savedUserId
        });

        if (savedToken) {
          // 立即更新 store（同步操作，用户可以看到登录状态）
          useAuthStore.setState({
            token: savedToken,
            userInfo: savedUserId ? { id: savedUserId } : null,
            isInitialized: true
          });
          console.log('[Splash] 已从 localStorage 恢复 token');
        } else {
          useAuthStore.setState({ isInitialized: true });
          console.log('[Splash] 无 localStorage token，标记已初始化');
        }

        // 步骤2: 尝试获取 Supabase session（异步，可能失败）
        setStatus('正在连接服务器...');
        console.log('[Splash] 调用 supabase.auth.getSession()...');

        try {
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          console.log('[Splash] getSession 结果:', {
            hasSession: !!sessionData?.session,
            hasError: !!sessionError,
            errorMsg: sessionError?.message
          });

          if (sessionData?.session) {
            // Supabase session 存在，更新 store
            useAuthStore.setState({
              token: sessionData.session.access_token,
              userInfo: sessionData.session.user,
              isInitialized: true
            });
            // 同步到 localStorage
            localStorage.setItem('user_token', sessionData.session.access_token);
            localStorage.setItem('user_id', sessionData.session.user.id);
            console.log('[Splash] 已从 Supabase 恢复 session');
          } else if (!savedToken) {
            // 没有 Supabase session 也没有 localStorage token，跳转到登录
            console.log('[Splash] 无 session，跳转登录页');
            navigate('/login', { replace: true });
            return;
          }
        } catch (e: any) {
          console.warn('[Splash] getSession 异常:', e.message);
          // 即使 Supabase 失败，如果有 localStorage token 仍可继续
          if (!savedToken) {
            console.log('[Splash] getSession 失败且无 localStorage token，跳转登录页');
            navigate('/login', { replace: true });
            return;
          }
        }

        // ========== 收藏迁移：初始化时从 Supabase 同步收藏列表到 localStorage ==========
        const userId = useAuthStore.getState().userInfo?.id;
        if (userId) {
          setStatus('正在同步收藏...');
          try {
            const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';
            const favRes = await fetch(`/sb-api/rest/v1/favorites?user_id=eq.${userId}&select=post_id`, {
              headers: { 'apikey': SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` }
            });
            if (favRes.ok) {
              const favData = await favRes.json();
              const favIds = Array.isArray(favData) ? favData.map((f: any) => f.post_id) : [];
              localStorage.setItem('of_favorites', JSON.stringify(favIds));
              console.log('[Splash] 已从 Supabase 同步收藏到 localStorage:', favIds.length, '条');
            }
          } catch (e) {
            console.warn('[Splash] 同步收藏失败:', e);
          }
        }

        // 步骤3: 跳转到主页（等待一小段时间显示启动画面）
        setStatus('正在进入...');
        console.log('[Splash] 跳转首页');

        // 使用 hash 路由跳转
        setTimeout(() => {
          window.location.hash = '#/';
          // 如果 token 存在，直接进入首页
          // 如果 token 不存在，首页会检测到并显示内容（或提示登录）
        }, 500);

      } catch (e: any) {
        console.error('[Splash] 初始化异常:', e);
        setError(e.message);
        setStatus('启动失败');

        // 出错时也跳转到首页，让用户自己处理
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 2000);
      }
    };

    initApp();
  }, [navigate]);

  // 处理密码验证
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isVerifying) return;
    
    setIsVerifying(true);
    setPasswordError(false);
    
    // 模拟验证延迟，体验更好
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (passwordInput === ACCESS_PASSWORD) {
      localStorage.setItem(ACCESS_KEY, '1');
      setShowPasswordScreen(false);
      // 重新触发初始化逻辑
      window.location.reload();
    } else {
      setPasswordError(true);
      setPasswordInput('');
    }
    setIsVerifying(false);
  };

  // 密码验证页面
  if (showPasswordScreen) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#0a0a0f',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* 背景装饰 */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(ellipse at 50% 0%, rgba(225, 29, 72, 0.15) 0%, transparent 60%)',
          pointerEvents: 'none'
        }} />
        
        {/* Logo 区域 */}
        <div style={{ textAlign: 'center', marginBottom: '48px', position: 'relative', zIndex: 1 }}>
          {/* OF Logo */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '20px',
            backgroundColor: THEME_COLOR,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            boxShadow: `0 8px 32px rgba(225, 29, 72, 0.4)`,
          }}>
            <span style={{
              fontSize: '36px',
              fontWeight: 'bold',
              color: 'white',
              fontFamily: 'Georgia, serif'
            }}>OF</span>
          </div>
          
          <h1 style={{
            fontSize: '28px',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '8px',
            letterSpacing: '2px'
          }}>
            OpenFaith
          </h1>
          <p style={{ 
            color: 'rgba(255,255,255,0.6)', 
            fontSize: '14px',
            letterSpacing: '1px'
          }}>
            信仰社区 · 探索灵性世界
          </p>
        </div>

        {/* Coming Soon 标签 */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          backgroundColor: 'rgba(225, 29, 72, 0.1)',
          borderRadius: '20px',
          marginBottom: '40px',
          border: '1px solid rgba(225, 29, 72, 0.2)'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: THEME_COLOR,
            animation: 'pulse 2s ease-in-out infinite'
          }} />
          <span style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: '13px',
            fontWeight: '500'
          }}>
            Coming Soon
          </span>
        </div>

        {/* 密码输入框 */}
        <form onSubmit={handlePasswordSubmit} style={{ width: '100%', maxWidth: '320px', position: 'relative', zIndex: 1 }}>
          <div style={{ marginBottom: '16px' }}>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                setPasswordError(false);
              }}
              placeholder="请输入访问密码"
              autoFocus
              style={{
                width: '100%',
                padding: '14px 16px',
                fontSize: '15px',
                borderRadius: '12px',
                border: passwordError 
                  ? '2px solid #EF4444' 
                  : '2px solid rgba(255,255,255,0.1)',
                backgroundColor: 'rgba(255,255,255,0.05)',
                color: 'white',
                outline: 'none',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = THEME_COLOR;
                e.target.style.backgroundColor = 'rgba(255,255,255,0.08)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = passwordError 
                  ? '#EF4444' 
                  : 'rgba(255,255,255,0.1)';
                e.target.style.backgroundColor = 'rgba(255,255,255,0.05)';
              }}
            />
            {passwordError && (
              <p style={{
                color: '#EF4444',
                fontSize: '13px',
                marginTop: '8px',
                textAlign: 'center'
              }}>
                密码错误，请重试
              </p>
            )}
          </div>
          
          <button
            type="submit"
            disabled={isVerifying || !passwordInput}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '15px',
              fontWeight: '600',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: THEME_COLOR,
              color: 'white',
              cursor: passwordInput && !isVerifying ? 'pointer' : 'not-allowed',
              opacity: passwordInput && !isVerifying ? 1 : 0.6,
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {isVerifying ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                验证中...
              </>
            ) : (
              '进入社区'
            )}
          </button>
        </form>

        {/* 底部提示 */}
        <p style={{
          position: 'absolute',
          bottom: '32px',
          color: 'rgba(255,255,255,0.3)',
          fontSize: '12px',
          textAlign: 'center'
        }}>
          OpenFaith 信仰社区 © 2026
        </p>

        {/* CSS 动画 */}
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}</style>
      </div>
    );
  }

  // 原始启动页面
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: THEME_COLOR,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
    >
      {/* Logo 区域 */}
      <div style={{ textAlign: 'center' }}>
        <h1
          style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '8px'
          }}
        >
          OpenFaith
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
          信仰社区
        </p>
      </div>

      {/* Loading 动画 */}
      <div
        style={{
          marginTop: '120px',
          width: '40px',
          height: '40px',
          border: '4px solid rgba(255,255,255,0.3)',
          borderTopColor: 'white',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}
      />

      {/* 状态文字 */}
      <p
        style={{
          marginTop: '24px',
          color: 'rgba(255,255,255,0.9)',
          fontSize: '14px'
        }}
      >
        {status}
      </p>

      {/* 错误信息 */}
      {error && (
        <p
          style={{
            marginTop: '16px',
            color: 'rgba(255,255,255,0.8)',
            fontSize: '12px',
            maxWidth: '300px',
            textAlign: 'center'
          }}
        >
          {error}
        </p>
      )}

      {/* CSS 动画 */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default Splash;
