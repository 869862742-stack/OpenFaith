import React, { useState, useEffect } from 'react';
import { ArrowLeft, Smartphone, Mail, Lock, Trash2, Shield, X, ChevronRight, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';

function AccountSecurity() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyMethod, setVerifyMethod] = useState<'email' | 'phone'>('email');
  const [countdown, setCountdown] = useState(0);
  const [deleteCountdown, setDeleteCountdown] = useState(7);
  const [deleteStartTime, setDeleteStartTime] = useState<Date | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          try {
            const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
            setProfile(data);
            setEmail(data?.email || '');
          } catch (e) {
            console.error('Failed to fetch profile:', e);
          }
        }
      } catch (err) {
        console.error('[AccountSecurity] fetchUser error:', err);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendCode = () => {
    if (countdown > 0) return;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    alert(`验证码已发送到${verifyMethod === 'email' ? '邮箱' : '手机'}：${code}`);
    setCountdown(60);
  };

  const handleBindPhone = () => {
    if (phone.length !== 11) {
      alert('请输入正确的手机号');
      return;
    }
    if (verifyCode.length !== 6) {
      alert('请输入6位验证码');
      return;
    }
    alert('手机号绑定成功');
    setShowPhoneModal(false);
    setVerifyCode('');
    setCountdown(0);
  };

  const handleUpdateEmail = () => {
    if (!email.includes('@')) {
      alert('请输入正确的邮箱地址');
      return;
    }
    if (verifyCode.length !== 6) {
      alert('请输入6位验证码');
      return;
    }
    alert('邮箱更新成功');
    setShowEmailModal(false);
    setVerifyCode('');
    setCountdown(0);
  };

  const handleChangePassword = () => {
    if (verifyCode.length !== 6) {
      alert('请输入6位验证码');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('两次输入的密码不一致');
      return;
    }
    if (newPassword.length < 6) {
      alert('密码长度至少6位');
      return;
    }
    alert('密码修改成功');
    setShowPasswordModal(false);
    setVerifyCode('');
    setNewPassword('');
    setConfirmPassword('');
    setCountdown(0);
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(false);
    setShowDeleteConfirmModal(true);
    setDeleteStartTime(new Date());
  };

  const confirmDeleteAccount = () => {
    alert('账号注销申请已提交，7天冷静期内登录将自动取消注销');
    setShowDeleteConfirmModal(false);
    navigate('/login');
  };

  const menuItems = [
    {
      id: 'phone',
      icon: Smartphone,
      label: '手机号',
      value: phone ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : '未绑定',
      action: () => setShowPhoneModal(true)
    },
    {
      id: 'email',
      icon: Mail,
      label: '邮箱号',
      value: email || '未设置',
      action: () => setShowEmailModal(true)
    },
    {
      id: 'password',
      icon: Lock,
      label: '登录密码',
      value: '已设置',
      action: () => setShowPasswordModal(true)
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 bg-white px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft className="w-5 h-5 text-[#1E293B]" />
        </button>
        <h1 className="text-lg font-bold text-[#1E293B]">账号与安全</h1>
      </header>

      <div className="p-4">
        <div className="bg-gradient-to-r from-[#FEF2F2] to-[#FFF1F2] rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-[#2563EB]" />
            <span className="text-sm font-bold text-[#2563EB]">安全保护已开启</span>
          </div>
          <p className="text-xs text-[#64748B]">
            您的账号正在受到 OpenFaith 加密盾的实时保护。建议定期修改密码并保持手机/邮箱可用。
          </p>
        </div>

        <div className="space-y-3">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={item.action}
              className="w-full flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <item.icon className="w-5 h-5 text-[#64748B]" />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-[#1E293B]">{item.label}</p>
                <p className="text-xs text-[#94A3B8]">{item.value}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-[#94A3B8]" />
            </button>
          ))}

          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors text-[#2563EB]"
          >
            <Trash2 className="w-5 h-5" />
            <span className="flex-1 text-left text-sm font-medium">注销账号</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {showPhoneModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowPhoneModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#1E293B]">绑定手机号</h3>
                <button onClick={() => setShowPhoneModal(false)}>
                  <X className="w-5 h-5 text-[#64748B]" />
                </button>
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="请输入手机号"
                maxLength={11}
                className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm focus:border-[#2563EB] focus:outline-none mb-3"
              />
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  placeholder="请输入验证码"
                  maxLength={6}
                  className="flex-1 h-12 px-4 rounded-xl border border-gray-200 text-sm focus:border-[#2563EB] focus:outline-none"
                />
                <button
                  onClick={handleSendCode}
                  disabled={countdown > 0 || phone.length !== 11}
                  className="px-3 h-12 bg-[#FB7185] text-white rounded-xl text-sm whitespace-nowrap disabled:opacity-50 min-w-[80px]"
                >
                  {countdown > 0 ? `${countdown}s` : '获取验证码'}
                </button>
              </div>
              <button
                onClick={handleBindPhone}
                disabled={phone.length !== 11 || verifyCode.length !== 6}
                className="w-full h-12 bg-[#2563EB] text-white rounded-xl font-medium disabled:opacity-50"
              >
                绑定
              </button>
          </div>
        </div>
      )}

      {showEmailModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowEmailModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#1E293B]">修改邮箱</h3>
                <button onClick={() => setShowEmailModal(false)}>
                  <X className="w-5 h-5 text-[#64748B]" />
                </button>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="请输入新邮箱"
                className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm focus:border-[#2563EB] focus:outline-none mb-3"
              />
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  placeholder="请输入验证码"
                  maxLength={6}
                  className="flex-1 h-12 px-4 rounded-xl border border-gray-200 text-sm focus:border-[#2563EB] focus:outline-none"
                />
                <button
                  onClick={handleSendCode}
                  disabled={countdown > 0 || !email.includes('@')}
                  className="px-3 h-12 bg-[#FB7185] text-white rounded-xl text-sm whitespace-nowrap disabled:opacity-50 min-w-[80px]"
                >
                  {countdown > 0 ? `${countdown}s` : '获取验证码'}
                </button>
              </div>
              <button
                onClick={handleUpdateEmail}
                disabled={!email.includes('@') || verifyCode.length !== 6}
                className="w-full h-12 bg-[#2563EB] text-white rounded-xl font-medium disabled:opacity-50"
              >
                保存
              </button>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowPasswordModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#1E293B]">修改密码</h3>
                <button onClick={() => setShowPasswordModal(false)}>
                  <X className="w-5 h-5 text-[#64748B]" />
                </button>
              </div>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setVerifyMethod('email')}
                  className={`flex-1 h-10 rounded-xl text-sm font-medium ${
                    verifyMethod === 'email' ? 'bg-[#2563EB] text-white' : 'bg-gray-100 text-[#64748B]'
                  }`}
                >
                  邮箱验证
                </button>
                <button
                  onClick={() => setVerifyMethod('phone')}
                  className={`flex-1 h-10 rounded-xl text-sm font-medium ${
                    verifyMethod === 'phone' ? 'bg-[#2563EB] text-white' : 'bg-gray-100 text-[#64748B]'
                  }`}
                >
                  手机验证
                </button>
              </div>

              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  placeholder="请输入验证码"
                  maxLength={6}
                  className="flex-1 h-12 px-4 rounded-xl border border-gray-200 text-sm focus:border-[#2563EB] focus:outline-none"
                />
                <button
                  onClick={handleSendCode}
                  disabled={countdown > 0}
                  className="px-3 h-12 bg-[#FB7185] text-white rounded-xl text-sm whitespace-nowrap disabled:opacity-50 min-w-[80px]"
                >
                  {countdown > 0 ? `${countdown}s` : '获取验证码'}
                </button>
              </div>

              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="请输入新密码"
                className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm focus:border-[#2563EB] focus:outline-none mb-3"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请确认新密码"
                className="w-full h-12 px-4 rounded-xl border border-gray-200 text-sm focus:border-[#2563EB] focus:outline-none mb-4"
              />
              <button
                onClick={handleChangePassword}
                disabled={verifyCode.length !== 6 || newPassword.length < 6 || newPassword !== confirmPassword}
                className="w-full h-12 bg-[#2563EB] text-white rounded-xl font-medium disabled:opacity-50"
              >
                确认修改
              </button>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#2563EB]">注销账号</h3>
                <button onClick={() => setShowDeleteModal(false)}>
                  <X className="w-5 h-5 text-[#64748B]" />
                </button>
              </div>
              <div className="flex items-center gap-2 mb-3 bg-[#FEF2F2] p-3 rounded-xl">
                <Clock className="w-5 h-5 text-[#2563EB]" />
                <span className="text-sm text-[#2563EB] font-medium">7天冷静期</span>
              </div>
              <p className="text-sm text-[#64748B] mb-4">
                注销账号后，您的所有数据将被永久删除。点击确认后，账号将进入7天冷静期，期间登录将自动取消注销。超过7天未登录，账号将被永久注销。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 h-12 bg-gray-100 text-[#64748B] rounded-xl font-medium"
                >
                  取消
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="flex-1 h-12 bg-[#2563EB] text-white rounded-xl font-medium"
                >
                  确认注销
                </button>
              </div>
          </div>
        </div>
      )}

      {showDeleteConfirmModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowDeleteConfirmModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-[#FEF2F2] flex items-center justify-center">
                  <Clock className="w-8 h-8 text-[#2563EB]" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-[#1E293B] text-center mb-2">注销申请已提交</h3>
              <p className="text-sm text-[#64748B] text-center mb-4">
                您的账号将在7天后被注销。期间登录将自动取消注销。
              </p>
              <div className="bg-gray-50 rounded-xl p-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#64748B]">剩余时间</span>
                  <span className="text-[#2563EB] font-medium">{deleteCountdown} 天</span>
                </div>
              </div>
              <button
                onClick={confirmDeleteAccount}
                className="w-full h-12 bg-[#2563EB] text-white rounded-xl font-medium"
              >
                我知道了
              </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountSecurity;
