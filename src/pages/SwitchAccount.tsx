import React, { useState, useEffect } from 'react';
import { ArrowLeft, UserPlus, Check, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';

function SwitchAccount() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          try {
            const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
            setProfile(data);
          } catch (e) {
            console.error('Failed to fetch profile:', e);
          }
        }
      } catch (err) {
        console.error('[SwitchAccount] fetchProfile error:', err);
      }
    };
    fetchProfile();
  }, []);

  const currentAccount = {
    name: profile?.username || 'OpenFaith',
    email: profile?.email || '869862742@qq.com',
    avatar: profile?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 bg-white px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft className="w-5 h-5 text-[#1E293B]" />
        </button>
        <h1 className="text-lg font-bold text-[#1E293B]">切换账号</h1>
      </header>

      <div className="p-4">
        <p className="text-sm text-[#64748B] mb-3">当前及已关联账号</p>

        <div className="bg-[#FEF2F2] rounded-xl border-2 border-[#2563EB] p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img src={currentAccount.avatar} alt="" className="w-12 h-12 rounded-full border-2 border-[#2563EB]" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#2563EB] rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#1E293B]">{currentAccount.name}</h3>
                <span className="px-2 py-0.5 bg-[#2563EB]/10 text-[#2563EB] text-[10px] rounded">CURRENT</span>
              </div>
              <p className="text-xs text-[#94A3B8]">{currentAccount.email}</p>
            </div>
          </div>
        </div>

        <button onClick={() => navigate('/login')} className="w-full h-14 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center gap-2 text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors">
          <UserPlus className="w-5 h-5" />
          <span className="text-sm font-medium">添加新账号</span>
        </button>

        <div className="mt-6 bg-[#FEF2F2] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-[#2563EB]" />
            <h3 className="text-sm font-bold text-[#2563EB]">账号安全提示</h3>
          </div>
          <p className="text-xs text-[#64748B] leading-relaxed">
            切换账号功能方便您在多个身份间快速跳转。请确保所有关联账号均为本人使用，以保护您的灵性成长数据与个人隐私。
          </p>
        </div>
      </div>
    </div>
  );
}

export default SwitchAccount;
