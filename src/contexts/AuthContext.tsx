import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiLogin, apiRegister, apiMe, setToken } from '../lib/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any; res?: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any; res?: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const me = await apiMe();
        setUser(me || null);
      } catch (err) {
        console.warn('Failed to fetch /auth/me', err);
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const res = await apiLogin(email, password);
      if (res?.token) {
        setToken(res.token);
        setUser(res.user || null);
        return { error: null, res };
      }
      return { error: 'no_token', res };
    } catch (err) {
      console.error('signIn error', err);
      return { error: err, res: null };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const res = await apiRegister(email, password, fullName);
      if (res?.token) {
        setToken(res.token);
        setUser(res.user || null);
        return { error: null, res };
      }
      return { error: 'no_token', res };
    } catch (err) {
      console.error('signUp error', err);
      return { error: err, res: null };
    }
  };

  const signOut = async () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
