import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Outlet } from 'react-router-dom';
import { LoginForm } from './components/Auth/LoginForm';
import { RegisterForm } from './components/Auth/RegisterForm';
import { Header } from './components/Layout/Header';
import { Sidebar } from './components/Layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { NewProject } from './pages/NewProject';
import { ProjectDetail } from './pages/ProjectDetail';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);

  return isLogin ? (
    <LoginForm onToggleMode={() => setIsLogin(false)} />
  ) : (
    <RegisterForm onToggleMode={() => setIsLogin(true)} />
  );
};

const AppLayout: React.FC = () => {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication…</p>
          <div className="mt-4">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    // Not authenticated — redirect to /auth
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public auth route rendered without AppLayout */}
      <Route path="/auth" element={<AuthPage />} />

      {/* Protected routes rendered inside AppLayout via Outlet */}
      <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        <Route path="/" element={<Navigate to={user ? '/dashboard' : '/auth'} replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/new" element={<NewProject />} />
        <Route path="/projects/:projectId" element={<ProjectDetail />} />
        <Route path="/documents" element={<div className="p-6"><h1>Documents</h1></div>} />
        <Route path="/activity" element={<div className="p-6"><h1>Activity Log</h1></div>} />
        <Route path="/users" element={<div className="p-6"><h1>User Management</h1></div>} />
        <Route path="/admin" element={<div className="p-6"><h1>Admin Settings</h1></div>} />
      </Route>

      {/* Fallback to auth */}
      <Route path="*" element={<Navigate to="/auth" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </AuthProvider>
  );
}

export default App;