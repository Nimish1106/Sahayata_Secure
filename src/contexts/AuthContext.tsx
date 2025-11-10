import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiLogin, apiRegister, apiMe, setToken } from '../lib/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any; res?: any }>;
  signUp: (email: string, password: string, fullName?: string, organization?: string) => Promise<{ error: any; res?: any }>;
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
        if (me) {
          const mapped: User = {
            id: me.id,
            email: me.email,
            full_name: me.profile?.full_name || me.profile?.fullName || '',
            role: me.role || 'user',
            organization: me.organization || '',
            created_at: me.created_at || new Date().toISOString(),
            last_login: undefined,
            is_active: Boolean(me.is_active)
          };
          setUser(mapped);
        } else setUser(null);
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
        const u = res.user;
        const mapped: User = {
          id: u.id,
          email: u.email,
          full_name: u.profile?.full_name || u.profile?.fullName || '',
          role: u.role || 'user',
          organization: u.organization || '',
          created_at: u.created_at || new Date().toISOString(),
          last_login: undefined,
          is_active: Boolean(u.is_active)
        };
        setUser(mapped);
        return { error: null, res };
      }
      return { error: 'no_token', res };
    } catch (err) {
      console.error('signIn error', err);
      return { error: err, res: null };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string, organization?: string) => {
    try {
      const res = await apiRegister(email, password, fullName, organization);
      if (res?.token) {
        setToken(res.token);
        const u = res.user;
        const mapped: User = {
          id: u.id,
          email: u.email,
          full_name: u.profile?.full_name || u.profile?.fullName || fullName || '',
          role: u.role || 'user',
          organization: u.organization || u.profile?.organization || '',
          created_at: u.created_at || new Date().toISOString(),
          last_login: undefined,
          is_active: Boolean(u.is_active)
        };
        setUser(mapped);
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
