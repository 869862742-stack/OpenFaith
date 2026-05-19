import React, { useState, useEffect } from 'react';
import { Crown, Check, X, ArrowLeft, Eye, Pin, Sparkles, Users, Star, Edit3, Headphones, Image, Palette, Zap, Gift, Trophy, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const PRIMARY_COLOR = '#2563EB';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';

// 权益对比数据
const comparisonData = [
  {
    label: '经验获取',
    labelEn: 'Experience',
    icon: Zap,
    normalValue: '×1 基础',
    normalValueEn: '×1 Basic',
    vipValue: '×2 加速',
    vipValueEn: '×2 Bonus',
  },
  {
    label: '每日登录热点',
    labelEn: 'Daily Hot Points',
    icon: Sparkles,
    normalValue: '+5',
    normalValueEn: '+5',
    vipValue: '+10 翻倍',
    vipValueEn: '+10 Double',
  },
  {
    label: '创建群聊',
    labelEn: 'Create Groups',
    icon: Users,
    normalValue: '需等级解锁',
    normalValueEn: 'Unlock by Level',
    vipValue: '最多10个',
    vipValueEn: 'Up to 10',
  },
  {
    label: '群聊标签',
    labelEn: 'Group Tags',
    icon: Star,
    normalValue: '仅系统预设',
    normalValueEn: 'Preset Only',
    vipValue: '自定义标签',
    vipValueEn: 'Custom Tags',
  },
  {
    label: '笔记曝光',
    labelEn: 'Note Exposure',
    icon: Eye,
    normalValue: '需等级解锁',
    normalValueEn: 'Unlock by Level',
    vipValue: '每月1次3倍',
    vipValueEn: '1×3x Monthly',
  },
  {
    label: '编辑资料',
    labelEn: 'Edit Profile',
    icon: Edit3,
    normalValue: '30天1次',
    normalValueEn: '1/30 days',
    vipValue: '无限次',
    vipValueEn: 'Unlimited',
  },
  {
    label: '专属标识',
    labelEn: 'Exclusive Badge',
    icon: Crown,
    normalValue: '无',
    normalValueEn: 'None',
    vipValue: '金色皇冠+边框',
    vipValueEn: 'Golden Crown',
  },
  {
    label: '客服通道',
    labelEn: 'Support',
    icon: Headphones,
    normalValue: '普通',
    normalValueEn: 'Standard',
    vipValue: '优先快1倍',
    vipValueEn: 'Priority Fast',
  },
  {
    label: '动态头像',
    labelEn: 'Animated Avatar',
    icon: Image,
    normalValue: '不支持',
    normalValueEn: 'Not Supported',
    vipValue: '支持GIF',
    vipValueEn: 'GIF Support',
  },
  {
    label: '自定义主题',
    labelEn: 'Custom Theme',
    icon: Palette,
    normalValue: '默认主题',
    normalValueEn: 'Default Theme',
    vipValue: '12种高级色',
    vipValueEn: '12 Premium Colors',
  },
  {
    label: '离线下载',
    labelEn: 'Offline Downloads',
    icon: Download,
    normalValue: '最多50篇',
    normalValueEn: 'Up to 50',
    vipValue: '最多500篇',
    vipValueEn: 'Up to 500',
  },
  {
    label: '置顶卡',
    labelEn: 'Sticky Card',
    icon: Pin,
    normalValue: '无',
    normalValueEn: 'None',
    vipValue: '每月1张(2h)',
    vipValueEn: '1/Month (2h)',
  },
];

interface ProfileData {
  is_vip: boolean;
  exposure_cards: number;
  sticky_cards: number;
  experience: number;
  level: number;
}

function VIP() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);

  const isZh = i18n.language === 'zh-CN' || !i18n.language;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('user_token');
        if (!token) {
          console.log('[VIP] No token found');
          setLoading(false);
          return;
        }

        const userInfo = localStorage.getItem('user_info');
        if (!userInfo) {
          setLoading(false);
          return;
        }

        const parsed = JSON.parse(userInfo);
        const userId = parsed.id || parsed.user_id;
        
        if (!userId) {
          setLoading(false);
          return;
        }

        const response = await fetch(
          `/sb-api/rest/v1/profiles?user_id=eq.${userId}&select=id,is_vip,exposure_cards,sticky_cards,experience,level`,
          {
            headers: {
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            setProfile({
              ...data[0],
              exposure_cards: data[0].exposure_cards ?? 0,
              sticky_cards: data[0].sticky_cards ?? 0,
            });
          }
        }
      } catch (err) {
        console.error('[VIP] fetchProfile error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const isVip = profile?.is_vip || false;

  const handlePurchase = async () => {
    setIsProcessing(true);
    try {
      const userInfo = localStorage.getItem('user_info');
      if (!userInfo) {
        alert(t('vip.pleaseLogin') || '请先登录');
        setIsProcessing(false);
        return;
      }

      const parsed = JSON.parse(userInfo);
      const userId = parsed.id || parsed.user_id;
      
      if (!userId) {
        alert(t('vip.pleaseLogin') || '请先登录');
        setIsProcessing(false);
        return;
      }

      const response = await fetch(
        `/sb-api/rest/v1/profiles?user_id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({
            is_vip: true,
            exposure_cards: (profile?.exposure_cards || 0) + 1,
            sticky_cards: (profile?.sticky_cards || 0) + 1,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setShowPaymentModal(false);
        setProfile(prev => prev ? { 
          ...prev, 
          is_vip: true,
          exposure_cards: (prev.exposure_cards || 0) + 1,
          sticky_cards: (prev.sticky_cards || 0) + 1,
        } : null);
        
        const expResponse = await fetch(
          `/sb-api/rest/v1/profiles?user_id=eq.${userId}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              experience: (profile?.experience || 0) + 500,
              level: Math.min((profile?.level || 1) + 1, 10),
            }),
          }
        );

        alert(t('vip.purchaseSuccess') + '\n\n🎁 获得奖励：\n• 1张曝光卡\n• 1张置顶卡\n• 500经验值');
        
        window.location.reload();
      } else {
        const errorData = await response.json();
        console.error('VIP purchase error:', errorData);
        alert(t('vip.purchaseFailed') + ': ' + (errorData.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('VIP purchase exception:', err);
      alert(t('vip.purchaseFailed') || '开通失败');
    }
    setIsProcessing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: `linear-gradient(to bottom, ${PRIMARY_COLOR}, ${PRIMARY_COLOR}dd)` }}>
        <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pb-24"
      style={{
        background: `linear-gradient(to bottom, ${PRIMARY_COLOR}, ${PRIMARY_COLOR}dd)`,
      }}
    >
      <div className="p-4">
        {/* Header */}
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-2 text-white/80 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">{t('common.back')}</span>
        </button>

        {/* Hero Section */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center relative">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {isVip ? (isZh ? 'VIP 会员' : 'VIP Member') : (isZh ? '解锁专属权益' : 'Unlock Exclusive Benefits')}
          </h1>
          <p className="text-white/80 text-sm">
            {isVip 
              ? (isZh ? '您已是终身会员' : 'You are a Lifetime Member')
              : (isZh ? '升级 VIP，畅享信仰之旅' : 'Upgrade to VIP for Exclusive Benefits')}
          </p>
          {isVip && (
            <div className="mt-3 inline-flex items-center gap-1 px-4 py-1.5 bg-white/20 rounded-full">
              <Crown className="w-4 h-4 text-yellow-300" />
              <span className="text-sm text-white font-medium">{isZh ? '终身会员' : 'Lifetime Member'}</span>
            </div>
          )}
        </div>

        {/* VIP Privilege Cards */}
        {isVip && (
          <div className="rounded-2xl p-4 mb-6 bg-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-5 h-5 text-yellow-300" />
              <span className="text-white font-medium">{isZh ? '我的 VIP 特权' : 'My VIP Privileges'}</span>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-white" />
                <span className="text-white font-bold text-lg">{profile?.exposure_cards || 0}</span>
                <span className="text-white/70 text-sm">{isZh ? '曝光卡' : 'Exposure Cards'}</span>
              </div>
              <div className="w-px h-6 bg-white/30" />
              <div className="flex items-center gap-2">
                <Pin className="w-5 h-5 text-white" />
                <span className="text-white font-bold text-lg">{profile?.sticky_cards || 0}</span>
                <span className="text-white/70 text-sm">{isZh ? '置顶卡' : 'Sticky Cards'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Comparison Table */}
        <div
          className="rounded-2xl overflow-hidden mb-6 theme-transition"
          style={{ backgroundColor: 'var(--card-bg)' }}
        >
          {/* Table Header */}
          <div 
            className="flex items-center"
            style={{ backgroundColor: `${PRIMARY_COLOR}15` }}
          >
            <div className="flex-1 py-3 px-3">
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                {isZh ? '权益对比' : 'Benefits Comparison'}
              </span>
            </div>
            <div className="w-24 py-3 text-center">
              <span 
                className="text-xs font-medium px-2 py-1 rounded"
                style={{ 
                  color: 'var(--text-secondary)',
                  backgroundColor: 'var(--bg-secondary)'
                }}
              >
                {isZh ? '普通用户' : 'Free'}
              </span>
            </div>
            <div 
              className="w-28 py-3 text-center"
              style={{ 
                background: `linear-gradient(135deg, ${PRIMARY_COLOR}20, ${PRIMARY_COLOR}10)`
              }}
            >
              <span 
                className="text-xs font-bold px-3 py-1 rounded"
                style={{ 
                  color: PRIMARY_COLOR,
                  backgroundColor: 'rgba(225, 29, 72, 0.15)'
                }}
              >
                <Crown className="w-3 h-3 inline mr-1" />
                {isZh ? 'VIP会员' : 'VIP'}
              </span>
            </div>
          </div>

          {/* Table Body */}
          {comparisonData.map((item, index) => {
            const IconComponent = item.icon;
            const isEven = index % 2 === 0;
            
            return (
              <div 
                key={index}
                className="flex items-center border-b last:border-b-0"
                style={{ 
                  borderColor: 'var(--border-color, #f0f0f0)',
                  backgroundColor: isEven ? 'transparent' : (isVip ? `${PRIMARY_COLOR}05` : 'var(--bg-secondary)'),
                }}
              >
                {/* Label */}
                <div className="flex-1 py-3 px-3">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ 
                        backgroundColor: `${PRIMARY_COLOR}15`,
                        color: PRIMARY_COLOR,
                      }}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-color)' }}>
                        {isZh ? item.label : item.labelEn}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Normal Value */}
                <div className="w-24 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <X className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {isZh ? item.normalValue : item.normalValueEn}
                    </span>
                  </div>
                </div>

                {/* VIP Value */}
                <div 
                  className="w-28 py-3 text-center"
                  style={{ 
                    background: `linear-gradient(135deg, ${PRIMARY_COLOR}08, transparent)`
                  }}
                >
                  <div className="flex items-center justify-center gap-1">
                    <Check className="w-4 h-4" style={{ color: PRIMARY_COLOR }} />
                    <span className="text-sm font-medium" style={{ color: PRIMARY_COLOR }}>
                      {isZh ? item.vipValue : item.vipValueEn}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Gift Section */}
        {!isVip && (
          <div
            className="rounded-2xl p-4 mb-6 theme-transition"
            style={{ backgroundColor: 'var(--card-bg)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Gift className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />
              <h3 className="font-bold text-sm" style={{ color: 'var(--text-color)' }}>
                {isZh ? '开通即享' : 'Opening Gift'}
              </h3>
            </div>
            <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-green-500" />
                <span>{isZh ? '1张曝光卡' : '1 Exposure Card'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-green-500" />
                <span>{isZh ? '1张置顶卡' : '1 Sticky Card'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-green-500" />
                <span>+500 {isZh ? '经验' : 'EXP'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom CTA Button */}
      {!isVip && (
        <div 
          className="fixed bottom-0 left-0 right-0 p-4 z-40"
          style={{ 
            background: 'linear-gradient(to top, var(--bg-color) 80%, transparent)',
          }}
        >
          <button
            onClick={() => setShowPaymentModal(true)}
            className="w-full py-4 rounded-2xl font-bold text-lg text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
            style={{ background: `linear-gradient(135deg, ${PRIMARY_COLOR}, #ff4d6d)` }}
          >
            <Crown className="w-5 h-5" />
            {isZh ? '开通 VIP 会员' : 'Upgrade to VIP'}
            <span className="ml-2 px-2 py-0.5 bg-white/20 rounded text-sm font-normal">
              ¥99
            </span>
          </button>
          <p className="text-center text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
            {isZh ? '一次性付费，永久享受' : 'One-time Payment, Lifetime Access'}
          </p>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50"
          onClick={() => (!isProcessing) && setShowPaymentModal(false)}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-sm theme-transition"
            style={{ backgroundColor: 'var(--card-bg)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                <Crown className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-color)' }}>
                {isZh ? '开通 VIP 会员' : 'Upgrade to VIP'}
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {isZh ? '解锁全部 11 项专属权益' : 'Unlock all 11 exclusive benefits'}
              </p>
            </div>

            <div
              className="rounded-xl p-4 mb-6"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {isZh ? 'VIP 会员（终身）' : 'VIP (Lifetime)'}
                </span>
                <span className="font-bold" style={{ color: PRIMARY_COLOR }}>¥99</span>
              </div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                🎁 {isZh ? '开通即送：1张曝光卡 + 1张置顶卡' : 'Gift: 1 Exposure Card + 1 Sticky Card'}
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handlePurchase}
                disabled={isProcessing}
                className="w-full py-3 rounded-xl font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: PRIMARY_COLOR }}
              >
                {isProcessing 
                  ? (isZh ? '处理中...' : 'Processing...')
                  : (isZh ? '确认开通' : 'Confirm')
                }
              </button>
              <button
                onClick={() => setShowPaymentModal(false)}
                disabled={isProcessing}
                className="w-full py-3 rounded-xl font-medium"
                style={{ 
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)'
                }}
              >
                {isZh ? '取消' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VIP;
