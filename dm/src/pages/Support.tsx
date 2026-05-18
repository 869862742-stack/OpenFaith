import React, { useState, useRef } from 'react';
import { ArrowLeft, Clock, Plus, X, Image, FileText, Send, Crown, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Ticket {
  id: string;
  title: string;
  content: string;
  status: 'pending' | 'processing' | 'resolved';
  date: string;
  attachments: { type: 'image' | 'file'; name: string; url: string }[];
  isVip: boolean;
}

function Support() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  
  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          try {
            const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
            setProfile(data);
          } catch (e) {
            console.error('Failed to fetch profile:', e);
          }
        }
      } catch (err) {
        console.error('[Support] fetchUser error:', err);
      }
    };
    fetchUser();
  }, []);

  const isVip = profile?.is_vip || false;

  const [activeTab, setActiveTab] = useState('my');
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<{ type: 'image' | 'file'; name: string; url: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['tickets', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        content: t.content,
        status: t.status,
        date: new Date(t.created_at).toLocaleString('zh-CN'),
        attachments: t.attachments || [],
        isVip: t.is_vip || false,
      })) as Ticket[];
    },
    enabled: !!user && activeTab === 'my',
  });

  const createTicketMutation = useMutation({
    mutationFn: async (newTicket: Omit<Ticket, 'id' | 'date'>) => {
      if (!user) throw new Error('未登录');
      const { data, error } = await supabase
        .from('tickets')
        .insert({
          user_id: user.id,
          title: newTicket.title,
          content: newTicket.content,
          status: 'pending',
          attachments: newTicket.attachments,
          is_vip: newTicket.isVip,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', user?.id] });
      setTitle('');
      setContent('');
      setAttachments([]);
      setShowNewTicket(false);
      setActiveTab('my');

      if (isVip) {
        alert('工单提交成功！会员享有优先客服通道，我们会尽快处理您的问题');
      } else {
        alert('工单提交成功，我们会尽快处理');
      }
    },
    onError: (error) => {
      console.error('Failed to create ticket:', error);
      alert('提交失败，请重试');
    },
  });

  const canSubmit = title.trim().length > 0 && content.trim().length > 0;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAttachments(prev => [...prev, {
          type: file.type.startsWith('image/') ? 'image' : 'file',
          name: file.name,
          url: event.target?.result as string
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!canSubmit) return;

    createTicketMutation.mutate({
      title,
      content,
      status: 'pending',
      attachments,
      isVip: isVip,
    });
  };

  const getStatusText = (status: Ticket['status']) => {
    switch (status) {
      case 'pending': return '待处理';
      case 'processing': return '处理中';
      case 'resolved': return '已解决';
    }
  };

  const getStatusColor = (status: Ticket['status']) => {
    switch (status) {
      case 'pending': return 'text-[#F59E0B]';
      case 'processing': return 'text-[#3B82F6]';
      case 'resolved': return 'text-[#22C55E]';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E11D48]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 bg-white px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft className="w-5 h-5 text-[#1E293B]" />
        </button>
        <h1 className="text-lg font-bold text-[#1E293B]">客服与帮助</h1>
      </header>

      <div className="flex items-center justify-center gap-4 py-4 border-b border-gray-100">
        <button
          onClick={() => setActiveTab('my')}
          className={`px-6 py-2 rounded-full text-sm font-medium ${
            activeTab === 'my' ? 'bg-gray-100 text-[#1E293B]' : 'text-[#64748B]'
          }`}
        >
          我的工单
        </button>
        <button
          onClick={() => setActiveTab('new')}
          className={`px-6 py-2 rounded-full text-sm font-medium ${
            activeTab === 'new' ? 'bg-gray-100 text-[#1E293B]' : 'text-[#64748B]'
          }`}
        >
          新建工单
        </button>
      </div>

      <div className="p-4">
        {isVip && (
          <div className="bg-gradient-to-r from-[#FEF2F2] to-[#FFF1F2] rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#E11D48]" />
              <span className="text-sm font-medium text-[#E11D48]">会员优先客服</span>
              <span className="text-xs text-[#64748B]">您的工单将进入优先队列</span>
            </div>
          </div>
        )}

        {activeTab === 'my' && (
          <div>
            {!tickets || tickets.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-[#64748B] text-sm mb-1">暂无工单记录</p>
                <p className="text-[#94A3B8] text-xs">如果您在使用过程中遇到问题，请点击"新建工单"反馈</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className={`bg-white rounded-xl border p-4 ${
                      ticket.isVip ? 'border-[#E11D48]/30 bg-[#FEF2F2]/30' : 'border-gray-100'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-[#1E293B]">{ticket.title}</h3>
                        {ticket.isVip && (
                          <Crown className="w-3 h-3 text-[#E11D48]" />
                        )}
                      </div>
                      <span className={`text-xs ${getStatusColor(ticket.status)}`}>
                        {getStatusText(ticket.status)}
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B] line-clamp-2 mb-2">{ticket.content}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#94A3B8]">{ticket.date}</span>
                      {ticket.attachments.length > 0 && (
                        <span className="text-xs text-[#94A3B8]">
                          {ticket.attachments.length} 个附件
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'new' && !showNewTicket && (
          <div className="text-center py-12">
            <p className="text-[#64748B] text-sm mb-4">点击新建工单反馈您的问题</p>
            <button
              onClick={() => setShowNewTicket(true)}
              className="px-6 py-2 bg-[#E11D48] text-white rounded-full text-sm"
            >
              新建工单
            </button>
          </div>
        )}

        {activeTab === 'new' && showNewTicket && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[#1E293B] mb-2">问题标题</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="请简要描述您的问题"
                className="w-full h-11 px-4 rounded-xl border border-gray-200 text-sm focus:border-[#E11D48] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-[#1E293B] mb-2">问题详情</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="请详细描述您遇到的问题，以便我们更好地帮助您..."
                rows={5}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:border-[#E11D48] focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm text-[#1E293B] mb-2">附件（可选）</label>
              <div className="flex gap-2 flex-wrap mb-2">
                {attachments.map((file, index) => (
                  <div key={index} className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                    {file.type === 'image' ? (
                      <img src={file.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileText className="w-6 h-6 text-[#64748B]" />
                      </div>
                    )}
                    <button
                      onClick={() => removeAttachment(index)}
                      className="absolute top-0 right-0 w-5 h-5 bg-black/50 flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center"
                >
                  <Plus className="w-6 h-6 text-gray-400" />
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={!canSubmit || createTicketMutation.isPending}
              className={`w-full h-12 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${
                canSubmit && !createTicketMutation.isPending
                  ? 'bg-[#E11D48] text-white'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
              {createTicketMutation.isPending ? '提交中...' : '提交反馈'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Support;
