import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Folder, 
  Users, 
  FileText, 
  Activity, 
  Settings,
  Plus,
  Shield
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/projects', icon: Folder, label: 'Projects' },
    { path: '/documents', icon: FileText, label: 'My Documents' },
    { path: '/activity', icon: Activity, label: 'Activity Log' },
  ];

  const adminItems = [
    { path: '/users', icon: Users, label: 'User Management' },
    { path: '/admin', icon: Settings, label: 'Admin Settings' },
  ];

  return (
    <div className="bg-gray-900 text-white w-64 min-h-screen flex flex-col">
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-8">
          <Shield className="h-8 w-8 text-blue-400" />
          <div>
            <h2 className="text-lg font-bold">Sahayata</h2>
            <p className="text-xs text-gray-400">Secure Vault</p>
          </div>
        </div>

        <Link
          to="/projects/new"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors mb-6"
        >
          <Plus className="h-4 w-4" />
          <span>New Project</span>
        </Link>
      </div>

      <nav className="flex-1 px-4">
        <div className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive(item.path)
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        {(user?.role === 'admin' || user?.role === 'project_manager') && (
          <div className="mt-8">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-4">
              Administration
            </h3>
            <div className="space-y-1">
              {adminItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="text-xs text-gray-400">
          <p className="mb-1">Secure Document Management</p>
          <p>for Non-Profit Organizations</p>
        </div>
      </div>
    </div>
  );
};