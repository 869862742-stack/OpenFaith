import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  Users,
  Flag,
  Bell,
  Tag,
  BookOpen,
  Globe,
  ShieldCheck,
  Headphones,
  Trophy,
  Ban,
  Menu,
  X,
  LogOut,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';

const menuItems = [
  { id: 'dashboard', label: '仪表盘', icon: LayoutDashboard, path: '/admin' },
  { id: 'posts', label: '笔记管理', icon: FileText, path: '/admin/posts' },
  { id: 'comments', label: '评论管理', icon: MessageSquare, path: '/admin/comments' },
  { id: 'users', label: '用户管理', icon: Users, path: '/admin/users' },
  { id: 'reports', label: '举报处理', icon: Flag, path: '/admin/reports' },
  { id: 'announcements', label: '系统公告', icon: Bell, path: '/admin/announcements' },
  { id: 'tags', label: '标签管理', icon: Tag, path: '/admin/tags' },
  { id: 'books', label: '藏书管理', icon: BookOpen, path: '/admin/books' },
  { id: 'religions', label: '百科管理', icon: Globe, path: '/admin/religions' },
  { id: 'audit', label: '内容审核', icon: ShieldCheck, path: '/admin/audit' },
  { id: 'tickets', label: '客服工单', icon: Headphones, path: '/admin/tickets' },
  { id: 'note-requests', label: '笔记发布申请', icon: FileText, path: '/admin/note-requests' },
  { id: 'ranking', label: '排行榜', icon: Trophy, path: '/admin/ranking' },
  { id: 'banned-words', label: '违规词库', icon: Ban, path: '/admin/banned-words' },
  { id: 'group-tags', label: '群聊标签审核', icon: Tag, path: '/admin/group-tags' },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, logout } = useAdminAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const currentPath = location.pathname;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-200 transition-all duration-300 ${
          isSidebarOpen ? 'w-64' : 'w-20'
        } hidden lg:block`}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="h-16 flex items-center px-4 border-b border-gray-200">
            <Link to="/" className="flex items-center">
              <div className="w-8 h-8 bg-[#E11D48] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">OF</span>
              </div>
              {isSidebarOpen && (
                <span className="ml-3 font-semibold text-gray-900">OpenFaith</span>
              )}
            </Link>
          </div>

          {/* Menu */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            {menuItems.map((item) => {
              // 仪表盘需要精确匹配，其他页面用 startsWith
              const isActive = item.id === 'dashboard'
                ? currentPath === item.path || currentPath === '/admin/'
                : currentPath === item.path || currentPath.startsWith(item.path + '/');
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`flex items-center px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                    isActive
                      ? 'bg-[#E11D48] text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {isSidebarOpen && (
                    <span className="ml-3 text-sm font-medium">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Info */}
          <div className="border-t border-gray-200 p-4">
            <div className={`flex items-center ${isSidebarOpen ? '' : 'justify-center'}`}>
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-gray-600 text-sm font-medium">
                  {admin?.username?.[0]?.toUpperCase() || 'A'}
                </span>
              </div>
              {isSidebarOpen && (
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {admin?.username || 'Admin'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {admin?.role === 'super_admin' ? '超级管理员' : '管理员'}
                  </p>
                </div>
              )}
            </div>
            {isSidebarOpen && (
              <button
                onClick={handleLogout}
                className="mt-3 w-full flex items-center justify-center px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                退出登录
              </button>
            )}
          </div>

          {/* Toggle Button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute -right-3 top-20 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-50"
          >
            <ChevronRight
              className={`w-3 h-3 text-gray-400 transition-transform ${
                isSidebarOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl">
            <div className="h-full flex flex-col">
              <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-[#E11D48] rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">OF</span>
                  </div>
                  <span className="ml-3 font-semibold text-gray-900">OpenFaith</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto py-4 px-3">
                {menuItems.map((item) => {
                  // 仪表盘需要精确匹配，其他页面用 startsWith
                  const isActive = item.id === 'dashboard'
                    ? currentPath === item.path || currentPath === '/admin/'
                    : currentPath === item.path || currentPath.startsWith(item.path + '/');
                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                        isActive
                          ? 'bg-[#E11D48] text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="ml-3 text-sm font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
              <div className="border-t border-gray-200 p-4">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  退出登录
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main
        className={`flex-1 transition-all duration-300 ${
          isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
        }`}
      >
        {/* Mobile Header */}
        <header className="lg:hidden h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sticky top-0 z-40">
          <Link to="/" className="flex items-center">
            <div className="w-8 h-8 bg-[#E11D48] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">OF</span>
            </div>
            <span className="ml-3 font-semibold text-gray-900">OpenFaith</span>
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
        </header>

        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={() => {
                // 先清除 admin 相关的 sessionStorage
                try {
                  sessionStorage.removeItem('isAdmin');
                  sessionStorage.removeItem('adminToken');
                } catch (e) {}
                // 直接使用 window.location 跳转到根路径
                window.location.href = window.location.origin + '/';
              }}
              className="inline-flex items-center text-sm text-gray-600 hover:text-[#E11D48] transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              返回前台
            </button>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

export default AdminLayout;
