import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User } from 'lucide-react';
import { useAuthStore } from '../../stores/auth';

function Login() {
  const navigate = useNavigate();
  const authStore = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // 独立检查管理员 token，不依赖 AuthContext
  useEffect(() => {
    const checkSuperAdmin = () => {
      const token = localStorage.getItem('openfaith_admin_token');
      if (token) {
        try {
          const tokenData = JSON.parse(atob(token));
          if (tokenData.admin_id?.startsWith('super-') || tokenData.admin_id === '00000001') {
            navigate('/', { replace: true });
            return;
          }
        } catch {
          localStorage.removeItem('openfaith_admin_token');
        }
      }
      setIsChecking(false);
    };
    
    // 延迟检查，确保组件已挂载
    const timer = setTimeout(checkSuperAdmin, 100);
    return () => clearTimeout(timer);
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // 使用统一的 auth store 登录
      const result = await authStore.adminLogin(username, password);

      if (!result.success) {
        setError(result.error || '用户名或密码错误');
        setIsLoading(false);
        return;
      }

      navigate('/', { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      setError('网络错误，请检查网络连接后重试');
      setIsLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#E11D48] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-[#E11D48] rounded-2xl flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">OpenFaith 管理后台</h1>
            <p className="text-gray-500 text-sm mt-1">请登录以继续</p>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                用户名
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E11D48] focus:border-transparent outline-none transition"
                  placeholder="请输入用户名"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E11D48] focus:border-transparent outline-none transition"
                  placeholder="请输入密码"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-[#E11D48] text-white rounded-lg font-medium hover:bg-[#C41E3A] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  登录中...
                </>
              ) : (
                '登录'
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-gray-400">
            默认账号: admin / admin123
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
