import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Bell, Settings, LogOut, Shield } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth', { replace: true });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'project_manager':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Shield className="h-8 w-8 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">Sahayata Secure Vault</h1>
        </div>

        <div className="flex items-center space-x-4">
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <Bell className="h-5 w-5" />
          </button>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">{user?.full_name}</div>
              <div className="flex items-center space-x-2">
                <div className="text-xs text-gray-500">{user?.organization}</div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user?.role || 'user')}`}>
                  {user?.role?.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-1">
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Settings className="h-5 w-5" />
              </button>
              <button 
                onClick={handleSignOut}
                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                title="Sign Out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};