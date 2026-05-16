import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminAuthProvider, useAdminAuth } from './contexts/AdminAuthContext';
import ErrorBoundary from '../components/ErrorBoundary';
import './styles/index.css';

// ============ 代码分割：页面组件 ============
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const PostManagement = lazy(() => import('./pages/PostManagement'));
const CommentManagement = lazy(() => import('./pages/CommentManagement'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const ReportManagement = lazy(() => import('./pages/ReportManagement'));
const AnnouncementManagement = lazy(() => import('./pages/AnnouncementManagement'));
const TagManagement = lazy(() => import('./pages/TagManagement'));
const BookManagement = lazy(() => import('./pages/BookManagement'));
const ReligionManagement = lazy(() => import('./pages/ReligionManagement'));
const ContentAudit = lazy(() => import('./pages/ContentAudit'));
const TicketManagement = lazy(() => import('./pages/TicketManagement'));
const RankingManagement = lazy(() => import('./pages/RankingManagement'));
const BannedWordManagement = lazy(() => import('./pages/BannedWordManagement'));

const NoteRequestManagement = lazy(() => import('./pages/NoteRequestManagement'));
const AdminLayout = lazy(() => import('./components/AdminLayout'));

// ============ Loading 组件 ============
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#E11D48] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="mt-4 text-gray-500">加载中...</p>
      </div>
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 0,
      refetchOnWindowFocus: false,
      staleTime: 60000,
      gcTime: 300000,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAdminAuth();
  const location = useLocation();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

function AdminRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AdminLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="posts" element={<PostManagement />} />
          <Route path="comments" element={<CommentManagement />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="reports" element={<ReportManagement />} />
          <Route path="announcements" element={<AnnouncementManagement />} />
          <Route path="tags" element={<TagManagement />} />
          <Route path="books" element={<BookManagement />} />
          <Route path="religions" element={<ReligionManagement />} />
          <Route path="audit" element={<ContentAudit />} />
          <Route path="tickets" element={<TicketManagement />} />
          <Route path="ranking" element={<RankingManagement />} />
          <Route path="banned-words" element={<BannedWordManagement />} />
          <Route path="note-requests" element={<NoteRequestManagement />} />
        </Routes>
      </AdminLayout>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AdminAuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/admin/login" element={<Login />} />
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute>
                    <AdminRoutes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <AdminRoutes />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Suspense>
        </AdminAuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
