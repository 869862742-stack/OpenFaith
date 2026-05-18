import React from 'react';
import { ArrowLeft, Shield, Check, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const covenantItems = [
  {
    id: 1,
    title: '平等与尊重',
    content: '每一个灵魂都值得被听见。我们尊重所有信仰传统、灵性探索及无神论立场。严禁任何形式的歧视、仇恨言论或宗教排他性攻击。'
  },
  {
    id: 2,
    title: '和平与理性',
    content: '分享您的见解而非强加您的观点。我们鼓励建设性的对话，反对任何形式的网络暴力、恶意抹黑或挑衅行为。'
  },
  {
    id: 3,
    title: '真实与纯净',
    content: '严禁传播邪教思想、极端主义信息、暴力违禁内容或商业欺诈。OpenFaith 是心灵成长的净土，拒绝任何噪音。'
  },
  {
    id: 4,
    title: '安全与边界',
    content: '尊重他人的数字足迹。严禁泄露他人真实身份信息，保持适当的社交距离，构建安全的连接。'
  },
  {
    id: 5,
    title: '共筑安心家园',
    content: '为守护这片净土，平台将根据违规情节的轻重，对违反公约的行为采取相应管理措施，包括但不限于内容删除、功能限制、暂停或终止账号使用。'
  },
];

function Covenant() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const primaryColor = '#E11D48';

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-[#1E293B]">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-[#1E293B]">
          {t('sidebar.covenant') || '信仰公约'}
        </h1>
      </header>

      <div className="p-4">
        <div
          className="rounded-2xl p-6 mb-6 relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}15 0%, ${primaryColor}08 100%)`,
            border: `1px solid ${primaryColor}20`,
          }}
        >
          <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
            <Sparkles className="w-full h-full" style={{ color: primaryColor }} />
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${primaryColor}20` }}
            >
              <Shield className="w-6 h-6" style={{ color: primaryColor }} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1E293B]">
                OpenFaith {t('sidebar.covenant') || '信仰公约'}
              </h2>
              <p className="text-xs text-[#64748B]">
                尊重 · 包容 · 和平
              </p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-[#64748B]">
            我们致力于创建一个尊重、包容、和平的全球信仰交流社区，让每一位探索者都能在这里找到心灵的归属。
          </p>
        </div>

        <div className="space-y-3">
          {covenantItems.map((item, index) => (
            <div
              key={item.id}
              className="rounded-xl p-4 bg-white border border-gray-100"
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <span className="text-sm font-bold" style={{ color: primaryColor }}>{item.id}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold mb-1 text-[#1E293B]">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#64748B]">
                    {item.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-50">
            <Check className="w-4 h-4" style={{ color: primaryColor }} />
            <span className="text-xs text-[#64748B]">
              共同维护社区环境
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Covenant;
