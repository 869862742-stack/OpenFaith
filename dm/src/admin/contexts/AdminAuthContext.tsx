import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../stores/auth';

interface AdminAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  admin: any | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

// 检查用户是否有管理员权限（通过 profiles.role）
async function checkUserRole(userId: string): Promise<boolean> {
  try {
    const res = await fetch(`/sb-api/rest/v1/profiles?user_id=eq.${userId}&select=role`, {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE',
      }
    });
    if (res.ok) {
      const data = await res.json();
      return data?.[0]?.role === 'admin';
    }
    return false;
  } catch {
    return false;
  }
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const store = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdminRole, setIsAdminRole] = useState(false);

  useEffect(() => {
    // 设置为后台模式
    store.setAdminMode(true);
    
    // 检查是否是真正的管理员
    const checkAdminAccess = async () => {
      const authStore = useAuthStore.getState();
      const userId = authStore.userInfo?.id;
      const adminToken = localStorage.getItem('openfaith_admin_token');
      
      if (!userId && !adminToken) {
        setIsAdminRole(false);
        setIsLoading(false);
        return;
      }

      // 即使有 admin token，也必须验证 profiles.role = 'admin'
      let effectiveUserId = userId;
      if (!effectiveUserId && adminToken) {
        try {
          const tokenData = JSON.parse(atob(adminToken));
          effectiveUserId = tokenData.admin_id?.replace('super-', '') || null;
        } catch { /* ignore */ }
      }

      if (effectiveUserId) {
        const isAllowed = await checkUserRole(effectiveUserId);
        setIsAdminRole(isAllowed);
        if (!isAllowed) {
          // 清除非法的 admin token
          localStorage.removeItem('openfaith_admin_token');
          localStorage.removeItem('openfaith_admin_user');
        }
      } else {
        setIsAdminRole(false);
      }
      
      setIsLoading(false);
    };
    
    checkAdminAccess();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const result = await store.adminLogin(username, password);
    if (result.success) {
      const authStore = useAuthStore.getState();
      const userId = authStore.userInfo?.id;
      if (userId) {
        const isAllowed = await checkUserRole(userId);
        if (!isAllowed) {
          store.adminLogout();
          return { success: false, error: '无管理员权限' };
        }
        setIsAdminRole(true);
      }
    }
    return result;
  }, [store]);

  const logout = useCallback(async () => {
    store.adminLogout();
    setIsAdminRole(false);
  }, [store]);

  const value: AdminAuthContextType = {
    isAuthenticated: isAdminRole,
    isLoading,
    admin: isAdminRole ? store.userInfo : null,
    login,
    logout,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
