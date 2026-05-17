import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { ChevronDown } from 'lucide-react';
import { getTagNames } from '../services/tagService';

// 生成8位字母+数字混合的随机显示ID
const generateDisplayId = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
};

// Fallback 身份标签
const FALLBACK_FAITH_TAGS = [
  '基督教', '伊斯兰教', '犹太教', '佛教', '印度教', '道教', '锡克教',
  '巴哈伊教', '摩门教', '耶和华见证人', '琐罗亚斯德教', '诺斯替',
  '卡巴拉', '神道教', '耆那教', '德鲁兹教', '约鲁巴教', '伏都教',
  '雅兹迪', '曼达安', '玛雅/阿兹特克', '毛利宗教', '天理教', '天道教',
  '高台教', '宗教研究者', '经文爱好者', '寻求者'
];

function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [faithTag, setFaithTag] = useState('');
  const [faithTags, setFaithTags] = useState<string[]>(FALLBACK_FAITH_TAGS);
  const [isLoading, setIsLoading] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);

  // 加载身份标签
  useEffect(() => {
    const loadTags = async () => {
      try {
        const tags = await getTagNames('identity');
        if (tags && tags.length > 0) {
          setFaithTags(tags);
        }
      } catch (error) {
        console.error('Failed to load identity tags:', error);
        // 使用 fallback
      }
    };
    loadTags();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !nickname) {
      alert('请填写所有字段');
      return;
    }
    
    if (!faithTag) {
      alert('请选择身份标签');
      return;
    }
    
    if (password.length < 6) {
      alert('密码至少需要6位');
      return;
    }

    // 问题四：检查昵称是否已存在（大小写不敏感）
    setIsLoading(true);
    try {
      const checkNicknameRes = await fetch(
        `/sb-api/rest/v1/profiles?nickname=ilike.${encodeURIComponent(nickname)}&select=nickname`,
        {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE',
          }
        }
      );
      if (!checkNicknameRes.ok) {
        // 检查请求失败时，提示用户重试而不是继续注册
        alert('昵称检查失败，请稍后重试');
        setIsLoading(false);
        return;
      }
      const exists = await checkNicknameRes.json();
      if (exists && exists.length > 0) {
        alert('该昵称已被使用，请换一个');
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.error('[Register] Nickname check error:', err);
      // 检查失败时也阻止注册，防止重复昵称
      alert('昵称检查失败，请稍后重试');
      setIsLoading(false);
      return;
    }
    
    try {
      // 1. 注册用户 - username 改为自动生成并存入 user_metadata
      const displayId = generateDisplayId();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { 
          data: { nickname, faith_tag: faithTag, username: displayId },
          // 问题六：设置邮箱验证后的重定向URL
          emailRedirectTo: 'https://openfaithhub.com/#/login'
        }
      });
      
      if (error) {
        alert('注册失败：' + error.message);
        setIsLoading(false);
        return;
      }
      
      // 2. 如果注册成功且有用户ID，立即创建 profile
      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          user_id: data.user.id,
          username: displayId,
          nickname: nickname,
          faith_tag: faithTag,
          email: email,
          // 问题三：新用户注册赠送5热点
          hot_points: 5
        });
        
        if (profileError) {
          console.error('[Register] Profile creation error:', profileError);
          // profile 创建失败不影响注册流程
        }
        
        alert('注册成功！请查收邮箱确认邮件后登录（验证邮箱后才能使用完整功能）');
        navigate('/login');
      } else {
        // 邮件确认模式：用户需要去邮箱确认
        alert('注册成功！请查收邮箱确认邮件后登录（验证邮箱后才能使用完整功能）');
        navigate('/login');
      }
    } catch (err: any) {
      alert('注册失败：' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E11D48] flex flex-col items-center justify-center px-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">OpenFaith</h1>
      </div>

      <div className="w-full max-w-sm bg-white rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-[#E11D48] text-center mb-6">注册</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-[#1E293B] mb-1">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入邮箱..."
              className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:border-[#E11D48] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-[#1E293B] mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码（至少6位）..."
              className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:border-[#E11D48] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-[#1E293B] mb-1">昵称</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="请输入昵称..."
              className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:border-[#E11D48] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-[#1E293B] mb-1">
              身份标签 <span className="text-[#E11D48]">*</span>
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTagDropdown(!showTagDropdown)}
                className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:border-[#E11D48] focus:outline-none flex items-center justify-between bg-white"
              >
                <span className={faithTag ? 'text-[#1E293B]' : 'text-gray-400'}>
                  {faithTag || '请选择身份标签...'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              
              {showTagDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg z-50">
                  {faithTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => { setFaithTag(tag); setShowTagDropdown(false); }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 focus:bg-gray-50"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-[#E11D48] text-white font-medium rounded-xl mt-2 hover:bg-[#c41a3f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '注册中...' : '注册'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-[#64748B] mb-2">已有账号？</p>
          <Link to="/login" className="inline-block px-6 py-2 text-sm text-[#E11D48] border border-[#E11D48] rounded-full hover:bg-[#E11D48] hover:text-white transition-colors">
            立即登录
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Register;